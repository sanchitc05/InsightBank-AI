import pytest

from app import database


def test_database_url_prefers_explicit_database_url(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL",
        "postgresql+psycopg://insightbank:password@localhost:5432/bank_analyzer",
    )
    monkeypatch.setenv("DB_TYPE", "mysql")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "3306")
    monkeypatch.setenv("DB_USER", "root")
    monkeypatch.setenv("DB_PASS", "password")
    monkeypatch.setenv("DB_NAME", "bank_analyzer")

    assert database.build_database_url().startswith("postgresql+psycopg://")


def test_database_url_builds_postgresql_from_components(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DB_TYPE", "postgresql")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_USER", "insightbank")
    monkeypatch.setenv("DB_PASS", "password")
    monkeypatch.setenv("DB_NAME", "bank_analyzer")

    assert (
        database.build_database_url()
        == "postgresql+psycopg://insightbank:password@localhost:5432/bank_analyzer"
    )


def test_database_url_rejects_mysql_components(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("DB_TYPE", "mysql")
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "3306")
    monkeypatch.setenv("DB_USER", "root")
    monkeypatch.setenv("DB_PASS", "password")
    monkeypatch.setenv("DB_NAME", "bank_analyzer")

    with pytest.raises(RuntimeError, match="PostgreSQL only"):
        database.build_database_url()


def test_engine_kwargs_reject_mysql_urls():
    with pytest.raises(RuntimeError, match="MySQL URLs are no longer supported"):
        database.build_engine_kwargs("mysql+pymysql://root:password@localhost:3306/bank_analyzer")


def test_engine_kwargs_allow_sqlite_for_tests():
    kwargs = database.build_engine_kwargs("sqlite://")

    assert kwargs["connect_args"] == {"check_same_thread": False}
    assert kwargs["poolclass"].__name__ == "StaticPool"
