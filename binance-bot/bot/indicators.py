"""Технические индикаторы, посчитанные вручную на pandas/numpy.

Формулы — классические:
* SMA — простое скользящее среднее;
* EMA — экспоненциальное, alpha = 2/(n+1), стартует с SMA первых n значений;
* RSI — по Уайлдеру (сглаживание 1/n, старт со среднего первых n изменений);
* MACD — EMA12 − EMA26, сигнальная — EMA9 от MACD;
* Боллинджер — SMA20 ± 2σ (σ генеральной совокупности, ddof=0).
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

MIN_CANDLES = 50

BULLISH = "bullish"
BEARISH = "bearish"
NEUTRAL = "neutral"


def sma(series: pd.Series, period: int) -> pd.Series:
    if period < 1:
        raise ValueError("period должен быть >= 1")
    return series.rolling(window=period, min_periods=period).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    """EMA с затравкой SMA. Ведущие NaN пропускаются (нужно для сигнальной MACD)."""
    if period < 1:
        raise ValueError("period должен быть >= 1")
    values = series.to_numpy(dtype=float)
    out = np.full(len(values), np.nan)
    valid = np.flatnonzero(~np.isnan(values))
    if len(valid) == 0 or len(values) - valid[0] < period:
        return pd.Series(out, index=series.index)

    start = valid[0]
    seed = start + period - 1
    out[seed] = values[start : seed + 1].mean()
    alpha = 2.0 / (period + 1)
    for i in range(seed + 1, len(values)):
        out[i] = alpha * values[i] + (1 - alpha) * out[i - 1]
    return pd.Series(out, index=series.index)


def _rsi_value(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0 if avg_gain > 0 else 50.0
    return 100.0 - 100.0 / (1.0 + avg_gain / avg_loss)


def rsi(close: pd.Series, period: int = 14) -> pd.Series:
    values = close.to_numpy(dtype=float)
    out = np.full(len(values), np.nan)
    if len(values) <= period:
        return pd.Series(out, index=close.index)

    delta = np.diff(values)
    gains = np.clip(delta, 0, None)
    losses = np.clip(-delta, 0, None)
    avg_gain = gains[:period].mean()
    avg_loss = losses[:period].mean()
    out[period] = _rsi_value(avg_gain, avg_loss)
    for i in range(period, len(delta)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
        out[i + 1] = _rsi_value(avg_gain, avg_loss)
    return pd.Series(out, index=close.index)


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9) -> pd.DataFrame:
    line = ema(close, fast) - ema(close, slow)
    signal_line = ema(line, signal)
    return pd.DataFrame({"macd": line, "signal": signal_line, "hist": line - signal_line})


def bollinger(close: pd.Series, period: int = 20, num_std: float = 2.0) -> pd.DataFrame:
    middle = sma(close, period)
    std = close.rolling(window=period, min_periods=period).std(ddof=0)
    upper = middle + num_std * std
    lower = middle - num_std * std
    width = upper - lower
    percent_b = (close - lower) / width.where(width != 0)
    return pd.DataFrame({"middle": middle, "upper": upper, "lower": lower, "percent_b": percent_b})


@dataclass(frozen=True)
class Levels:
    supports: list[float]
    resistances: list[float]


def _cluster(values: list[float], tolerance: float) -> list[tuple[float, int]]:
    """Склеивает близкие уровни (в пределах tolerance относительно начала группы)."""
    groups: list[list[float]] = []
    for v in sorted(values):
        if groups and (v - groups[-1][0]) <= groups[-1][0] * tolerance:
            groups[-1].append(v)
        else:
            groups.append([v])
    return [(float(np.mean(g)), len(g)) for g in groups]


def support_resistance(
    df: pd.DataFrame,
    *,
    window: int = 5,
    tolerance: float | None = None,
    max_levels: int = 3,
) -> Levels:
    """Уровни по локальным экстремумам (swing high/low) с кластеризацией.

    Поддержки — ниже текущей цены (ближайшие первыми), сопротивления — выше.
    Если экстремумов с нужной стороны нет, берётся минимум/максимум периода.
    """
    highs = df["high"].to_numpy(dtype=float)
    lows = df["low"].to_numpy(dtype=float)
    price = float(df["close"].iloc[-1])
    n = len(df)

    if tolerance is None:
        avg_range = float(np.nanmean((highs - lows) / df["close"].to_numpy(dtype=float)))
        tolerance = min(max(avg_range * 0.5, 0.002), 0.03)

    pivots: list[float] = []
    for i in range(window, n - window):
        lo, hi = i - window, i + window + 1
        if highs[i] == highs[lo:hi].max():
            pivots.append(highs[i])
        if lows[i] == lows[lo:hi].min():
            pivots.append(lows[i])

    levels = _cluster(pivots, tolerance)
    supports = sorted((lvl for lvl, _ in levels if lvl < price), reverse=True)[:max_levels]
    resistances = sorted(lvl for lvl, _ in levels if lvl > price)[:max_levels]

    if not supports and lows.min() < price:
        supports = [float(lows.min())]
    if not resistances and highs.max() > price:
        resistances = [float(highs.max())]
    return Levels(supports=supports, resistances=resistances)


def _last(series: pd.Series) -> float | None:
    value = series.iloc[-1] if len(series) else np.nan
    return None if pd.isna(value) else float(value)


@dataclass
class Analysis:
    price: float
    change_pct: float
    candles: int
    sma20: float | None
    sma50: float | None
    sma200: float | None
    ema12: float | None
    ema26: float | None
    rsi: float | None
    macd: float | None
    macd_signal: float | None
    macd_hist: float | None
    macd_hist_prev: float | None
    bb_upper: float | None
    bb_middle: float | None
    bb_lower: float | None
    bb_percent_b: float | None
    levels: Levels
    score: float = 0.0
    trend: str = NEUTRAL
    signals: list[str] = field(default_factory=list)


def analyze(df: pd.DataFrame) -> Analysis:
    """Считает все индикаторы по свечам и выдаёт сводку тренда."""
    if len(df) < MIN_CANDLES:
        raise ValueError(f"Нужно минимум {MIN_CANDLES} свечей, получено {len(df)}.")

    close = df["close"].astype(float)
    m = macd(close)
    bb = bollinger(close)
    hist = m["hist"].dropna()

    a = Analysis(
        price=float(close.iloc[-1]),
        change_pct=float((close.iloc[-1] / close.iloc[0] - 1) * 100),
        candles=len(df),
        sma20=_last(sma(close, 20)),
        sma50=_last(sma(close, 50)),
        sma200=_last(sma(close, 200)),
        ema12=_last(ema(close, 12)),
        ema26=_last(ema(close, 26)),
        rsi=_last(rsi(close, 14)),
        macd=_last(m["macd"]),
        macd_signal=_last(m["signal"]),
        macd_hist=_last(m["hist"]),
        macd_hist_prev=float(hist.iloc[-2]) if len(hist) >= 2 else None,
        bb_upper=_last(bb["upper"]),
        bb_middle=_last(bb["middle"]),
        bb_lower=_last(bb["lower"]),
        bb_percent_b=_last(bb["percent_b"]),
        levels=support_resistance(df),
    )
    a.score, a.signals = _score(a)
    a.trend = BULLISH if a.score >= 1.5 else BEARISH if a.score <= -1.5 else NEUTRAL
    return a


def _score(a: Analysis) -> tuple[float, list[str]]:
    score = 0.0
    signals: list[str] = []

    def vote(condition: bool, weight: float, up: str, down: str) -> None:
        nonlocal score
        score += weight if condition else -weight
        signals.append(("▲ " + up) if condition else ("▼ " + down))

    if a.sma20 is not None:
        vote(a.price > a.sma20, 1, "Цена выше SMA20", "Цена ниже SMA20")
    if a.sma20 is not None and a.sma50 is not None:
        vote(a.sma20 > a.sma50, 1,
             "SMA20 выше SMA50 — среднесрочный тренд вверх",
             "SMA20 ниже SMA50 — среднесрочный тренд вниз")
    if a.sma200 is not None:
        vote(a.price > a.sma200, 1,
             "Цена выше SMA200 — долгосрочный тренд вверх",
             "Цена ниже SMA200 — долгосрочный тренд вниз")
    if a.macd is not None and a.macd_signal is not None:
        vote(a.macd > a.macd_signal, 1,
             "MACD выше сигнальной линии",
             "MACD ниже сигнальной линии")

    if a.rsi is not None:
        if a.rsi >= 70:
            score -= 0.5
            signals.append(f"⚠ RSI {a.rsi:.0f} — перекупленность, возможен откат")
        elif a.rsi <= 30:
            score += 0.5
            signals.append(f"⚠ RSI {a.rsi:.0f} — перепроданность, возможен отскок")
        elif a.rsi >= 50:
            score += 0.5
            signals.append(f"▲ RSI {a.rsi:.0f} — импульс на стороне покупателей")
        else:
            score -= 0.5
            signals.append(f"▼ RSI {a.rsi:.0f} — импульс на стороне продавцов")

    if a.bb_upper is not None and a.price > a.bb_upper:
        signals.append("⚠ Цена выше верхней полосы Боллинджера — сильный импульс или перегрев")
    elif a.bb_lower is not None and a.price < a.bb_lower:
        signals.append("⚠ Цена ниже нижней полосы Боллинджера — сильное давление или перепроданность")

    return score, signals
