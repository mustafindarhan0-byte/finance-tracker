"""Форматирование чисел и ответов бота (HTML parse mode)."""

from __future__ import annotations

from html import escape

from .alerts_store import ABOVE, Alert
from .binance_client import OrderBook, Ticker24h
from .indicators import BEARISH, BULLISH, Analysis
from .market import split_symbol

NBSP = " "
DISCLAIMER = (
    "⚠️ <i>Не является финансовым советом. Индикаторы описывают прошлое движение цены "
    "и не гарантируют будущего. Решения о сделках вы принимаете сами.</i>"
)
TREND_LABELS = {
    BULLISH: "🟢 Бычий",
    BEARISH: "🔴 Медвежий",
}
NEUTRAL_LABEL = "⚪ Нейтральный"


def _group(text: str) -> str:
    return text.replace(",", NBSP)


def fmt_price(value: float | None) -> str:
    """Число знаков зависит от величины: 67 123.45 / 1.2345 / 0.00001234."""
    if value is None:
        return "—"
    size = abs(value)
    if size >= 100:
        decimals = 2
    elif size >= 1:
        decimals = 4
    elif size >= 0.01:
        decimals = 6
    else:
        decimals = 8
    return _group(f"{value:,.{decimals}f}")


def fmt_signed_price(value: float) -> str:
    return ("+" if value > 0 else "") + fmt_price(value)


def fmt_pct(value: float | None, decimals: int = 2) -> str:
    if value is None:
        return "—"
    return f"{value:+.{decimals}f}%"


def fmt_volume(value: float) -> str:
    for threshold, suffix in ((1e9, "B"), (1e6, "M"), (1e3, "K")):
        if abs(value) >= threshold:
            return f"{value / threshold:.2f}{suffix}"
    return f"{value:.2f}"


def change_emoji(pct: float) -> str:
    return "🟢" if pct > 0 else "🔴" if pct < 0 else "⚪"


def format_price(t: Ticker24h) -> str:
    base, quote = split_symbol(t.symbol)
    lines = [
        f"<b>{escape(t.symbol)}</b>",
        f"Цена: <b>{fmt_price(t.last_price)}</b> {escape(quote)}".rstrip(),
        f"Изменение 24ч: {change_emoji(t.price_change_percent)} "
        f"{fmt_signed_price(t.price_change)} ({fmt_pct(t.price_change_percent)})",
        f"Максимум 24ч: {fmt_price(t.high)}",
        f"Минимум 24ч: {fmt_price(t.low)}",
        f"Средневзвешенная 24ч: {fmt_price(t.weighted_avg_price)}",
        f"Объём 24ч: {fmt_volume(t.volume)} {escape(base)} · {fmt_volume(t.quote_volume)} {escape(quote)}".rstrip(),
    ]
    if t.bid and t.ask:
        lines.append(f"Bid / Ask: {fmt_price(t.bid)} / {fmt_price(t.ask)}")
    lines.append(f"Сделок за 24ч: {_group(f'{t.trades:,}')}")
    return "\n".join(lines)


def format_top(gainers: list[Ticker24h], losers: list[Ticker24h], min_volume: float) -> str:
    def rows(items: list[Ticker24h]) -> list[str]:
        if not items:
            return ["  нет пар"]
        return [
            f"{i}. <code>{escape(t.symbol)}</code> {fmt_pct(t.price_change_percent)} · "
            f"{fmt_price(t.last_price)} · об. {fmt_volume(t.quote_volume)}"
            for i, t in enumerate(items, 1)
        ]

    return "\n".join([
        f"<b>Топ USDT-пар за 24ч</b> (оборот ≥ {fmt_volume(min_volume)} USDT)",
        "",
        "🚀 <b>Растут</b>",
        *rows(gainers),
        "",
        "📉 <b>Падают</b>",
        *rows(losers),
    ])


def _vs(price: float, ma: float | None) -> str:
    if ma is None:
        return "—"
    arrow = "цена выше ↑" if price > ma else "цена ниже ↓"
    return f"{fmt_price(ma)} ({arrow})"


def _rsi_zone(value: float | None) -> str:
    if value is None:
        return "—"
    if value >= 70:
        zone = "перекупленность"
    elif value <= 30:
        zone = "перепроданность"
    elif value >= 50:
        zone = "перевес покупателей"
    else:
        zone = "перевес продавцов"
    return f"{value:.1f} — {zone}"


def format_analysis(symbol: str, interval: str, a: Analysis, book: OrderBook | None = None) -> str:
    lines = [
        f"📊 <b>{escape(symbol)}</b> · {escape(interval)} · {a.candles} свечей",
        f"Цена: <b>{fmt_price(a.price)}</b> (за период {fmt_pct(a.change_pct)})",
        "",
        "<b>Скользящие средние</b>",
        f"SMA20: {_vs(a.price, a.sma20)}",
        f"SMA50: {_vs(a.price, a.sma50)}",
        f"SMA200: {_vs(a.price, a.sma200)}",
        f"EMA12 / EMA26: {fmt_price(a.ema12)} / {fmt_price(a.ema26)}",
        "",
        "<b>Осцилляторы</b>",
        f"RSI(14): {_rsi_zone(a.rsi)}",
    ]
    if a.macd is not None and a.macd_signal is not None and a.macd_hist is not None:
        trend = ""
        if a.macd_hist_prev is not None:
            trend = " (растёт)" if a.macd_hist > a.macd_hist_prev else " (снижается)"
        lines.append(
            f"MACD(12,26,9): {fmt_price(a.macd)}, сигнал {fmt_price(a.macd_signal)}, "
            f"гистограмма {fmt_signed_price(a.macd_hist)}{trend}"
        )

    lines += [
        "",
        "<b>Полосы Боллинджера (20, 2σ)</b>",
        f"Верхняя / средняя / нижняя: {fmt_price(a.bb_upper)} / {fmt_price(a.bb_middle)} / "
        f"{fmt_price(a.bb_lower)}",
    ]
    if a.bb_percent_b is not None:
        lines.append(f"Положение цены (%B): {a.bb_percent_b * 100:.0f}%")

    res = ", ".join(fmt_price(v) for v in a.levels.resistances) or "—"
    sup = ", ".join(fmt_price(v) for v in a.levels.supports) or "—"
    lines += ["", "<b>Уровни</b>", f"Сопротивление: {res}", f"Поддержка: {sup}"]

    if book is not None and book.bid_share is not None:
        share = book.bid_share
        side = (
            "перевес покупателей" if share > 0.55
            else "перевес продавцов" if share < 0.45
            else "баланс"
        )
        spread = f", спред {book.spread_pct:.4f}%" if book.spread_pct is not None else ""
        lines += [
            "",
            "<b>Стакан (100 уровней)</b>",
            f"Покупки / продажи: {share * 100:.0f}% / {(1 - share) * 100:.0f}% — {side}{spread}",
        ]

    lines += ["", "<b>Сигналы</b>", *(f"• {escape(s)}" for s in a.signals)]
    label = TREND_LABELS.get(a.trend, NEUTRAL_LABEL)
    lines += ["", f"<b>Итог: {label}</b> (счёт {a.score:+.1f})", "", DISCLAIMER]
    return "\n".join(lines)


def direction_text(direction: str) -> str:
    return "выше" if direction == ABOVE else "ниже"


def fmt_rule_pct(value: float) -> str:
    """Процент из правила уведомления без лишних нулей: +10%, −5.5%."""
    text = f"{abs(value):.2f}".rstrip("0").rstrip(".")
    return ("+" if value > 0 else "−") + text + "%"


def base_change_pct(alert: Alert, price: float | None = None) -> float | None:
    """На сколько процентов `price` (по умолчанию цель) отличается от базовой цены."""
    if not alert.base_price:
        return None
    return ((price if price is not None else alert.price) / alert.base_price - 1) * 100


def format_alert(alert: Alert) -> str:
    sign = "≥" if alert.direction == ABOVE else "≤"
    text = f"#{alert.id} <code>{escape(alert.symbol)}</code> {sign} {fmt_price(alert.price)}"
    pct = base_change_pct(alert)
    if pct is not None:
        text += f" ({fmt_rule_pct(pct)} от {fmt_price(alert.base_price)})"
    return text


def format_alerts(alerts: list[Alert]) -> str:
    if not alerts:
        return ("У вас нет активных уведомлений. Создать: /alert BTC above 70000 "
                "или /track BTC 84000 10%")
    return "\n".join(
        ["<b>Ваши уведомления</b>", *(format_alert(a) for a in alerts), "", "Удалить: /unalert &lt;id&gt;"]
    )


def format_triggered(alert: Alert, price: float) -> str:
    pct = base_change_pct(alert, price)
    if pct is not None:
        verb = "вырос" if alert.direction == ABOVE else "упал"
        head = (
            f"🔔 <b>{escape(alert.symbol)}</b> {verb} на {fmt_pct(pct)} "
            f"от {fmt_price(alert.base_price)}: цена {fmt_price(price)}"
        )
    else:
        head = (
            f"🔔 <b>{escape(alert.symbol)}</b>: цена {fmt_price(price)} — "
            f"{direction_text(alert.direction)} {fmt_price(alert.price)}"
        )
    return f"{head}\nУведомление #{alert.id} сработало и удалено."
