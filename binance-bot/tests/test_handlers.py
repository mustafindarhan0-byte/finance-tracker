import asyncio
from types import SimpleNamespace

import pytest
from telegram.error import Forbidden
from telegram.ext import CommandHandler

from bot.__main__ import build_application
from bot.alerts_store import ABOVE, BELOW, AlertsStore
from bot.binance_client import BinanceUnavailableError
from bot.config import Settings
from bot.handlers import UsageError, check_alerts, parse_alert_args, parse_interval


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
