"""Logging adapter for deduper package.

Uses stdlib logging to match current worker runtime style and avoid introducing
additional logger dependencies during migration.
"""

from __future__ import annotations

import logging


def get_deduper_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(f"worker.deduper.{name}")

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        )
        logger.addHandler(handler)

    logger.setLevel(logging.INFO)
    logger.propagate = False
    return logger
