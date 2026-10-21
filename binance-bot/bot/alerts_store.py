"""Хранилище ценовых уведомлений в SQLite.

Уведомления одноразовые: после срабатывания удаляются.
"""

from __future__ import annotations

import sqlite3
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

ABOVE = "above"
BELOW = "below"
DIRECTIONS = (ABOVE, BELOW)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS alerts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id     INTEGER NOT NULL,
    symbol      TEXT    NOT NULL,
    direction   TEXT    NOT NULL CHECK (direction IN ('above', 'below')),
    price       REAL    NOT NULL CHECK (price > 0),
    created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_alerts_chat ON alerts (chat_id);
"""


@dataclass(frozen=True)
class Alert:
    id: int
    chat_id: int
    symbol: str
    direction: str
    price: float
    created_at: str


def is_triggered(alert: Alert, price: float) -> bool:
    if alert.direction == ABOVE:
        return price >= alert.price
    return price <= alert.price


def find_triggered(alerts: Iterable[Alert], prices: dict[str, float]) -> list[tuple[Alert, float]]:
    """Сработавшие уведомления вместе с текущей ценой. Пары без цены пропускаются."""
    hits = []
    for alert in alerts:
        price = prices.get(alert.symbol)
        if price is not None and is_triggered(alert, price):
            hits.append((alert, price))
    return hits


class AlertsStore:
    MAX_PER_CHAT = 20

    def __init__(self, path: str | Path = ":memory:"):
        if str(path) != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(str(path), check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = threading.Lock()
        with self._lock, self._conn:
            self._conn.executescript(_SCHEMA)

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    @staticmethod
    def _row(row: sqlite3.Row) -> Alert:
        return Alert(**dict(row))

    def add(self, chat_id: int, symbol: str, direction: str, price: float) -> Alert:
        if direction not in DIRECTIONS:
            raise ValueError(f"direction должен быть одним из {DIRECTIONS}")
        if price <= 0:
            raise ValueError("Цена должна быть больше нуля")
        if self.count_for_chat(chat_id) >= self.MAX_PER_CHAT:
            raise OverflowError(f"Не больше {self.MAX_PER_CHAT} уведомлений на чат")
        created = datetime.now(timezone.utc).isoformat(timespec="seconds")
        with self._lock, self._conn:
            cur = self._conn.execute(
                "INSERT INTO alerts (chat_id, symbol, direction, price, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (chat_id, symbol, direction, float(price), created),
            )
            alert_id = cur.lastrowid
        return Alert(alert_id, chat_id, symbol, direction, float(price), created)

    def count_for_chat(self, chat_id: int) -> int:
        with self._lock:
            row = self._conn.execute(
                "SELECT COUNT(*) FROM alerts WHERE chat_id = ?", (chat_id,)
            ).fetchone()
        return int(row[0])

    def list_for_chat(self, chat_id: int) -> list[Alert]:
        with self._lock:
            rows = self._conn.execute(
                "SELECT * FROM alerts WHERE chat_id = ? ORDER BY id", (chat_id,)
            ).fetchall()
        return [self._row(r) for r in rows]

    def all(self) -> list[Alert]:
        with self._lock:
            rows = self._conn.execute("SELECT * FROM alerts ORDER BY id").fetchall()
        return [self._row(r) for r in rows]

    def remove(self, chat_id: int, alert_id: int) -> bool:
        """Удаляет уведомление, только если оно принадлежит этому чату."""
        with self._lock, self._conn:
            cur = self._conn.execute(
                "DELETE FROM alerts WHERE id = ? AND chat_id = ?", (alert_id, chat_id)
            )
        return cur.rowcount > 0

    def remove_for_chat(self, chat_id: int) -> int:
        with self._lock, self._conn:
            cur = self._conn.execute("DELETE FROM alerts WHERE chat_id = ?", (chat_id,))
        return cur.rowcount
