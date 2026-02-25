"""Deduper orchestration interface.

Step-by-step command implementations arrive in later phases.
"""

from __future__ import annotations

from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository
from src.modules.deduper.types import PipelineSummary


class DeduperOrchestrator:
    def __init__(self, repository: DeduperRepository) -> None:
        self.repository = repository
        self.logger = get_deduper_logger(__name__)

    def check_ready(self) -> bool:
        return self.repository.healthcheck()

    def new_summary(self, mode):
        return PipelineSummary(mode=mode)
