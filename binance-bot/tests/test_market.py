import pytest

from bot.binance_client import parse_ticker_24h
from bot.market import normalize_symbol, select_top, split_symbol
from conftest import TICKER_BTC


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("btc", "BTCUSDT"),
        ("BTCUSDT", "BTCUSDT"),
        (" sol ", "SOLUSDT"),
        ("eth/btc", "ETHBTC"),
        ("ETH-USDC", "ETHUSDC"),
        ("ETHBTC", "ETHBTC"),
        ("OPUSDT", "OPUSDT"),
        ("op/btc", "OPBTC"),
        ("BNB", "BNBUSDT"),
        ("WBTC", "WBTCUSDT"),
        ("1000PEPE", "1000PEPEUSDT"),
        ("btcfdusd", "BTCFDUSD"),
    ],
)
def test_normalize_symbol(raw, expected):
    assert normalize_symbol(raw) == expected


@pytest.mark.parametrize("raw", ["", "b", "BTC$", "<script>", "a" * 30])
def test_normalize_symbol_rejects_garbage(raw):
    with pytest.raises(ValueError):
        normalize_symbol(raw)


def test_split_symbol():
    assert split_symbol("BTCUSDT") == ("BTC", "USDT")
    assert split_symbol("ETHBTC") == ("ETH", "BTC")
    assert split_symbol("XYZ") == ("XYZ", "")


def ticker(symbol, pct, quote_volume=50_000_000, trades=100):
    return parse_ticker_24h({
        **TICKER_BTC,
        "symbol": symbol,
        "priceChangePercent": str(pct),
        "quoteVolume": str(quote_volume),
        "count": trades,
    })


def test_select_top_filters_and_sorts():
    tickers = [
        ticker("AAAUSDT", 12.0),
        ticker("BBBUSDT", 5.0),
        ticker("CCCUSDT", -8.0),
        ticker("DDDUSDT", -2.0),
        ticker("EEEUSDT", 40.0, quote_volume=1_000),  # мелкий оборот
        ticker("FFFBTC", 30.0),                       # не USDT
        ticker("USDCUSDT", 0.1),                      # стейблкоин
        ticker("GGGUSDT", -50.0, trades=0),           # не торгуется
    ]
    gainers, losers = select_top(tickers, min_quote_volume=10_000_000, limit=10)
    assert [t.symbol for t in gainers] == ["AAAUSDT", "BBBUSDT"]
    assert [t.symbol for t in losers] == ["CCCUSDT", "DDDUSDT"]


def test_select_top_limit_and_sign():
    tickers = [ticker(f"T{i:02d}USDT", i - 5) for i in range(11)]
    gainers, losers = select_top(tickers, min_quote_volume=0, limit=3)
    assert [t.price_change_percent for t in gainers] == [5, 4, 3]
    assert [t.price_change_percent for t in losers] == [-5, -4, -3]
    assert all(t.price_change_percent != 0 for t in gainers + losers)
