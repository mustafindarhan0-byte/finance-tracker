import math

import numpy as np
import pandas as pd
import pytest

from bot import indicators as ind
from conftest import make_candles

# Классический пример Уайлдера (StockCharts) для RSI(14)
WILDER_CLOSES = [
    44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.10, 45.42, 45.84, 46.08,
    45.89, 46.03, 45.61, 46.28, 46.28, 46.00, 46.03, 46.41, 46.22, 45.64,
]


def test_sma_matches_manual_mean():
    s = pd.Series([1, 2, 3, 4, 5], dtype=float)
    out = ind.sma(s, 3)
    assert out.iloc[:2].isna().all()
    assert out.tolist()[2:] == [2.0, 3.0, 4.0]


def test_ema_seeded_with_sma_then_recursive():
    s = pd.Series([1, 2, 3, 4, 5, 6], dtype=float)
    out = ind.ema(s, 3)
    alpha = 0.5  # 2 / (3 + 1)
    assert out.iloc[:2].isna().all()
    assert out.iloc[2] == pytest.approx(2.0)  # SMA(1,2,3)
    assert out.iloc[3] == pytest.approx(alpha * 4 + (1 - alpha) * 2.0)
    assert out.iloc[5] == pytest.approx(5.0)


def test_ema_of_constant_is_constant_and_skips_leading_nan():
    s = pd.Series([np.nan, np.nan, 7, 7, 7, 7, 7], dtype=float)
    out = ind.ema(s, 3)
    assert out.iloc[:4].isna().all()
    assert out.iloc[4:].tolist() == [7.0, 7.0, 7.0]


def test_ema_too_short_returns_nan():
    assert ind.ema(pd.Series([1.0, 2.0]), 5).isna().all()


def test_rsi_wilder_reference_value():
    out = ind.rsi(pd.Series(WILDER_CLOSES), 14)
    assert out.iloc[:14].isna().all()
    # средний рост 3.34/14, среднее падение 1.40/14 -> RSI = 100 - 100/(1 + 3.34/1.40)
    assert out.iloc[14] == pytest.approx(100 - 100 / (1 + 3.34 / 1.40), abs=1e-9)
    assert out.iloc[14] == pytest.approx(70.46, abs=0.01)
    # следующий шаг — сглаживание Уайлдера (изменение 46.28 -> 46.00 = −0.28)
    g, l = 3.34 / 14, 1.40 / 14
    g, l = (g * 13 + 0) / 14, (l * 13 + 0.28) / 14
    assert out.iloc[15] == pytest.approx(100 - 100 / (1 + g / l), abs=1e-9)


def test_rsi_extremes():
    assert ind.rsi(pd.Series(np.arange(1, 40, dtype=float))).iloc[-1] == 100.0
    assert ind.rsi(pd.Series(np.arange(40, 1, -1, dtype=float))).iloc[-1] == 0.0
    assert ind.rsi(pd.Series([5.0] * 30)).iloc[-1] == 50.0


def test_rsi_bounded():
    rng = np.random.default_rng(0)
    out = ind.rsi(pd.Series(100 + rng.normal(0, 1, 500).cumsum())).dropna()
    assert ((out >= 0) & (out <= 100)).all()


def test_macd_is_difference_of_emas_and_hist_consistent():
    rng = np.random.default_rng(3)
    close = pd.Series(100 + rng.normal(0, 1, 120).cumsum())
    m = ind.macd(close)
    expected = ind.ema(close, 12) - ind.ema(close, 26)
    pd.testing.assert_series_equal(m["macd"], expected, check_names=False)
    # сигнальная начинается через 26 + 9 − 2 свечей
    assert m["signal"].first_valid_index() == 25 + 8
    valid = m.dropna()
    assert np.allclose(valid["hist"], valid["macd"] - valid["signal"])


def test_macd_positive_in_uptrend(uptrend):
    m = ind.macd(uptrend["close"])
    assert m["macd"].iloc[-1] > 0


def test_bollinger_bands():
    close = pd.Series([1, 2, 3, 4, 5, 6], dtype=float)
    bb = ind.bollinger(close, period=5, num_std=2)
    std = np.std([2, 3, 4, 5, 6])  # ddof=0
    assert bb["middle"].iloc[-1] == pytest.approx(4.0)
    assert bb["upper"].iloc[-1] == pytest.approx(4.0 + 2 * std)
    assert bb["lower"].iloc[-1] == pytest.approx(4.0 - 2 * std)
    assert bb["percent_b"].iloc[-1] == pytest.approx((6 - bb["lower"].iloc[-1]) / (4 * std))


def test_bollinger_flat_series_has_no_percent_b():
    bb = ind.bollinger(pd.Series([3.0] * 25))
    assert bb["upper"].iloc[-1] == bb["lower"].iloc[-1] == 3.0
    assert math.isnan(bb["percent_b"].iloc[-1])


def test_support_resistance_finds_swing_levels():
    # колебания между ~90 и ~110, текущая цена 100
    wave = [100, 104, 108, 110, 108, 104, 100, 96, 92, 90, 92, 96] * 6 + [100]
    df = make_candles(wave, spread=0.0)
    levels = ind.support_resistance(df, window=3, tolerance=0.01)
    assert levels.supports and levels.resistances
    assert levels.supports[0] == pytest.approx(90, rel=0.01)
    assert levels.resistances[0] == pytest.approx(110, rel=0.01)
    assert all(s < 100 for s in levels.supports)
    assert all(r > 100 for r in levels.resistances)


def test_support_resistance_sorted_by_proximity():
    closes = [100, 120, 100, 80, 100, 115, 100, 85, 100, 110, 100, 90, 100] * 3 + [100]
    df = make_candles(closes, spread=0.0)
    lv = ind.support_resistance(df, window=1, tolerance=0.001, max_levels=3)
    assert lv.supports == sorted(lv.supports, reverse=True)
    assert lv.resistances == sorted(lv.resistances)
    assert len(lv.supports) <= 3 and len(lv.resistances) <= 3


def test_support_resistance_fallback_to_range(uptrend):
    # на новом максимуме сопротивлений сверху нет — уровней-экстремумов просто не будет
    lv = ind.support_resistance(uptrend)
    assert lv.supports
    assert all(s < uptrend["close"].iloc[-1] for s in lv.supports)


def test_analyze_bullish(uptrend):
    a = ind.analyze(uptrend)
    assert a.trend == ind.BULLISH
    assert a.score >= 1.5
    assert a.sma200 is not None and a.price > a.sma200
    assert any("SMA20 выше SMA50" in s for s in a.signals)


def test_analyze_bearish(downtrend):
    a = ind.analyze(downtrend)
    assert a.trend == ind.BEARISH
    assert a.score <= -1.5


def test_analyze_neutral_on_flat_noise():
    rng = np.random.default_rng(7)
    closes = 100 + np.sin(np.linspace(0, 12 * np.pi, 120)) + rng.normal(0, 0.05, 120)
    a = ind.analyze(make_candles(closes))
    assert a.sma200 is None  # меньше 200 свечей
    assert a.trend in {ind.NEUTRAL, ind.BULLISH, ind.BEARISH}
    assert -4.5 <= a.score <= 4.5


def test_analyze_requires_enough_candles():
    with pytest.raises(ValueError):
        ind.analyze(make_candles(np.linspace(1, 2, ind.MIN_CANDLES - 1)))
