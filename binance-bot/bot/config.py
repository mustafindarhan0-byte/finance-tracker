"""Настройки бота из переменных окружения (и файла .env, если он есть)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

try:  # python-dotenv необязателен: без него читаем только реальное окружение
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

TOKEN_PLACEHOLDER = "123456789:replace-with-your-token"


class ConfigError(RuntimeError):
    """Неверная или отсутствующая настройка."""


@dataclass(frozen=True)
class Settings:
    telegram_token: str
    binance_base_url: str = "https://api.binance.com"
    db_path: Path = Path("data/alerts.db")
    alert_check_interval: int = 60
    top_min_quote_volume: float = 10_000_000.0
    log_level: str = "INFO"


def _env_number(name: str, default: float, cast: type) -> float:
    raw = os.getenv(name, "").strip()
    if not raw:
        return default
    try:
        value = cast(raw)
    except ValueError as exc:
        raise ConfigError(f"Переменная {name} должна быть числом, получено: {raw!r}") from exc
    if value <= 0:
        raise ConfigError(f"Переменная {name} должна быть больше нуля.")
    return value


def load_settings() -> Settings:
    if load_dotenv is not None:
        load_dotenv()

    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token or token == TOKEN_PLACEHOLDER:
        raise ConfigError(
            "Не задан TELEGRAM_BOT_TOKEN. Получите токен у @BotFather и укажите его "
            "в переменной окружения или в файле .env (см. .env.example)."
        )

    return Settings(
        telegram_token=token,
        binance_base_url=os.getenv("BINANCE_BASE_URL", "").strip() or Settings.binance_base_url,
        db_path=Path(os.getenv("ALERTS_DB_PATH", "").strip() or Settings.db_path),
        alert_check_interval=int(_env_number("ALERT_CHECK_INTERVAL", Settings.alert_check_interval, int)),
        top_min_quote_volume=float(
            _env_number("TOP_MIN_QUOTE_VOLUME", Settings.top_min_quote_volume, float)
        ),
        log_level=os.getenv("LOG_LEVEL", "").strip().upper() or Settings.log_level,
    )
