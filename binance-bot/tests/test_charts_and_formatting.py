from bot import formatting as fmt
from bot.alerts_store import ABOVE, Alert
from bot.binance_client import OrderBook, parse_ticker_24h
from bot.charts import render_chart
from bot.indicators import analyze
from conftest import TICKER_BTC

NB = fmt.NBSP


def test_render_chart_returns_png(uptrend):
    png = render_chart(uptrend, "TESTUSDT", "4h")
    assert png.startswith(b"\x89PNG\r\n\x1a\n")
    assert len(png) > 10_000


def test_render_chart_daily_and_short_history(downtrend):
    png = render_chart(downtrend.iloc[:60], "TESTUSDT", "1d", visible=200)
    assert png.startswith(b"\x89PNG")


def test_fmt_price_precision():
    assert fmt.fmt_price(67123.456) == f"67{NB}123.46"
    assert fmt.fmt_price(1.23456) == "1.2346"
    assert fmt.fmt_price(0.0123456) == "0.012346"
    assert fmt.fmt_price(0.00001234) == "0.00001234"
    assert fmt.fmt_price(None) == "—"


def test_fmt_misc():
    assert fmt.fmt_pct(1.874) == "+1.87%"
    assert fmt.fmt_pct(-0.5) == "-0.50%"
    assert fmt.fmt_volume(820_500_000) == "820.50M"
    assert fmt.fmt_volume(1_500) == "1.50K"
    assert fmt.fmt_volume(12) == "12.00"


def test_format_price_message():
    text = fmt.format_price(parse_ticker_24h(TICKER_BTC))
    assert "<b>BTCUSDT</b>" in text
    assert f"67{NB}123.45" in text
    assert "+1.87%" in text
    assert "USDT" in text and "BTC" in text


def test_format_analysis_has_disclaimer_and_sections(uptrend):
    book = OrderBook(bids=[(100.0, 5.0)], asks=[(101.0, 1.0)])
    text = fmt.format_analysis("TESTUSDT", "4h", analyze(uptrend), book)
    for part in ("RSI(14)", "MACD", "Боллинджер", "Поддержка", "Сопротивление", "Итог", "🟢 Бычий",
                 "перевес покупателей"):
        assert part in text
    assert "Не является финансовым советом" in text


def test_format_alerts():
    assert "нет активных" in fmt.format_alerts([])
    text = fmt.format_alerts([Alert(7, 1, "BTCUSDT", ABOVE, 70000, "")])
    assert "#7" in text and "≥" in text
    assert "сработало" in fmt.format_triggered(Alert(7, 1, "BTCUSDT", ABOVE, 70000, ""), 70100)
