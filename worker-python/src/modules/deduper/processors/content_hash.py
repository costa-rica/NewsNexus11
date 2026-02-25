"""Content hash processor for deduper in-process pipeline."""

from __future__ import annotations

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository
from src.modules.deduper.utils.text_norm import (
    hamming_distance,
    prepare_content,
    sha1_from_normalized,
    similarity_from_hamming,
    simhash_from_normalized,
)


class ContentHashProcessor:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)
        self.norm_cache: dict[int, str] = {}

    def execute(self, should_cancel=None) -> dict[str, int]:
        cancel_check = should_cancel or (lambda: False)
        total_candidates = self.repository.get_analysis_records_for_content_hash_update()
        if not total_candidates:
            return {
                "processed": 0,
                "exact_match_count": 0,
                "high_similarity_count": 0,
                "medium_similarity_count": 0,
                "low_similarity_count": 0,
                "no_match_count": 0,
            }

        processed = 0
        batch_size = self.config.batch_size_content_hash
        checkpoint_interval = self.config.checkpoint_interval
        self.logger.info("event=content_hash_start total=%s", len(total_candidates))

        while True:
            if processed % checkpoint_interval == 0 and cancel_check():
                raise DeduperProcessorError("Content hash processor cancelled")
            records = self.repository.get_analysis_records_for_content_hash_update_with_contents(limit=batch_size)
            if not records:
                break

            updates: list[dict] = []
            for record in records:
                similarity = self._compare_content_with_details(
                    record["headlineNew"],
                    record["textNew"],
                    record["headlineApproved"],
                    record["textApproved"],
                    record["articleIdNew"],
                    record["articleIdApproved"],
                )
                updates.append({"id": record["id"], "contentHash": similarity})
                processed += 1

            self.repository.update_analysis_content_hash_batch(updates)

        stats = self.repository.get_content_hash_processing_stats()
        stats["processed"] = processed
        self.logger.info("event=content_hash_complete processed=%s", processed)
        return stats

    def _compare_content_with_details(
        self,
        headline_new: str | None,
        text_new: str | None,
        headline_approved: str | None,
        text_approved: str | None,
        article_id_new: int,
        article_id_approved: int,
    ) -> float:
        if (headline_new is None and text_new is None) and (
            headline_approved is None and text_approved is None
        ):
            return 1.0
        if (headline_new is None and text_new is None) or (
            headline_approved is None and text_approved is None
        ):
            return 0.0

        norm1 = self.norm_cache.get(article_id_new)
        if norm1 is None:
            norm1 = prepare_content(headline_new, text_new)
            self._set_cache(article_id_new, norm1)

        norm2 = self.norm_cache.get(article_id_approved)
        if norm2 is None:
            norm2 = prepare_content(headline_approved, text_approved)
            self._set_cache(article_id_approved, norm2)

        hash1 = sha1_from_normalized(norm1)
        hash2 = sha1_from_normalized(norm2)

        if hash1 == hash2 and hash1:
            return 1.0

        simhash1 = simhash_from_normalized(norm1)
        simhash2 = simhash_from_normalized(norm2)

        if simhash1 == 0 and simhash2 == 0:
            return 0.0

        distance = hamming_distance(simhash1, simhash2)
        return similarity_from_hamming(distance)

    def _set_cache(self, article_id: int, value: str) -> None:
        if len(self.norm_cache) >= self.config.cache_max_entries:
            self.logger.warning(
                "event=content_hash_cache_reset size=%s max=%s",
                len(self.norm_cache),
                self.config.cache_max_entries,
            )
            self.norm_cache.clear()
        self.norm_cache[article_id] = value
