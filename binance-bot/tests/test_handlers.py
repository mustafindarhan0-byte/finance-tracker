import asyncio
import logging
from types import SimpleNamespace

import pytest
from telegram.error import Forbidden, InvalidToken
from telegram.ext import CommandHandler

from bot import handlers
from bot.__main__ import RedactTokenFilter, build_application
from bot.alerts_store import ABOVE, BELOW, AlertsStore
from bot.binance_client import BinanceUnavailableError, InvalidSymbolError, parse_ticker_24h
from bot.config import Settings
from bot.handlers import UsageError, check_alerts, parse_alert_args, parse_interval
from conftest import TICKER_BTC


def test_parse_alert_args():
    assert parse_alert_args(["btc", "above", "70000"]) == ("BTCUSDT", ABOVE, 70000.0)
    assert parse_alert_args(["ETH", "ниже", "2500,5"]) == ("ETHUSDT", BELOW, 2500.5)
    for bad in (["btc"], ["btc", "sideways", "1"], ["btc", "above", "abc"], ["btc", "below", "-1"]):
        with pytest.raises(UsageError):
            parse_alert_args(bad)


def test_parse_interval():
    assert parse_interval(["BTC"]) == "4h"
    assert parse_interval(["BTC", "1H"]) == "1h"
    assert parse_interval(["BTC", "1M"]) == "1M"
    with pytest.raises(UsageError):
        parse_interval(["BTC", "7h"])


def test_application_builds_with_all_commands():
    app = build_application(Settings(telegram_token="123456:TEST-token-not-real"))
    commands = {
        c for handlers in app.handlers.values() for h in handlers
        if isinstance(h, CommandHandler) for c in h.commands
    }
    assert {"start", "help", "price", "top", "analyze", "chart", "alert", "alerts", "unalert"} <= commands
    assert app.job_queue is not None


class FakeBot:
    def __init__(self, forbidden_chats=()):
        self.sent = []
        self.forbidden = set(forbidden_chats)

    async def send_message(self, chat_id, text, **kwargs):
        if chat_id in self.forbidden:
            raise Forbidden("bot was blocked by the user")
        self.sent.append((chat_id, text))


class FakeClient:
    def __init__(self, prices=None, error=None):
        self.prices, self.error = prices or {}, error

    async def all_prices(self):
        if self.error:
            raise self.error
        return self.prices


def make_context(store, client, bot):
    return SimpleNamespace(bot=bot, bot_data={"alerts": store, "binance": client})


def test_check_alerts_sends_and_removes():
    store = AlertsStore()
    hit = store.add(1, "BTCUSDT", ABOVE, 70000)
    keep = store.add(1, "ETHUSDT", BELOW, 2000)
    blocked = store.add(2, "BTCUSDT", ABOVE, 60000)
    bot = FakeBot(forbidden_chats={2})
    ctx = make_context(store, FakeClient({"BTCUSDT": 71000.0, "ETHUSDT": 2500.0}), bot)

    asyncio.run(check_alerts(ctx))

    assert [chat for chat, _ in bot.sent] == [1]
    assert f"#{hit.id}" in bot.sent[0][1]
    assert [a.id for a in store.all()] == [keep.id]  # сработавшее и заблокированное удалены
    assert blocked.id not in [a.id for a in store.all()]


def test_check_alerts_survives_binance_outage():
    store = AlertsStore()
    store.add(1, "BTCUSDT", ABOVE, 1)
    bot = FakeBot()
    asyncio.run(check_alerts(make_context(store, FakeClient(error=BinanceUnavailableError()), bot)))
    assert bot.sent == [] and len(store.all()) == 1


# ---------------------------------------------------------------- логи

def _record(msg, args=(), exc=None):
    exc_info = (type(exc), exc, exc.__traceback__) if exc else None
    return logging.LogRecord("telegram.ext", logging.ERROR, __file__, 1, msg, args, exc_info)


def test_redact_token_filter():
    token = "123456:SECRET-token"
    f = RedactTokenFilter(token)

    assert f.filter(_record("bad", exc=InvalidToken(f"The token `{token}` was rejected"))) is False

    rec = _record("GET https://api.telegram.org/bot%s/getMe", (token,))
    assert f.filter(rec) is True
    assert token not in rec.getMessage() and "***" in rec.getMessage()

    try:
        raise RuntimeError(f"url /bot{token}/send failed")
    except RuntimeError as exc:
        rec = _record("boom", exc=exc)
    assert f.filter(rec) is True
    text = logging.Formatter().format(rec)
    assert token not in text and "RuntimeError" in text

    plain = _record("hello")
    assert f.filter(plain) is True and plain.exc_text is None


# ---------------------------------------------------------------- команды

class FakeMessage:
    def __init__(self):
        self.texts, self.photos = [], []

    async def reply_text(self, text, **kwargs):
        self.texts.append(text)

    async def reply_photo(self, photo, caption=None, **kwargs):
        self.photos.append((photo, caption))


class FakeChat:
    id = 42

    async def send_action(self, action):
        pass


class MarketClient:
    """Подмена BinanceClient для команд: BTCUSDT существует, остальное — нет."""

    def __init__(self, candles):
        self.candles = candles

    def _check(self, symbol):
        if symbol != "BTCUSDT":
            raise InvalidSymbolError(symbol)

    async def ticker_24h(self, symbol):
        self._check(symbol)
        return parse_ticker_24h(TICKER_BTC)

    async def price(self, symbol):
        self._check(symbol)
        return 67123.45

    async def klines(self, symbol, interval, limit):
        self._check(symbol)
        return self.candles

    async def depth(self, symbol, limit):
        raise BinanceUnavailableError()  # стакан необязателен — анализ должен пройти и без него


def call(handler, args, store, client):
    msg = FakeMessage()
    update = SimpleNamespace(
        effective_message=msg, effective_chat=FakeChat(),
        effective_user=SimpleNamespace(first_name="Тест"),
    )
    context = SimpleNamespace(args=args, bot_data={
        "alerts": store, "binance": client, "settings": Settings(telegram_token="x"),
    })
    asyncio.run(handler(update, context))
    return msg


@pytest.fixture
def env(uptrend):
    return AlertsStore(), MarketClient(uptrend)


def test_price_command(env):
    msg = call(handlers.price, ["btc"], *env)
    assert "BTCUSDT" in msg.texts[0] and "+1.87%" in msg.texts[0]


def test_price_unknown_symbol_and_missing_arg(env):
    assert "не найдена" in call(handlers.price, ["nope"], *env).texts[0]
    assert "Укажите символ" in call(handlers.price, [], *env).texts[0]


def test_analyze_command_without_order_book(env):
    text = call(handlers.analyze_command, ["btc", "1h"], *env).texts[0]
    assert "BTCUSDT</b> · 1h" in text
    assert "Стакан" not in text
    assert "Не является финансовым советом" in text


def test_chart_command_sends_png(env):
    msg = call(handlers.chart, ["btc"], *env)
    photo, caption = msg.photos[0]
    assert photo.startswith(b"\x89PNG") and "BTCUSDT · 4h" in caption


def test_alert_lifecycle(env):
    store, _ = env
    text = call(handlers.alert, ["btc", "above", "70000"], *env).texts[0]
    assert "создано" in text and "уже выполнено" not in text
    text = call(handlers.alert, ["btc", "below", "70000"], *env).texts[0]
    assert "уже выполнено" in text
    assert "не найдена" in call(handlers.alert, ["nope", "above", "1"], *env).texts[0]
    assert len(store.all()) == 2

    listing = call(handlers.alerts_command, [], *env).texts[0]
    first = store.all()[0].id
    assert f"#{first}" in listing

    assert "удалено" in call(handlers.unalert, [str(first)], *env).texts[0]
    assert "не найдено" in call(handlers.unalert, [str(first)], *env).texts[0]
    assert "Удалено уведомлений: 1" in call(handlers.unalert, ["all"], *env).texts[0]
