"""Load processor for deduper in-process pipeline."""

from __future__ import annotations

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository
from src.modules.deduper.utils.csv_input import read_article_ids_from_csv


class LoadProcessor:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)

    def execute(self, report_id: int | None = None) -> dict[str, int | bool]:
        if report_id is not None:
            new_article_ids = self.repository.get_article_ids_by_report_id(report_id)
        else:
            if not self.config.path_to_csv:
                raise DeduperProcessorError(
                    "PATH_TO_CSV is required when running load processor without report_id"
                )
            new_article_ids = read_article_ids_from_csv(self.config.path_to_csv)

        if not new_article_ids:
            return {"processed": 0, "new_articles": 0, "approved_articles": 0, "empty": True}

        approved_article_ids = self.repository.get_all_approved_article_ids()
        if not approved_article_ids:
            return {"processed": 0, "new_articles": len(new_article_ids), "approved_articles": 0, "empty": True}

        self.repository.clear_existing_analysis_for_articles(new_article_ids)

        batch_size = self.config.batch_size_load
        batch: list[dict] = []
        processed = 0

        for new_article_id in new_article_ids:
            for approved_article_id in approved_article_ids:
                batch.append(
                    {
                        "articleIdNew": new_article_id,
                        "articleIdApproved": approved_article_id,
                        "reportId": report_id,
                        "sameArticleIdFlag": 1 if new_article_id == approved_article_id else 0,
                        "articleNewState": "",
                        "articleApprovedState": "",
                        "sameStateFlag": 0,
                        "urlCheck": 0,
                        "contentHash": 0,
                        "embeddingSearch": 0,
                    }
                )
                processed += 1

                if len(batch) >= batch_size:
                    self.repository.insert_article_duplicate_analysis_batch(batch)
                    batch = []

        if batch:
            self.repository.insert_article_duplicate_analysis_batch(batch)

        return {
            "processed": processed,
            "new_articles": len(new_article_ids),
            "approved_articles": len(approved_article_ids),
            "empty": False,
        }
