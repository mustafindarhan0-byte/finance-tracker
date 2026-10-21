"""Точка входа: python -m bot"""

from __future__ import annotations

import logging
import sys

from telegram import Update
from telegram.error import InvalidToken
from telegram.ext import Application, ApplicationBuilder

from .alerts_store import AlertsStore
from .binance_client import BinanceClient
from .config import ConfigError, Settings, load_settings
from .handlers import BOT_COMMANDS, check_alerts, register_handlers

log = logging.getLogger("bot")


async def _post_init(app: Application) -> None:
    settings: Settings = app.bot_data["settings"]
    app.bot_data["binance"] = BinanceClient(settings.binance_base_url)
    app.bot_data["alerts"] = AlertsStore(settings.db_path)

    if app.job_queue is None:
        raise RuntimeError(
            "JobQueue недоступна: установите python-telegram-bot[job-queue] (см. requirements.txt)."
        )
    app.job_queue.run_repeating(
        check_alerts, interval=settings.alert_check_interval, first=10, name="price-alerts"
    )
    await app.bot.set_my_commands(BOT_COMMANDS)
    me = await app.bot.get_me()
    log.info("Бот @%s запущен, уведомления проверяются каждые %s с",
             me.username, settings.alert_check_interval)


async def _post_shutdown(app: Application) -> None:
    client = app.bot_data.get("binance")
    if client is not None:
        await client.aclose()
    store = app.bot_data.get("alerts")
    if store is not None:
        store.close()


def build_application(settings: Settings) -> Application:
    app = (
        ApplicationBuilder()
        .token(settings.telegram_token)
        .post_init(_post_init)
        .post_shutdown(_post_shutdown)
        .build()
    )
    app.bot_data["settings"] = settings
    register_handlers(app)
    return app


def main() -> int:
    try:
        settings = load_settings()
    except ConfigError as exc:
        print(f"Ошибка конфигурации: {exc}", file=sys.stderr)
        return 2

    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    # httpx на уровне INFO пишет URL запросов к Telegram, а в них — токен бота
    logging.getLogger("httpx").setLevel(logging.WARNING)

    try:
        build_application(settings).run_polling(allowed_updates=Update.ALL_TYPES)
    except InvalidToken:
        print("Telegram отклонил TELEGRAM_BOT_TOKEN — проверьте токен у @BotFather.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
