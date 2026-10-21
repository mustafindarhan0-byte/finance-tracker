"""Работа с символами и выборка топа по изменению цены."""

from __future__ import annotations

import re
from typing import Iterable

from .binance_client import Ticker24h

# Длинные котировки идут первыми, чтобы «FDUSD» не путался с короткими
KNOWN_QUOTES = (
    "FDUSD", "USDT", "USDC", "TUSD", "BUSD",
    "BTC", "ETH", "BNB", "EUR", "TRY", "BRL", "JPY", "DAI",
)

# Стейблкоины и фиат: их «рост/падение» к USDT — шум, а не рынок
STABLE_BASES = frozenset({
    "USDC", "FDUSD", "TUSD", "BUSD", "DAI", "USDP", "PAX", "UST", "USDE", "PYUSD",
    "XUSD", "USD1", "EUR", "EURI", "AEUR", "GBP",
})

_SEPARATORS = re.compile(r"[/\-_\s]")
_SYMBOL_RE = re.compile(r"[A-Z0-9]{2,20}")


def normalize_symbol(raw: str) -> str:
    """'btc' -> 'BTCUSDT', 'eth/btc' -> 'ETHBTC', 'SOLUSDT' -> 'SOLUSDT'.

    Без котируемой валюты по умолчанию подставляется USDT. Пары вида
    «OPBTC», где база короче трёх символов, лучше писать через слэш: OP/BTC.
    """
    text = raw.strip().upper()
    had_separator = bool(_SEPARATORS.search(text))
    symbol = _SEPARATORS.sub("", text)
    if not _SYMBOL_RE.fullmatch(symbol):
        raise ValueError(f"Некорректный символ: {raw!r}")
    if had_separator:
        return symbol
    if split_symbol(symbol)[1]:
        return symbol
    return symbol + "USDT"


def split_symbol(symbol: str) -> tuple[str, str]:
    """('BTCUSDT') -> ('BTC', 'USDT'); если котировка не распознана — (symbol, '')."""
    for quote in KNOWN_QUOTES:
        min_base = 2 if len(quote) >= 4 else 3
        if symbol.endswith(quote) and len(symbol) - len(quote) >= min_base:
            return symbol[: -len(quote)], quote
    return symbol, ""


def select_top(
    tickers: Iterable[Ticker24h],
    *,
    min_quote_volume: float,
    limit: int = 10,
    quote: str = "USDT",
) -> tuple[list[Ticker24h], list[Ticker24h]]:
    """Топ растущих и падающих пар с котировкой `quote` и оборотом не ниже порога."""
    eligible = []
    for t in tickers:
        base, q = split_symbol(t.symbol)
        if q != quote or base in STABLE_BASES:
            continue
        if t.quote_volume < min_quote_volume or t.last_price <= 0 or t.trades <= 0:
            continue
        eligible.append(t)

    by_change = sorted(eligible, key=lambda t: t.price_change_percent, reverse=True)
    gainers = [t for t in by_change if t.price_change_percent > 0][:limit]
    losers = [t for t in reversed(by_change) if t.price_change_percent < 0][:limit]
    return gainers, losers
