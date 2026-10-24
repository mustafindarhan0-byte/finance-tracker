"""Обработчики команд Telegram и фоновая проверка ценовых уведомлений."""

from __future__ import annotations

import asyncio
import functools
import logging
from dataclasses import dataclass
from html import escape
from typing import Awaitable, Callable

from telegram import BotCommand, LinkPreviewOptions, Update
from telegram.constants import ChatAction, ParseMode
from telegram.error import Forbidden, TelegramError
from telegram.ext import Application, CommandHandler, ContextTypes, MessageHandler, filters

from . import formatting as fmt
from .alerts_store import ABOVE, BELOW, AlertsStore, find_triggered, is_triggered
from .binance_client import INTERVALS, BinanceClient, BinanceError, OrderBook
from .charts import render_chart
from .indicators import MIN_CANDLES, analyze
from .market import normalize_symbol, select_top

log = logging.getLogger(__name__)

DEFAULT_INTERVAL = "4h"
ANALYZE_CANDLES = 300
TOP_DEFAULT, TOP_MAX = 10, 20
NO_PREVIEW = LinkPreviewOptions(is_disabled=True)

_DIRECTION_ALIASES = {
    "above": ABOVE, "выше": ABOVE, ">": ABOVE, ">=": ABOVE, "up": ABOVE,
    "below": BELOW, "ниже": BELOW, "<": BELOW, "<=": BELOW, "down": BELOW,
}

HELP_TEXT = (
    "<b>Команды</b>\n"
    "/price &lt;SYMBOL&gt; — цена, изменение за 24ч, объём, максимум/минимум\n"
    "/top [N] — топ растущих и падающих USDT-пар за 24ч\n"
    "/analyze &lt;SYMBOL&gt; [interval] — технический анализ (SMA/EMA, RSI, MACD, "
    "Боллинджер, уровни, итог тренда)\n"
    "/chart &lt;SYMBOL&gt; [interval] — график цены с индикаторами\n"
    "/alert &lt;SYMBOL&gt; &lt;above|below&gt; &lt;price&gt; — уведомить о достижении цены\n"
    "/alert &lt;SYMBOL&gt; &lt;+N%|-N%&gt; [цена] — уведомить о росте/падении на N%\n"
    "/track &lt;SYMBOL&gt; [цена покупки] [рост%] [падение%] — следить за покупкой: "
    "уведомить и о росте, и о падении (по умолчанию ±10%)\n"
    "/alerts — список уведомлений\n"
    "/unalert &lt;id|all&gt; — удалить уведомление\n\n"
    "<b>Символ</b>: BTC, btcusdt, ETH/BTC — без котировки подставляется USDT.\n"
    f"<b>Интервалы</b>: {', '.join(INTERVALS)} (по умолчанию {DEFAULT_INTERVAL}).\n\n"
    "<b>Примеры</b>\n"
    "<code>/price BTC</code>\n"
    "<code>/analyze ETH 1d</code>\n"
    "<code>/chart SOLUSDT 1h</code>\n"
    "<code>/alert BTC above 75000</code>\n"
    "<code>/alert BTC +10%</code>\n"
    "<code>/track BTC 84000 10%</code>\n\n"
    "Бот использует только публичные данные Binance и ничего не покупает и не продаёт. "
    "Аналитика не является финансовым советом."
)

BOT_COMMANDS = [
    BotCommand("price", "Цена и статистика за 24ч"),
    BotCommand("top", "Топ растущих и падающих USDT-пар"),
    BotCommand("analyze", "Технический анализ пары"),
    BotCommand("chart", "График с индикаторами"),
    BotCommand("alert", "Создать ценовое уведомление"),
    BotCommand("track", "Следить за покупкой: рост/падение на N%"),
    BotCommand("alerts", "Мои уведомления"),
    BotCommand("unalert", "Удалить уведомление"),
    BotCommand("help", "Справка"),
]


class UsageError(Exception):
    """Неверные аргументы команды — текст показывается пользователю."""


Handler = Callable[[Update, ContextTypes.DEFAULT_TYPE], Awaitable[None]]


async def _reply(update: Update, text: str) -> None:
    if update.effective_message:
        await update.effective_message.reply_text(
            text, parse_mode=ParseMode.HTML, link_preview_options=NO_PREVIEW
        )


def command(func: Handler) -> Handler:
    """Превращает ожидаемые ошибки в понятные ответы пользователю."""

    @functools.wraps(func)
    async def wrapper(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
        try:
            await func(update, context)
        except UsageError as exc:
            await _reply(update, f"ℹ️ {exc}")
        except BinanceError as exc:
            await _reply(update, f"⚠️ {escape(str(exc))}")

    return wrapper


def _client(context: ContextTypes.DEFAULT_TYPE) -> BinanceClient:
    return context.bot_data["binance"]


def _store(context: ContextTypes.DEFAULT_TYPE) -> AlertsStore:
    return context.bot_data["alerts"]


def parse_symbol(args: list[str], usage: str) -> str:
    if not args:
        raise UsageError(f"Укажите символ. Пример: <code>{usage}</code>")
    try:
        return normalize_symbol(args[0])
    except ValueError:
        raise UsageError(
            f"Некорректный символ «{escape(args[0])}». Пример: <code>{usage}</code>"
        ) from None


def parse_interval(args: list[str], index: int = 1) -> str:
    if len(args) <= index:
        return DEFAULT_INTERVAL
    raw = args[index].strip()
    # «1M» (месяц) регистрозависим, остальное приводим к нижнему регистру
    interval = raw if raw == "1M" else raw.lower()
    if interval not in INTERVALS:
        raise UsageError(
            f"Неизвестный интервал «{escape(raw)}». Доступны: {', '.join(INTERVALS)}"
        )
    return interval


def _parse_number(raw: str, what: str = "Цена") -> float:
    try:
        value = float(raw.replace(",", ".").replace("_", ""))
    except ValueError:
        raise UsageError(f"{what} «{escape(raw)}» не похожа на число.") from None
    if not 0 < value < float("inf"):
        raise UsageError(f"{what} должна быть положительным числом.")
    return value


def _parse_percent(raw: str) -> float | None:
    """'+10%' -> 10.0, '-5,5%' -> -5.5; без знака % возвращает None."""
    if not raw.endswith("%"):
        return None
    try:
        return float(raw[:-1].replace(",", "."))
    except ValueError:
        raise UsageError(f"Процент «{escape(raw)}» не похож на число.") from None


@dataclass(frozen=True)
class AlertRequest:
    """Разобранная /alert: либо абсолютная цена, либо процент от базовой цены."""

    symbol: str
    direction: str
    price: float | None = None
    percent: float | None = None  # со знаком: +10 — рост, −10 — падение
    base: float | None = None  # цена покупки; None — текущая цена

    def target(self, current: float) -> tuple[float, float | None]:
        """(целевая цена, базовая цена) — для процентной цели база = цена покупки или текущая."""
        if self.percent is None:
            return self.price, None
        base = self.base if self.base is not None else current
        return base * (1 + self.percent / 100), base


ALERT_USAGE = (
    "Форматы:\n"
    "<code>/alert BTC above 75000</code> — цена выше 75000\n"
    "<code>/alert BTC below 60000</code> — цена ниже 60000\n"
    "<code>/alert BTC +10%</code> — рост на 10% от текущей цены\n"
    "<code>/alert BTC -10% 84000</code> — падение на 10% от цены 84000"
)


def parse_alert_args(args: list[str]) -> AlertRequest:
    if len(args) not in (2, 3):
        raise UsageError(ALERT_USAGE)
    symbol = parse_symbol(args, "/alert BTC above 75000")

    percent = _parse_percent(args[1])
    if percent is not None:
        if args[1][0] not in "+-":
            raise UsageError("Укажите знак: <code>+10%</code> — рост, <code>-10%</code> — падение.")
        if percent == 0 or percent <= -100 or percent > 10_000:
            raise UsageError("Процент должен быть от −99.99% до +10000% и не равен нулю.")
        base = _parse_number(args[2], "Цена покупки") if len(args) == 3 else None
        return AlertRequest(symbol, ABOVE if percent > 0 else BELOW, percent=percent, base=base)

    if len(args) != 3:
        raise UsageError(ALERT_USAGE)
    direction = _DIRECTION_ALIASES.get(args[1].lower())
    if direction is None:
        raise UsageError(
            "Направление должно быть <code>above</code> (выше) или <code>below</code> (ниже).\n\n"
            + ALERT_USAGE
        )
    return AlertRequest(symbol, direction, price=_parse_number(args[2]))


TRACK_DEFAULT_PERCENT = 10.0


def parse_track_args(args: list[str]) -> tuple[str, float | None, float, float]:
    """/track SYMBOL [цена_покупки] [рост%] [падение%] -> (symbol, entry, up, down)."""
    usage = "/track BTC 84000 10%"
    if not 1 <= len(args) <= 4:
        raise UsageError(
            "Формат: <code>/track &lt;SYMBOL&gt; [цена покупки] [рост%] [падение%]</code>\n"
            f"Пример: <code>{usage}</code>"
        )
    symbol = parse_symbol(args, usage)
    entry: float | None = None
    percents: list[float] = []
    for raw in args[1:]:
        percent = _parse_percent(raw)
        if percent is None:
            if entry is not None or percents:
                raise UsageError(f"Сначала цена покупки, потом проценты. Пример: <code>{usage} 5%</code>")
            entry = _parse_number(raw, "Цена покупки")
        else:
            percents.append(abs(percent))
    if len(percents) > 2:
        raise UsageError("Можно указать максимум два процента: рост и падение.")

    up = percents[0] if percents else TRACK_DEFAULT_PERCENT
    down = percents[1] if len(percents) > 1 else up
    if not 0 < up <= 10_000:
        raise UsageError("Процент роста должен быть больше 0 и не больше 10000%.")
    if not 0 < down < 100:
        raise UsageError("Процент падения должен быть больше 0 и меньше 100%.")
    return symbol, entry, up, down


# ---------------------------------------------------------------- команды

@command
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    name = escape(update.effective_user.first_name) if update.effective_user else ""
    await _reply(
        update,
        f"Привет{', ' + name if name else ''}! 👋\n"
        "Я анализирую рынок Binance: цены, топ движений, технические индикаторы, "
        "графики и ценовые уведомления.\n\n" + HELP_TEXT,
    )


@command
async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _reply(update, HELP_TEXT)


@command
async def price(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    symbol = parse_symbol(context.args, "/price BTC")
    ticker = await _client(context).ticker_24h(symbol)
    await _reply(update, fmt.format_price(ticker))


@command
async def top(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    limit = TOP_DEFAULT
    if context.args:
        try:
            limit = int(context.args[0])
        except ValueError:
            raise UsageError("Пример: <code>/top 10</code>") from None
        if not 1 <= limit <= TOP_MAX:
            raise UsageError(f"N должно быть от 1 до {TOP_MAX}.")
    min_volume = context.bot_data["settings"].top_min_quote_volume
    tickers = await _client(context).all_tickers_24h()
    gainers, losers = select_top(tickers, min_quote_volume=min_volume, limit=limit)
    await _reply(update, fmt.format_top(gainers, losers, min_volume))


async def _load_candles(context: ContextTypes.DEFAULT_TYPE, symbol: str, interval: str):
    df = await _client(context).klines(symbol, interval, ANALYZE_CANDLES)
    if len(df) < MIN_CANDLES:
        raise UsageError(
            f"По {symbol} на интервале {interval} только {len(df)} свечей — "
            f"нужно минимум {MIN_CANDLES}. Попробуйте интервал поменьше."
        )
    return df


@command
async def analyze_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    symbol = parse_symbol(context.args, "/analyze BTC 4h")
    interval = parse_interval(context.args)
    await update.effective_chat.send_action(ChatAction.TYPING)

    df = await _load_candles(context, symbol, interval)
    book: OrderBook | None
    try:
        book = await _client(context).depth(symbol, 100)
    except BinanceError as exc:  # стакан — дополнительная информация, без него тоже ок
        log.info("Стакан %s недоступен: %s", symbol, exc)
        book = None

    analysis = await asyncio.to_thread(analyze, df)
    await _reply(update, fmt.format_analysis(symbol, interval, analysis, book))


@command
async def chart(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    symbol = parse_symbol(context.args, "/chart BTC 4h")
    interval = parse_interval(context.args)
    await update.effective_chat.send_action(ChatAction.UPLOAD_PHOTO)

    df = await _load_candles(context, symbol, interval)
    png = await asyncio.to_thread(render_chart, df, symbol, interval)
    last = float(df["close"].iloc[-1])
    await update.effective_message.reply_photo(
        photo=png,
        caption=f"{symbol} · {interval} · последняя цена {fmt.fmt_price(last)}\n"
                "Свечи, SMA20/50, Боллинджер, уровни, RSI и MACD. Не является финансовым советом.",
    )


def _limit_error() -> UsageError:
    return UsageError(f"Достигнут лимит {AlertsStore.MAX_PER_CHAT} уведомлений. Удалите лишние: /alerts")


@command
async def alert(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    req = parse_alert_args(context.args)
    current = await _client(context).price(req.symbol)  # заодно проверяет, что пара существует
    target, base = req.target(current)
    try:
        new = _store(context).add(update.effective_chat.id, req.symbol, req.direction, target, base)
    except OverflowError:
        raise _limit_error() from None

    text = f"✅ Уведомление создано: {fmt.format_alert(new)}\nСейчас: {fmt.fmt_price(current)}"
    if is_triggered(new, current):
        text += "\nУсловие уже выполнено — уведомление придёт при ближайшей проверке."
    await _reply(update, text)


@command
async def track(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    symbol, entry, up, down = parse_track_args(context.args)
    current = await _client(context).price(symbol)
    base = entry if entry is not None else current
    store, chat_id = _store(context), update.effective_chat.id
    if store.free_slots(chat_id) < 2:
        raise _limit_error()

    rise = store.add(chat_id, symbol, ABOVE, base * (1 + up / 100), base)
    fall = store.add(chat_id, symbol, BELOW, base * (1 - down / 100), base)
    lines = [
        f"📌 Слежу за <b>{escape(symbol)}</b> от цены {fmt.fmt_price(base)}"
        + (" (текущая)" if entry is None else ""),
        f"🟢 #{rise.id} рост на {fmt.fmt_rule_pct(up)} → {fmt.fmt_price(rise.price)}",
        f"🔴 #{fall.id} падение на {fmt.fmt_rule_pct(-down)} → {fmt.fmt_price(fall.price)}",
        f"Сейчас: {fmt.fmt_price(current)} ({fmt.fmt_pct((current / base - 1) * 100)} от базы)",
    ]
    if is_triggered(rise, current) or is_triggered(fall, current):
        lines.append("Одно из условий уже выполнено — уведомление придёт при ближайшей проверке.")
    lines.append("Каждое уведомление сработает один раз. Отменить: /unalert &lt;id&gt;")
    await _reply(update, "\n".join(lines))


@command
async def alerts_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _reply(update, fmt.format_alerts(_store(context).list_for_chat(update.effective_chat.id)))


@command
async def unalert(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not context.args:
        raise UsageError("Укажите номер: <code>/unalert 3</code> или <code>/unalert all</code>")
    chat_id = update.effective_chat.id
    arg = context.args[0].lstrip("#").lower()
    if arg in ("all", "все"):
        removed = _store(context).remove_for_chat(chat_id)
        await _reply(update, f"🗑 Удалено уведомлений: {removed}")
        return
    try:
        alert_id = int(arg)
    except ValueError:
        raise UsageError("Номер уведомления — целое число, см. /alerts") from None
    if _store(context).remove(chat_id, alert_id):
        await _reply(update, f"🗑 Уведомление #{alert_id} удалено.")
    else:
        await _reply(update, f"Уведомление #{alert_id} не найдено. Список: /alerts")


async def unknown(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await _reply(update, "Не знаю такой команды. Список команд: /help")


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE) -> None:
    log.error("Необработанная ошибка", exc_info=context.error)
    if isinstance(update, Update):
        try:
            await _reply(update, "😵 Что-то пошло не так. Попробуйте ещё раз чуть позже.")
        except TelegramError:
            pass


# ---------------------------------------------------------------- уведомления

async def check_alerts(context: ContextTypes.DEFAULT_TYPE) -> None:
    """Фоновая задача JobQueue: одна выгрузка всех цен на все уведомления."""
    store = _store(context)
    alerts = store.all()
    if not alerts:
        return
    try:
        prices = await _client(context).all_prices()
    except BinanceError as exc:
        log.warning("Проверка уведомлений пропущена: %s", exc)
        return

    for hit, current in find_triggered(alerts, prices):
        try:
            await context.bot.send_message(
                hit.chat_id, fmt.format_triggered(hit, current), parse_mode=ParseMode.HTML
            )
        except Forbidden:
            # пользователь заблокировал бота — его уведомления больше некому слать
            store.remove_for_chat(hit.chat_id)
            continue
        except TelegramError as exc:
            log.warning("Не удалось отправить уведомление #%s: %s", hit.id, exc)
            continue
        store.remove(hit.chat_id, hit.id)


def register_handlers(app: Application) -> None:
    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("price", price))
    app.add_handler(CommandHandler("top", top))
    app.add_handler(CommandHandler("analyze", analyze_command))
    app.add_handler(CommandHandler("chart", chart))
    app.add_handler(CommandHandler("alert", alert))
    app.add_handler(CommandHandler("track", track))
    app.add_handler(CommandHandler("alerts", alerts_command))
    app.add_handler(CommandHandler("unalert", unalert))
    app.add_handler(MessageHandler(filters.COMMAND, unknown))
    app.add_error_handler(on_error)
