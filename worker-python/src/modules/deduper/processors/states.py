"""States processor for deduper in-process pipeline."""

from __future__ import annotations

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository


class StatesProcessor:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)

    def execute(self, should_cancel=None) -> dict[str, int]:
        cancel_check = should_cancel or (lambda: False)
        records = self.repository.get_analysis_records_for_state_update()
        if not records:
            return {"processed": 0, "same_state_count": 0, "different_state_count": 0, "missing_state_count": 0}

        batch_size = self.config.batch_size_states
        batch_updates: list[dict] = []
        processed = 0
        checkpoint_interval = self.config.checkpoint_interval

        self.logger.info("event=states_start total=%s", len(records))

        for record in records:
            if processed % checkpoint_interval == 0 and cancel_check():
                raise DeduperProcessorError("States processor cancelled")
            new_state = self.repository.get_article_state(record["articleIdNew"]) or ""
            approved_state = self.repository.get_article_state(record["articleIdApproved"]) or ""
            same_state_flag = 1 if new_state == approved_state else 0

            batch_updates.append(
                {
                    "id": record["id"],
                    "articleNewState": new_state,
                    "articleApprovedState": approved_state,
                    "sameStateFlag": same_state_flag,
                }
            )
            processed += 1

            if len(batch_updates) >= batch_size:
                self.repository.update_analysis_states_batch(batch_updates)
                batch_updates = []

        if batch_updates:
            self.repository.update_analysis_states_batch(batch_updates)

        stats = self.repository.get_state_processing_stats()
        stats["processed"] = processed
        self.logger.info("event=states_complete processed=%s", processed)
        return stats
