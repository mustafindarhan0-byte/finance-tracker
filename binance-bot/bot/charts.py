"""PNG-график: свечи + SMA20/SMA50 + полосы Боллинджера + уровни, RSI и MACD снизу.

Используется объектный API matplotlib (Figure без pyplot), поэтому рендер
безопасно запускать в отдельном потоке через asyncio.to_thread.
"""

from __future__ import annotations

import io

import matplotlib

matplotlib.use("Agg")

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402
from matplotlib.figure import Figure  # noqa: E402

from .indicators import Levels, bollinger, macd, rsi, sma, support_resistance  # noqa: E402

# Палитра: светлая поверхность, приглушённые оси, цвета серий — по роли
SURFACE = "#fcfcfb"
TEXT = "#0b0b0b"
TEXT_MUTED = "#52514e"
GRID = "#e4e3df"
UP = "#1baf7a"
DOWN = "#e34948"
SMA20_COLOR = "#2a78d6"
SMA50_COLOR = "#eb6834"
BAND_COLOR = "#8a8984"
SUPPORT_COLOR = "#1baf7a"
RESIST_COLOR = "#e34948"
MACD_COLOR = "#2a78d6"
SIGNAL_COLOR = "#eb6834"

DEFAULT_VISIBLE = 120
_INTRADAY = {"1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "6h", "8h", "12h"}


def _style(ax) -> None:
    ax.set_facecolor(SURFACE)
    ax.grid(True, color=GRID, linewidth=0.6)
    ax.tick_params(colors=TEXT_MUTED, labelsize=8, length=0)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.yaxis.tick_right()


def render_chart(
    df: pd.DataFrame,
    symbol: str,
    interval: str,
    *,
    visible: int = DEFAULT_VISIBLE,
    levels: Levels | None = None,
) -> bytes:
    """Рисует график и возвращает PNG-байты. Индикаторы считаются по всей истории df."""
    close = df["close"].astype(float)
    sma20, sma50 = sma(close, 20), sma(close, 50)
    bb = bollinger(close)
    r = rsi(close)
    m = macd(close)
    if levels is None and len(df) >= 11:
        levels = support_resistance(df)

    view = slice(max(0, len(df) - visible), len(df))
    d = df.iloc[view]
    x = np.arange(len(d))
    o, h, lo, c = (d[k].to_numpy(dtype=float) for k in ("open", "high", "low", "close"))
    colors = np.where(c >= o, UP, DOWN)

    fig = Figure(figsize=(11, 7.5), dpi=110, facecolor=SURFACE)
    gs = fig.add_gridspec(3, 1, height_ratios=[3.2, 1, 1], hspace=0.08)
    ax_price = fig.add_subplot(gs[0])
    ax_rsi = fig.add_subplot(gs[1], sharex=ax_price)
    ax_macd = fig.add_subplot(gs[2], sharex=ax_price)
    for ax in (ax_price, ax_rsi, ax_macd):
        _style(ax)

    # --- цена
    ax_price.fill_between(
        x, bb["lower"].iloc[view], bb["upper"].iloc[view],
        color=BAND_COLOR, alpha=0.12, linewidth=0, label="Боллинджер (20, 2)",
    )
    ax_price.vlines(x, lo, h, colors=colors, linewidth=0.8)
    body = np.maximum(np.abs(c - o), (h.max() - lo.min()) * 0.0015)
    ax_price.bar(x, body, bottom=np.minimum(o, c), color=colors, width=0.65, linewidth=0)
    ax_price.plot(x, sma20.iloc[view], color=SMA20_COLOR, linewidth=1.6, label="SMA20")
    ax_price.plot(x, sma50.iloc[view], color=SMA50_COLOR, linewidth=1.6, label="SMA50")

    if levels is not None:
        lo_view, hi_view = lo.min(), h.max()
        pad = (hi_view - lo_view) * 0.15
        for lvl in levels.supports:
            if lo_view - pad <= lvl <= hi_view + pad:
                ax_price.axhline(lvl, color=SUPPORT_COLOR, linewidth=1, linestyle="--", alpha=0.8)
        for lvl in levels.resistances:
            if lo_view - pad <= lvl <= hi_view + pad:
                ax_price.axhline(lvl, color=RESIST_COLOR, linewidth=1, linestyle="--", alpha=0.8)

    last = c[-1]
    ax_price.annotate(
        f"{last:,.8g}".replace(",", " "),
        xy=(1.0, last), xycoords=("axes fraction", "data"),
        xytext=(4, 0), textcoords="offset points", va="center", fontsize=8,
        color="white", bbox={"boxstyle": "round,pad=0.25", "fc": colors[-1], "ec": "none"},
    )
    ax_price.set_title(
        f"{symbol} · {interval} · Binance", loc="left", fontsize=12, color=TEXT, fontweight="bold"
    )
    ax_price.legend(loc="upper left", fontsize=8, frameon=True, facecolor=SURFACE, edgecolor="none", framealpha=0.9, labelcolor=TEXT_MUTED, ncols=3)

    # --- RSI
    ax_rsi.plot(x, r.iloc[view], color=SMA20_COLOR, linewidth=1.4)
    ax_rsi.axhspan(30, 70, color=BAND_COLOR, alpha=0.08, linewidth=0)
    for level in (30, 70):
        ax_rsi.axhline(level, color=TEXT_MUTED, linewidth=0.7, linestyle=":")
    ax_rsi.set_ylim(0, 100)
    ax_rsi.set_yticks([30, 50, 70])
    ax_rsi.text(0.005, 0.88, "RSI(14)", transform=ax_rsi.transAxes, fontsize=8, color=TEXT_MUTED)

    # --- MACD
    hist = m["hist"].iloc[view].to_numpy(dtype=float)
    ax_macd.bar(x, np.nan_to_num(hist), color=np.where(hist >= 0, UP, DOWN), width=0.65, alpha=0.6)
    ax_macd.plot(x, m["macd"].iloc[view], color=MACD_COLOR, linewidth=1.3, label="MACD")
    ax_macd.plot(x, m["signal"].iloc[view], color=SIGNAL_COLOR, linewidth=1.3, label="Сигнал")
    ax_macd.axhline(0, color=TEXT_MUTED, linewidth=0.6)
    ax_macd.legend(loc="upper left", fontsize=8, frameon=True, facecolor=SURFACE, edgecolor="none", framealpha=0.9, labelcolor=TEXT_MUTED, ncols=2)

    # --- подписи времени
    fmt = "%d.%m %H:%M" if interval in _INTRADAY else "%d.%m.%y"
    ticks = np.linspace(0, len(d) - 1, num=min(6, len(d)), dtype=int)
    ax_macd.set_xticks(ticks)
    ax_macd.set_xticklabels([d.index[i].strftime(fmt) for i in ticks])
    for ax in (ax_price, ax_rsi):
        ax.tick_params(labelbottom=False)
    ax_price.set_xlim(-1, len(d))

    fig.text(0.01, 0.005, "Время UTC · не является финансовым советом", fontsize=7, color=TEXT_MUTED)

    buf = io.BytesIO()
    fig.savefig(buf, format="png", facecolor=SURFACE, bbox_inches="tight")
    return buf.getvalue()
