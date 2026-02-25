"""Internal deduper package for in-process duplicate analysis workflows."""

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import (
    DeduperConfigError,
    DeduperDatabaseError,
    DeduperError,
    DeduperProcessorError,
)
from src.modules.deduper.orchestrator import DeduperOrchestrator
from src.modules.deduper.repository import DeduperRepository

__all__ = [
    "DeduperConfig",
    "DeduperError",
    "DeduperConfigError",
    "DeduperDatabaseError",
    "DeduperProcessorError",
    "DeduperRepository",
    "DeduperOrchestrator",
]
