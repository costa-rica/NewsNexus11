"""Classification processor for the location scorer pipeline."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from loguru import logger

from src.modules.location_scorer.config import LocationScorerConfig
from src.modules.location_scorer.errors import LocationScorerProcessorError
from src.modules.location_scorer.repository import LocationScorerRepository


US_LABEL = "Occurred in the United States"
NON_US_LABEL = "Occurred outside the United States"
CLASSIFICATION_LABELS = [US_LABEL, NON_US_LABEL]
_CLASSIFIER: Any | None = None


def _get_classifier() -> Any:
    global _CLASSIFIER
    if _CLASSIFIER is None:
        from transformers import pipeline

        _CLASSIFIER = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
        )
    return _CLASSIFIER


class ClassifyProcessor:
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
        articles: list[dict[str, Any]],
        should_cancel: Callable[[], bool] | None = None,
    ) -> dict[str, object]:
        cancel_check = should_cancel or (lambda: False)
        if not articles:
            return {"processed": 0, "scores": [], "skipped": 0}

        classifier = _get_classifier()
        processed = 0
        skipped = 0
        scores: list[dict[str, Any]] = []
        checkpoint_interval = self.config.checkpoint_interval

        self.logger.info(
            "event=location_scorer_classify_start total={}",
            len(articles),
        )

        for index, article in enumerate(articles, start=1):
            if index % checkpoint_interval == 0 and cancel_check():
                raise LocationScorerProcessorError("Classify processor cancelled")

            title = str(article.get("title") or "").strip()
            description = str(article.get("description") or "").strip()
            if title == "" and description == "":
                skipped += 1
                continue

            text = f"{title}\n\n{description}".strip()
            result = classifier(text, CLASSIFICATION_LABELS)
            labels = list(result["labels"])
            scores_raw = list(result["scores"])

            try:
                us_score = float(scores_raw[labels.index(US_LABEL)])
            except ValueError as exc:
                raise LocationScorerProcessorError(
                    "US label missing from classifier result"
                ) from exc

            scores.append(
                {
                    "article_id": int(article["id"]),
                    "score": us_score,
                    "rating_for": US_LABEL,
                }
            )
            processed += 1

        self.logger.info(
            "event=location_scorer_classify_complete processed={} skipped={}",
            processed,
            skipped,
        )

        return {"processed": processed, "scores": scores, "skipped": skipped}
