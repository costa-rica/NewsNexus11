"""Write processor for the location scorer pipeline."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from loguru import logger

from src.modules.location_scorer.config import LocationScorerConfig
from src.modules.location_scorer.errors import LocationScorerProcessorError
from src.modules.location_scorer.repository import LocationScorerRepository


class WriteProcessor:
    def __init__(
        self,
        repository: LocationScorerRepository,
        config: LocationScorerConfig,
    ) -> None:
        self.repository = repository
        self.config = config
        self.logger = logger

    def execute(
        self,
        entity_id: int,
        scores: list[dict[str, Any]],
        should_cancel: Callable[[], bool] | None = None,
    ) -> dict[str, int]:
        cancel_check = should_cancel or (lambda: False)
        if not scores:
            return {"processed": 0, "duplicates": 0}

        inserted_total = 0
        duplicates_total = 0
        batch_size = self.config.batch_size

        self.logger.info(
            "event=location_scorer_write_start total={}",
            len(scores),
        )

        for offset in range(0, len(scores), batch_size):
            if cancel_check():
                raise LocationScorerProcessorError("Write processor cancelled")

            batch = scores[offset : offset + batch_size]
            result = self.repository.write_scores_batch(entity_id, batch)
            inserted_total += result["inserted"]
            duplicates_total += result["duplicates"]

        self.logger.info(
            "event=location_scorer_write_complete inserted={} duplicates={}",
            inserted_total,
            duplicates_total,
        )

        return {"processed": inserted_total, "duplicates": duplicates_total}
