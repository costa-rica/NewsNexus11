import os

import pytest

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperConfigError


@pytest.mark.unit
def test_config_from_env_success(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH_TO_DATABASE", "/tmp/db")
    monkeypatch.setenv("NAME_DB", "news.db")
    monkeypatch.setenv("DEDUPER_ENABLE_EMBEDDING", "true")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_LOAD", "1000")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_STATES", "1000")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_URL", "1000")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_CONTENT_HASH", "1000")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_EMBEDDING", "100")

    config = DeduperConfig.from_env()

    assert config.path_to_database == "/tmp/db"
    assert config.name_db == "news.db"
    assert config.enable_embedding is True
    assert config.sqlite_path == os.path.join("/tmp/db", "news.db")
    assert config.cache_max_entries > 0
    assert config.checkpoint_interval > 0


@pytest.mark.unit
def test_config_missing_required_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PATH_TO_DATABASE", raising=False)
    monkeypatch.setenv("NAME_DB", "news.db")

    with pytest.raises(DeduperConfigError, match="PATH_TO_DATABASE is required"):
        DeduperConfig.from_env()


@pytest.mark.unit
def test_config_invalid_batch_size(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH_TO_DATABASE", "/tmp/db")
    monkeypatch.setenv("NAME_DB", "news.db")
    monkeypatch.setenv("DEDUPER_BATCH_SIZE_LOAD", "0")

    with pytest.raises(DeduperConfigError, match="DEDUPER_BATCH_SIZE_LOAD must be > 0"):
        DeduperConfig.from_env()


@pytest.mark.unit
def test_config_invalid_bool(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH_TO_DATABASE", "/tmp/db")
    monkeypatch.setenv("NAME_DB", "news.db")
    monkeypatch.setenv("DEDUPER_ENABLE_EMBEDDING", "sometimes")

    with pytest.raises(DeduperConfigError, match="DEDUPER_ENABLE_EMBEDDING must be a boolean-like value"):
        DeduperConfig.from_env()
