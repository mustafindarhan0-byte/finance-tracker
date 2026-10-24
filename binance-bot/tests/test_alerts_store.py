import pytest

from bot.alerts_store import ABOVE, BELOW, Alert, AlertsStore, find_triggered, is_triggered


@pytest.fixture
def store():
    s = AlertsStore(":memory:")
    yield s
    s.close()


def test_add_list_remove(store):
    a = store.add(1, "BTCUSDT", ABOVE, 70000)
    b = store.add(1, "ETHUSDT", BELOW, 2000)
    store.add(2, "SOLUSDT", ABOVE, 300)
    assert [x.id for x in store.list_for_chat(1)] == [a.id, b.id]
    assert store.list_for_chat(1)[0] == a
    assert len(store.all()) == 3

    assert store.remove(2, a.id) is False  # чужое уведомление не удалить
    assert store.remove(1, a.id) is True
    assert store.remove(1, a.id) is False
    assert store.remove_for_chat(1) == 1
    assert [x.symbol for x in store.all()] == ["SOLUSDT"]


def test_validation(store):
    with pytest.raises(ValueError):
        store.add(1, "BTCUSDT", "sideways", 1)
    with pytest.raises(ValueError):
        store.add(1, "BTCUSDT", ABOVE, 0)


def test_limit_per_chat(store):
    for i in range(AlertsStore.MAX_PER_CHAT):
        store.add(1, "BTCUSDT", ABOVE, 1000 + i)
    with pytest.raises(OverflowError):
        store.add(1, "BTCUSDT", ABOVE, 1)
    store.add(2, "BTCUSDT", ABOVE, 1)  # другой чат не затронут


def test_persists_on_disk(tmp_path):
    path = tmp_path / "nested" / "alerts.db"
    s = AlertsStore(path)
    s.add(5, "BNBUSDT", BELOW, 500)
    s.close()
    s2 = AlertsStore(path)
    assert [(a.chat_id, a.symbol, a.direction, a.price) for a in s2.all()] == [(5, "BNBUSDT", BELOW, 500.0)]
    s2.close()


def test_is_triggered_boundaries():
    above = Alert(1, 1, "BTCUSDT", ABOVE, 100.0, "")
    below = Alert(2, 1, "BTCUSDT", BELOW, 100.0, "")
    assert is_triggered(above, 100.0) and is_triggered(above, 101)
    assert not is_triggered(above, 99.99)
    assert is_triggered(below, 100.0) and is_triggered(below, 50)
    assert not is_triggered(below, 100.01)


def test_find_triggered():
    alerts = [
        Alert(1, 1, "BTCUSDT", ABOVE, 70000, ""),
        Alert(2, 1, "ETHUSDT", BELOW, 2000, ""),
        Alert(3, 2, "GONEUSDT", ABOVE, 1, ""),  # пары нет в ценах
    ]
    hits = find_triggered(alerts, {"BTCUSDT": 71000.0, "ETHUSDT": 2500.0})
    assert hits == [(alerts[0], 71000.0)]


def test_base_price_saved_and_validated(store):
    a = store.add(1, "BTCUSDT", ABOVE, 66000, base_price=60000)
    assert a.base_price == 60000.0
    assert store.all()[0].base_price == 60000.0
    assert store.add(1, "BTCUSDT", ABOVE, 1).base_price is None
    with pytest.raises(ValueError):
        store.add(1, "BTCUSDT", ABOVE, 1, base_price=0)
    assert store.free_slots(1) == AlertsStore.MAX_PER_CHAT - 2


def test_migrates_database_without_base_price(tmp_path):
    import sqlite3

    path = tmp_path / "old.db"
    conn = sqlite3.connect(path)
    conn.executescript(
        "CREATE TABLE alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER NOT NULL, "
        "symbol TEXT NOT NULL, direction TEXT NOT NULL, price REAL NOT NULL, created_at TEXT NOT NULL);"
        "INSERT INTO alerts (chat_id, symbol, direction, price, created_at) "
        "VALUES (1, 'BTCUSDT', 'above', 70000, '2026-01-01');"
    )
    conn.commit()
    conn.close()

    s = AlertsStore(path)
    old = s.all()[0]
    assert (old.symbol, old.base_price) == ("BTCUSDT", None)
    assert s.add(1, "ETHUSDT", BELOW, 2000, base_price=2500).base_price == 2500.0
    s.close()
