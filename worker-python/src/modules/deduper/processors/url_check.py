"""URL check processor for deduper in-process pipeline."""

from __future__ import annotations

from urllib.parse import urlparse, urlunparse

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.repository import DeduperRepository


class UrlCheckProcessor:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)

    def execute(self, should_cancel=None) -> dict[str, int]:
        cancel_check = should_cancel or (lambda: False)
        records = self.repository.get_analysis_records_for_url_update()
        if not records:
            return {"processed": 0, "url_match_count": 0, "url_no_match_count": 0}

        batch_size = self.config.batch_size_url
        batch_updates: list[dict] = []
        processed = 0
        checkpoint_interval = self.config.checkpoint_interval

        self.logger.info("event=url_check_start total=%s", len(records))

        for record in records:
            if processed % checkpoint_interval == 0 and cancel_check():
                raise DeduperProcessorError("URL check processor cancelled")
            new_url = self.repository.get_article_url(record["articleIdNew"])
            approved_url = self.repository.get_article_url(record["articleIdApproved"])
            is_match = self._compare_urls(new_url, approved_url)

            batch_updates.append({"id": record["id"], "urlCheck": 1 if is_match else 0})
            processed += 1

            if len(batch_updates) >= batch_size:
                self.repository.update_analysis_url_check_batch(batch_updates)
                batch_updates = []

        if batch_updates:
            self.repository.update_analysis_url_check_batch(batch_updates)

        stats = self.repository.get_url_check_processing_stats()
        stats["processed"] = processed
        self.logger.info("event=url_check_complete processed=%s", processed)
        return stats

    def _compare_urls(self, url1: str | None, url2: str | None) -> bool:
        if url1 is None and url2 is None:
            return True
        if url1 is None or url2 is None:
            return False

        canonical1 = self._canonicalize_url(url1)
        canonical2 = self._canonicalize_url(url2)

        if canonical1 is None and canonical2 is None:
            return True
        if canonical1 is None or canonical2 is None:
            return False

        return canonical1 == canonical2

    def _canonicalize_url(self, url: str) -> str | None:
        if not url:
            return None

        parsed = urlparse(url.strip().lower())
        if not parsed.netloc:
            return None

        netloc = parsed.netloc
        if netloc.startswith("www."):
            netloc = netloc[4:]

        query_params: list[str] = []
        tracking_params = {
            "utm_source",
            "utm_medium",
            "utm_campaign",
            "utm_term",
            "utm_content",
            "fbclid",
            "gclid",
            "msclkid",
            "mc_cid",
            "mc_eid",
            "_ga",
            "ref",
        }

        if parsed.query:
            for param in parsed.query.split("&"):
                if "=" in param:
                    key = param.split("=")[0]
                    if key not in tracking_params:
                        query_params.append(param)

        path = parsed.path.rstrip("/") if parsed.path != "/" else ""

        return urlunparse(("https", netloc, path, parsed.params, "&".join(query_params), ""))
