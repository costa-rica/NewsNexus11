"""Configuration handling for in-process deduper runtime."""

from __future__ import annotations

import os
from dataclasses import dataclass

from src.modules.deduper.errors import DeduperConfigError


TRUE_VALUES = {"1", "true", "yes", "on"}
FALSE_VALUES = {"0", "false", "no", "off"}


def _parse_bool(value: str, key: str) -> bool:
    normalized = value.strip().lower()
    if normalized in TRUE_VALUES:
        return True
    if normalized in FALSE_VALUES:
        return False
    raise DeduperConfigError(f"{key} must be a boolean-like value")


def _parse_positive_int(value: str, key: str) -> int:
    try:
        parsed = int(value)
    except ValueError as exc:
        raise DeduperConfigError(f"{key} must be an integer") from exc

    if parsed <= 0:
        raise DeduperConfigError(f"{key} must be > 0")

    return parsed


@dataclass(slots=True)
class DeduperConfig:
    path_to_database: str
    name_db: str
    path_to_csv: str | None
    enable_embedding: bool
    batch_size_load: int
    batch_size_states: int
    batch_size_url: int
    batch_size_content_hash: int
    batch_size_embedding: int
    cache_max_entries: int
    checkpoint_interval: int

    @property
    def sqlite_path(self) -> str:
        return os.path.join(self.path_to_database, self.name_db)

    @classmethod
    def from_env(cls) -> "DeduperConfig":
        path_to_database = os.getenv("PATH_TO_DATABASE", "").strip()
        name_db = os.getenv("NAME_DB", "").strip()

        if not path_to_database:
            raise DeduperConfigError("PATH_TO_DATABASE is required")
        if not name_db:
            raise DeduperConfigError("NAME_DB is required")

        path_to_csv_raw = os.getenv("PATH_TO_CSV", "").strip()
        enable_embedding_raw = os.getenv("DEDUPER_ENABLE_EMBEDDING", "true")

        return cls(
            path_to_database=path_to_database,
            name_db=name_db,
            path_to_csv=path_to_csv_raw or None,
            enable_embedding=_parse_bool(enable_embedding_raw, "DEDUPER_ENABLE_EMBEDDING"),
            batch_size_load=_parse_positive_int(os.getenv("DEDUPER_BATCH_SIZE_LOAD", "1000"), "DEDUPER_BATCH_SIZE_LOAD"),
            batch_size_states=_parse_positive_int(os.getenv("DEDUPER_BATCH_SIZE_STATES", "1000"), "DEDUPER_BATCH_SIZE_STATES"),
            batch_size_url=_parse_positive_int(os.getenv("DEDUPER_BATCH_SIZE_URL", "1000"), "DEDUPER_BATCH_SIZE_URL"),
            batch_size_content_hash=_parse_positive_int(
                os.getenv("DEDUPER_BATCH_SIZE_CONTENT_HASH", "1000"),
                "DEDUPER_BATCH_SIZE_CONTENT_HASH",
            ),
            batch_size_embedding=_parse_positive_int(
                os.getenv("DEDUPER_BATCH_SIZE_EMBEDDING", "100"),
                "DEDUPER_BATCH_SIZE_EMBEDDING",
            ),
            cache_max_entries=_parse_positive_int(
                os.getenv("DEDUPER_CACHE_MAX_ENTRIES", "10000"),
                "DEDUPER_CACHE_MAX_ENTRIES",
            ),
            checkpoint_interval=_parse_positive_int(
                os.getenv("DEDUPER_CHECKPOINT_INTERVAL", "250"),
                "DEDUPER_CHECKPOINT_INTERVAL",
            ),
        )
