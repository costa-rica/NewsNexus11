"""Embedding processor for deduper in-process pipeline."""

from __future__ import annotations

import re
from typing import Any

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository

try:
    import numpy as np
except ImportError:  # pragma: no cover
    np = None  # type: ignore

try:
    from sentence_transformers import SentenceTransformer
except ImportError:  # pragma: no cover
    SentenceTransformer = None  # type: ignore


class EmbeddingProcessor:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)
        self.model: Any = None
        self.embedding_cache: dict[int, Any] = {}

    def execute(self, should_cancel=None) -> dict[str, Any]:
        cancel_check = should_cancel or (lambda: False)
        if not self.config.enable_embedding:
            return {"processed": 0, "status": "skipped", "reason": "embedding disabled"}

        if SentenceTransformer is None or np is None:
            raise DeduperProcessorError(
                "Embedding stage requires sentence-transformers and numpy, "
                "but one or both are not installed."
            )

        self._load_model()

        records = self.repository.get_analysis_records_for_embedding_update()
        if not records:
            return {
                "processed": 0,
                "status": "ok",
                "high_similarity_count": 0,
                "medium_similarity_count": 0,
                "low_similarity_count": 0,
            }

        batch_size = self.config.batch_size_embedding
        updates: list[dict] = []
        processed = 0
        checkpoint_interval = self.config.checkpoint_interval
        self.logger.info("event=embedding_start total=%s", len(records))

        for record in records:
            if processed % checkpoint_interval == 0 and cancel_check():
                raise DeduperProcessorError("Embedding processor cancelled")
            new_content = self.repository.get_article_content(record["articleIdNew"])
            approved_content = self.repository.get_article_content(record["articleIdApproved"])
            similarity = self._calculate_semantic_similarity(
                record["articleIdNew"],
                new_content,
                record["articleIdApproved"],
                approved_content,
            )
            updates.append({"id": record["id"], "embeddingSearch": similarity})
            processed += 1

            if len(updates) >= batch_size:
                self.repository.update_analysis_embedding_batch(updates)
                updates = []

        if updates:
            self.repository.update_analysis_embedding_batch(updates)

        stats = self.repository.get_embedding_processing_stats()
        stats["processed"] = processed
        stats["status"] = "ok"
        self.logger.info("event=embedding_complete processed=%s", processed)
        return stats

    def _load_model(self) -> None:
        if self.model is not None:
            return
        try:
            self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
            self.model.max_seq_length = 256
        except Exception as exc:  # pragma: no cover
            raise DeduperProcessorError(f"Failed to load embedding model: {exc}") from exc

    def _preprocess_text(self, text: str | None) -> str:
        if not text:
            return ""
        cleaned = re.sub(r"<[^>]+>", " ", text)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned[:1000] if len(cleaned) > 1000 else cleaned

    def _get_or_compute_embedding(self, article_id: int, raw_text: str | None):
        if article_id in self.embedding_cache:
            return self.embedding_cache[article_id]

        processed_text = self._preprocess_text(raw_text)
        if not processed_text:
            embedding_dim = self.model.get_sentence_embedding_dimension()
            zero_embedding = np.zeros(embedding_dim, dtype=np.float32)
            self._set_cache(article_id, zero_embedding)
            return zero_embedding

        embedding = self.model.encode(
            [processed_text], normalize_embeddings=True, convert_to_numpy=True
        )[0]
        self._set_cache(article_id, embedding)
        return embedding

    def _calculate_semantic_similarity(
        self, article_id1: int, content1: str | None, article_id2: int, content2: str | None
    ) -> float:
        if content1 is None and content2 is None:
            return 1.0
        if content1 is None or content2 is None:
            return 0.0

        embedding1 = self._get_or_compute_embedding(article_id1, content1)
        embedding2 = self._get_or_compute_embedding(article_id2, content2)

        similarity = float(np.dot(embedding1, embedding2))
        return max(0.0, min(1.0, similarity))

    def _set_cache(self, article_id: int, value) -> None:
        if len(self.embedding_cache) >= self.config.cache_max_entries:
            self.logger.warning(
                "event=embedding_cache_reset size=%s max=%s",
                len(self.embedding_cache),
                self.config.cache_max_entries,
            )
            self.embedding_cache.clear()
        self.embedding_cache[article_id] = value
