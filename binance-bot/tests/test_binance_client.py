import asyncio
import json

import httpx
import pandas as pd
import pytest

from bot.binance_client import (
    BinanceClient,
    BinanceError,
    BinanceUnavailableError,
    InvalidSymbolError,
    RateLimitError,
    RegionBlockedError,
    parse_depth,
    parse_klines,
    parse_prices,
    parse_ticker_24h,
)
from conftest import TICKER_BTC, kline_row


def run(coro):
    return asyncio.run(coro)


class FakeSleep:
    def __init__(self):
        self.delays = []

    async def __call__(self, delay):
        self.delays.append(delay)


def make_client(handler, **kwargs):
    sleep = FakeSleep()
    client = BinanceClient(transport=httpx.MockTransport(handler), sleep=sleep, **kwargs)
    return client, sleep


def json_response(status, payload, headers=None):
    return httpx.Response(status, content=json.dumps(payload), headers=headers or {})


# ---------------------------------------------------------------- парсинг

def test_parse_ticker_24h():
    t = parse_ticker_24h(TICKER_BTC)
    assert t.symbol == "BTCUSDT"
    assert t.last_price == 67123.45
    assert t.price_change_percent == pytest.approx(1.874)
    assert t.high == 67500.0 and t.low == 65500.0
    assert t.quote_volume == pytest.approx(820500000.12)
    assert t.bid == 67123.44 and t.ask == 67123.45
    assert t.trades == 1234567


def test_parse_ticker_zero_bid_is_none():
    t = parse_ticker_24h({**TICKER_BTC, "bidPrice": "0.00000000", "askPrice": "0"})
    assert t.bid is None and t.ask is None


def test_parse_ticker_bad_payload():
    with pytest.raises(BinanceError):
        parse_ticker_24h({"symbol": "BTCUSDT", "lastPrice": "abc"})


def test_parse_prices_single_and_list():
    assert parse_prices({"symbol": "BTCUSDT", "price": "1.5"}) == {"BTCUSDT": 1.5}
    assert parse_prices([{"symbol": "A", "price": "1"}, {"symbol": "B", "price": "2"}]) == {
        "A": 1.0, "B": 2.0,
    }


def test_parse_klines():
    rows = [kline_row(1_700_000_000_000 + i * 14_400_000, 10 + i, 11 + i, 9 + i, 10.5 + i) for i in range(3)]
    df = parse_klines(rows)
    assert list(df.columns[:5]) == ["open", "high", "low", "close", "volume"]
    assert len(df) == 3
    assert df["close"].tolist() == [10.5, 11.5, 12.5]
    assert df.index[0] == pd.Timestamp(1_700_000_000_000, unit="ms", tz="UTC")
    assert df["trades"].iloc[0] == 42
    assert df["close"].dtype == float


def test_parse_klines_bad_row():
    with pytest.raises(BinanceError):
        parse_klines([[1, "x"]])


def test_parse_depth_and_metrics():
    book = parse_depth({
        "lastUpdateId": 1,
        "bids": [["100.0", "3.0"], ["99.0", "1.0"]],
        "asks": [["101.0", "1.0"], ["102.0", "1.0"]],
    })
    assert book.best_bid == 100.0 and book.best_ask == 101.0
    assert book.spread_pct == pytest.approx(1 / 100.5 * 100)
    bid_value, ask_value = 300 + 99, 101 + 102
    assert book.bid_share == pytest.approx(bid_value / (bid_value + ask_value))


# ---------------------------------------------------------------- HTTP

def test_ticker_request_and_parse():
    seen = []

    def handler(request):
        seen.append(request)
        return json_response(200, TICKER_BTC)

    client, _ = make_client(handler)
    t = run(client.ticker_24h("BTCUSDT"))
    assert t.last_price == 67123.45
    assert seen[0].url.path == "/api/v3/ticker/24hr"
    assert seen[0].url.params["symbol"] == "BTCUSDT"
    assert "X-MBX-APIKEY" not in seen[0].headers  # никаких ключей


def test_klines_request_params():
    def handler(request):
        assert request.url.path == "/api/v3/klines"
        assert request.url.params["interval"] == "1h"
        assert request.url.params["limit"] == "300"
        return json_response(200, [kline_row(0, 1, 2, 0.5, 1.5)])

    client, _ = make_client(handler)
    df = run(client.klines("ETHUSDT", "1h", 300))
    assert df["close"].iloc[0] == 1.5


def test_klines_rejects_unknown_interval():
    client, _ = make_client(lambda r: json_response(200, []))
    with pytest.raises(ValueError):
        run(client.klines("BTCUSDT", "7h"))


def test_klines_empty_is_error():
    client, _ = make_client(lambda r: json_response(200, []))
    with pytest.raises(BinanceError):
        run(client.klines("BTCUSDT", "1d"))


def test_invalid_symbol():
    client, sleep = make_client(lambda r: json_response(400, {"code": -1121, "msg": "Invalid symbol."}))
    with pytest.raises(InvalidSymbolError) as exc:
        run(client.ticker_24h("FOOBARUSDT"))
    assert exc.value.symbol == "FOOBARUSDT"
    assert "FOOBARUSDT" in str(exc.value)
    assert sleep.delays == []  # 4xx не повторяем


def test_other_4xx_is_generic_error():
    client, _ = make_client(lambda r: json_response(400, {"code": -1102, "msg": "Mandatory parameter"}))
    with pytest.raises(BinanceError) as exc:
        run(client.depth("BTCUSDT"))
    assert not isinstance(exc.value, InvalidSymbolError)


def test_rate_limit_retries_with_retry_after_then_succeeds():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        if calls["n"] < 3:
            return json_response(429, {"code": -1003, "msg": "Too many requests"}, {"Retry-After": "2"})
        return json_response(200, {"symbol": "BTCUSDT", "price": "1.0"})

    client, sleep = make_client(handler)
    assert run(client.price("BTCUSDT")) == 1.0
    assert calls["n"] == 3
    assert len(sleep.delays) == 2
    assert all(d >= 2 for d in sleep.delays)


def test_rate_limit_exhausted():
    client, sleep = make_client(
        lambda r: json_response(429, {"code": -1003, "msg": "Too many"}, {"Retry-After": "1"}),
        max_retries=2,
    )
    with pytest.raises(RateLimitError) as exc:
        run(client.price("BTCUSDT"))
    assert exc.value.retry_after == 1
    assert len(sleep.delays) == 2


def test_ip_ban_418_not_retried():
    client, sleep = make_client(lambda r: json_response(418, {"code": -1003, "msg": "banned"}, {"Retry-After": "120"}))
    with pytest.raises(RateLimitError):
        run(client.price("BTCUSDT"))
    assert sleep.delays == []


def test_backoff_grows_exponentially_on_5xx():
    client, sleep = make_client(lambda r: httpx.Response(503, text="busy"), max_retries=3, backoff_base=1.0)
    with pytest.raises(BinanceUnavailableError):
        run(client.price("BTCUSDT"))
    assert len(sleep.delays) == 3
    # base * 2^n + jitter в [0, base)
    for n, delay in enumerate(sleep.delays):
        assert 2 ** n <= delay < 2 ** n + 1


def test_network_error_retried_then_unavailable():
    def handler(request):
        raise httpx.ConnectError("boom", request=request)

    client, sleep = make_client(handler, max_retries=2)
    with pytest.raises(BinanceUnavailableError):
        run(client.ticker_24h("BTCUSDT"))
    assert len(sleep.delays) == 2


def test_network_error_recovers():
    calls = {"n": 0}

    def handler(request):
        calls["n"] += 1
        if calls["n"] == 1:
            raise httpx.ReadTimeout("slow", request=request)
        return json_response(200, TICKER_BTC)

    client, _ = make_client(handler)
    assert run(client.ticker_24h("BTCUSDT")).symbol == "BTCUSDT"


def test_region_blocked():
    client, _ = make_client(lambda r: json_response(451, {"code": 0, "msg": "restricted location"}))
    with pytest.raises(RegionBlockedError):
        run(client.all_prices())


def test_non_json_body():
    client, _ = make_client(lambda r: httpx.Response(200, text="<html>"))
    with pytest.raises(BinanceError):
        run(client.all_prices())


def test_all_tickers_cached_and_skips_bad_items():
    calls = {"n": 0}
    now = {"t": 0.0}

    def handler(request):
        calls["n"] += 1
        return json_response(200, [TICKER_BTC, {"symbol": "BROKEN"}])

    client, _ = make_client(handler, clock=lambda: now["t"], tickers_cache_ttl=30)
    first = run(client.all_tickers_24h())
    assert [t.symbol for t in first] == ["BTCUSDT"]
    run(client.all_tickers_24h())
    assert calls["n"] == 1
    now["t"] = 31
    run(client.all_tickers_24h())
    assert calls["n"] == 2
