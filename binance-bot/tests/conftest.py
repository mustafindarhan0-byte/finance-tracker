from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


def make_candles(closes, spread: float = 0.01) -> pd.DataFrame:
    """Свечи из ряда цен закрытия: open = предыдущее закрытие, high/low ± spread."""
    closes = np.asarray(closes, dtype=float)
    opens = np.concatenate([[closes[0]], closes[:-1]])
    highs = np.maximum(opens, closes) * (1 + spread)
    lows = np.minimum(opens, closes) * (1 - spread)
    index = pd.date_range("2026-01-01", periods=len(closes), freq="4h", tz="UTC")
    return pd.DataFrame(
        {"open": opens, "high": highs, "low": lows, "close": closes, "volume": 1.0},
        index=index,
    )


@pytest.fixture
def uptrend() -> pd.DataFrame:
    rng = np.random.default_rng(1)
    closes = 100 * np.cumprod(1 + 0.004 + rng.normal(0, 0.003, 260))
    return make_candles(closes)


@pytest.fixture
def downtrend() -> pd.DataFrame:
    rng = np.random.default_rng(2)
    closes = 100 * np.cumprod(1 - 0.004 + rng.normal(0, 0.003, 260))
    return make_candles(closes)


def kline_row(open_time_ms: int, o, h, l, c, v=10.0):
    return [
        open_time_ms, str(o), str(h), str(l), str(c), str(v),
        open_time_ms + 14_399_999, str(v * c), 42, "5.0", "500.0", "0",
    ]


TICKER_BTC = {
    "symbol": "BTCUSDT",
    "priceChange": "1234.50000000",
    "priceChangePercent": "1.874",
    "weightedAvgPrice": "66500.12000000",
    "prevClosePrice": "65888.95000000",
    "lastPrice": "67123.45000000",
    "lastQty": "0.01000000",
    "bidPrice": "67123.44000000",
    "bidQty": "1.20000000",
    "askPrice": "67123.45000000",
    "askQty": "0.80000000",
    "openPrice": "65888.95000000",
    "highPrice": "67500.00000000",
    "lowPrice": "65500.00000000",
    "volume": "12345.67800000",
    "quoteVolume": "820500000.12000000",
    "openTime": 1760900000000,
    "closeTime": 1760986399999,
    "firstId": 1,
    "lastId": 1000,
    "count": 1234567,
}
