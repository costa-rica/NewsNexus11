"""Load processor for the location scorer pipeline."""

from __future__ import annotations

from collections.abc import Callable

from loguru import logger

from src.modules.location_scorer.config import LocationScorerConfig
from src.modules.location_scorer.errors import (
    LocationScorerConfigError,
    LocationScorerProcessorError,
)
from src.modules.location_scorer.repository import LocationScorerRepository


class LoadProcessor:
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
        limit: int | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> dict[str, object]:
        cancel_check = should_cancel or (lambda: False)
        if cancel_check():
            raise LocationScorerProcessorError("Load processor cancelled")

        entity_id = self.repository.get_entity_who_categorized_article_id(
            self.config.ai_entity_name
        )
        if entity_id is None:
            raise LocationScorerConfigError(
                f"AI entity not found: {self.config.ai_entity_name}"
            )

        articles = self.repository.get_unscored_articles(entity_id, limit=limit)
        if cancel_check():
            raise LocationScorerProcessorError("Load processor cancelled")

        self.logger.info(
            "event=location_scorer_load_complete entity_id={} articles={}",
            entity_id,
            len(articles),
        )

        return {
            "processed": len(articles),
            "entity_id": entity_id,
            "articles": articles,
        }
