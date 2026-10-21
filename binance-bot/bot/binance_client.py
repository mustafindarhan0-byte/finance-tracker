"""Асинхронный клиент публичного REST API Binance (только рыночные данные).

Никаких API-ключей и торговых эндпоинтов: используются только
ticker/24hr, ticker/price, klines и depth.
"""

from __future__ import annotations

import asyncio
import logging
import random
import time
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

import httpx
import pandas as pd

log = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.binance.com"
INTERVALS = (
    "1m", "3m", "5m", "15m", "30m",
    "1h", "2h", "4h", "6h", "8h", "12h",
    "1d", "3d", "1w", "1M",
)

# Коды ошибок Binance, означающие несуществующий/некорректный символ
_INVALID_SYMBOL_CODES = {-1121, -1100}


class BinanceError(Exception):
    """Базовая ошибка Binance. Текст исключения можно показывать пользователю."""

    default_message = "Ошибка при обращении к Binance."

    def __init__(self, message: str | None = None):
        super().__init__(message or self.default_message)


class InvalidSymbolError(BinanceError):
    def __init__(self, symbol: str | None):
        self.symbol = symbol
        super().__init__(f"Торговая пара {symbol or ''} не найдена на Binance.".replace("  ", " "))


class BinanceUnavailableError(BinanceError):
    default_message = "Binance сейчас недоступен. Попробуйте чуть позже."


class RateLimitError(BinanceError):
    def __init__(self, retry_after: float | None = None):
        self.retry_after = retry_after
        wait = f" через {int(retry_after)} с" if retry_after else " чуть позже"
        super().__init__(f"Превышен лимит запросов к Binance. Попробуйте{wait}.")


class RegionBlockedError(BinanceError):
    default_message = (
        "Binance отклоняет запросы из этого региона (HTTP 451). "
        "Укажите BINANCE_BASE_URL=https://data-api.binance.vision в .env."
    )


@dataclass(frozen=True)
class Ticker24h:
    symbol: str
    last_price: float
    price_change: float
    price_change_percent: float
    open_price: float
    high: float
    low: float
    volume: float
    quote_volume: float
    weighted_avg_price: float
    bid: float | None
    ask: float | None
    trades: int


@dataclass(frozen=True)
class OrderBook:
    bids: list[tuple[float, float]]
    asks: list[tuple[float, float]]

    @property
    def best_bid(self) -> float | None:
        return self.bids[0][0] if self.bids else None

    @property
    def best_ask(self) -> float | None:
        return self.asks[0][0] if self.asks else None

    @property
    def spread_pct(self) -> float | None:
        if self.best_bid is None or self.best_ask is None or self.best_bid <= 0:
            return None
        mid = (self.best_bid + self.best_ask) / 2
        return (self.best_ask - self.best_bid) / mid * 100

    @property
    def bid_share(self) -> float | None:
        """Доля покупок в стакане (по объёму в котируемой валюте), 0..1."""
        bid_value = sum(p * q for p, q in self.bids)
        ask_value = sum(p * q for p, q in self.asks)
        total = bid_value + ask_value
        return bid_value / total if total > 0 else None


# ---------------------------------------------------------------- парсинг

def _bad_format(exc: Exception) -> BinanceError:
    return BinanceError(f"Неожиданный формат ответа Binance ({type(exc).__name__}).")


def _opt_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    number = float(value)
    return number if number > 0 else None


def parse_ticker_24h(data: dict[str, Any]) -> Ticker24h:
    try:
        return Ticker24h(
            symbol=str(data["symbol"]),
            last_price=float(data["lastPrice"]),
            price_change=float(data["priceChange"]),
            price_change_percent=float(data["priceChangePercent"]),
            open_price=float(data["openPrice"]),
            high=float(data["highPrice"]),
            low=float(data["lowPrice"]),
            volume=float(data["volume"]),
            quote_volume=float(data["quoteVolume"]),
            weighted_avg_price=float(data.get("weightedAvgPrice") or 0.0),
            bid=_opt_float(data.get("bidPrice")),
            ask=_opt_float(data.get("askPrice")),
            trades=int(data.get("count") or 0),
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise _bad_format(exc) from exc


def parse_prices(data: Any) -> dict[str, float]:
    if isinstance(data, dict):
        data = [data]
    try:
        return {str(item["symbol"]): float(item["price"]) for item in data}
    except (KeyError, TypeError, ValueError) as exc:
        raise _bad_format(exc) from exc


KLINE_COLUMNS = ["open", "high", "low", "close", "volume", "quote_volume", "trades"]


def parse_klines(rows: list[list[Any]]) -> pd.DataFrame:
    """Свечи Binance -> DataFrame с индексом open_time (UTC) и float-колонками."""
    if not isinstance(rows, list):
        raise _bad_format(TypeError("klines is not a list"))
    try:
        records = [
            {
                "open_time": int(r[0]),
                "open": float(r[1]),
                "high": float(r[2]),
                "low": float(r[3]),
                "close": float(r[4]),
                "volume": float(r[5]),
                "close_time": int(r[6]),
                "quote_volume": float(r[7]),
                "trades": int(r[8]),
            }
            for r in rows
        ]
    except (IndexError, TypeError, ValueError) as exc:
        raise _bad_format(exc) from exc

    df = pd.DataFrame.from_records(
        records, columns=["open_time", *KLINE_COLUMNS[:5], "close_time", "quote_volume", "trades"]
    )
    df["open_time"] = pd.to_datetime(df["open_time"], unit="ms", utc=True)
    df["close_time"] = pd.to_datetime(df["close_time"], unit="ms", utc=True)
    return df.set_index("open_time")


def parse_depth(data: dict[str, Any]) -> OrderBook:
    try:
        bids = [(float(p), float(q)) for p, q in data["bids"]]
        asks = [(float(p), float(q)) for p, q in data["asks"]]
    except (KeyError, TypeError, ValueError) as exc:
        raise _bad_format(exc) from exc
    return OrderBook(bids=bids, asks=asks)


def _error_payload(resp: httpx.Response) -> tuple[int | None, str]:
    try:
        body = resp.json()
        return body.get("code"), str(body.get("msg", ""))
    except (ValueError, AttributeError):
        return None, resp.text[:200]


def _retry_after(resp: httpx.Response) -> float | None:
    raw = resp.headers.get("Retry-After")
    try:
        return float(raw) if raw else None
    except ValueError:
        return None


# ---------------------------------------------------------------- клиент

class BinanceClient:
    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        *,
        timeout: float = 10.0,
        max_retries: int = 3,
        backoff_base: float = 0.5,
        max_backoff: float = 30.0,
        tickers_cache_ttl: float = 30.0,
        transport: httpx.AsyncBaseTransport | None = None,
        sleep: Callable[[float], Awaitable[Any]] = asyncio.sleep,
        clock: Callable[[], float] = time.monotonic,
    ):
        self._http = httpx.AsyncClient(
            base_url=base_url,
            timeout=timeout,
            transport=transport,
            headers={"User-Agent": "binance-market-telegram-bot/1.0"},
        )
        self.max_retries = max_retries
        self.backoff_base = backoff_base
        self.max_backoff = max_backoff
        self.tickers_cache_ttl = tickers_cache_ttl
        self._sleep = sleep
        self._clock = clock
        self._tickers_cache: tuple[float, list[Ticker24h]] | None = None

    async def aclose(self) -> None:
        await self._http.aclose()

    async def __aenter__(self) -> "BinanceClient":
        return self

    async def __aexit__(self, *exc_info: Any) -> None:
        await self.aclose()

    def _backoff(self, attempt: int) -> float:
        delay = self.backoff_base * (2 ** attempt)
        return min(delay + random.uniform(0, self.backoff_base), self.max_backoff)

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> Any:
        """GET с повторами: сетевые ошибки, 5xx и 429 повторяются с экспоненциальной паузой."""
        attempt = 0
        while True:
            try:
                resp = await self._http.get(path, params=params)
            except httpx.TransportError as exc:
                if attempt >= self.max_retries:
                    log.warning("Binance %s: сеть недоступна (%s)", path, exc)
                    raise BinanceUnavailableError() from exc
                await self._sleep(self._backoff(attempt))
                attempt += 1
                continue

            status = resp.status_code
            if status == 200:
                try:
                    return resp.json()
                except ValueError as exc:
                    raise BinanceError("Binance вернул некорректный ответ.") from exc

            if status in (418, 429):
                retry_after = _retry_after(resp)
                # 418 — IP уже забанен на время Retry-After, повторять бессмысленно
                if status == 418 or attempt >= self.max_retries:
                    raise RateLimitError(retry_after)
                delay = max(self._backoff(attempt), retry_after or 0.0)
                if delay > self.max_backoff:
                    raise RateLimitError(retry_after)
                log.info("Binance rate limit, повтор через %.1f с", delay)
                await self._sleep(delay)
                attempt += 1
                continue

            if status == 451:
                raise RegionBlockedError()

            if status >= 500:
                if attempt >= self.max_retries:
                    raise BinanceUnavailableError()
                await self._sleep(self._backoff(attempt))
                attempt += 1
                continue

            code, msg = _error_payload(resp)
            if code in _INVALID_SYMBOL_CODES or "invalid symbol" in msg.lower():
                raise InvalidSymbolError((params or {}).get("symbol"))
            raise BinanceError(f"Binance отклонил запрос: {msg or status}")

    # ------------------------------------------------------------ эндпоинты

    async def ticker_24h(self, symbol: str) -> Ticker24h:
        data = await self._get("/api/v3/ticker/24hr", {"symbol": symbol})
        return parse_ticker_24h(data)

    async def all_tickers_24h(self) -> list[Ticker24h]:
        """Все тикеры за 24ч (тяжёлый запрос, вес 80) — кэшируется на tickers_cache_ttl."""
        now = self._clock()
        if self._tickers_cache and now - self._tickers_cache[0] < self.tickers_cache_ttl:
            return self._tickers_cache[1]
        data = await self._get("/api/v3/ticker/24hr")
        if not isinstance(data, list):
            raise _bad_format(TypeError("ticker/24hr is not a list"))
        tickers = []
        for item in data:
            try:
                tickers.append(parse_ticker_24h(item))
            except BinanceError:
                log.debug("Пропущен некорректный тикер: %r", item)
        self._tickers_cache = (now, tickers)
        return tickers

    async def price(self, symbol: str) -> float:
        data = await self._get("/api/v3/ticker/price", {"symbol": symbol})
        return parse_prices(data)[symbol]

    async def all_prices(self) -> dict[str, float]:
        return parse_prices(await self._get("/api/v3/ticker/price"))

    async def klines(self, symbol: str, interval: str = "4h", limit: int = 300) -> pd.DataFrame:
        if interval not in INTERVALS:
            raise ValueError(f"Неизвестный интервал: {interval}")
        rows = await self._get(
            "/api/v3/klines", {"symbol": symbol, "interval": interval, "limit": limit}
        )
        df = parse_klines(rows)
        if df.empty:
            raise BinanceError(f"Нет свечей по паре {symbol}.")
        return df

    async def depth(self, symbol: str, limit: int = 100) -> OrderBook:
        data = await self._get("/api/v3/depth", {"symbol": symbol, "limit": limit})
        return parse_depth(data)
