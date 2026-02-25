"""Deduper orchestration for in-process duplicate analysis pipelines."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.errors import DeduperProcessorError
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.processors.content_hash import ContentHashProcessor
from src.modules.deduper.processors.embedding import EmbeddingProcessor
from src.modules.deduper.processors.load import LoadProcessor
from src.modules.deduper.processors.states import StatesProcessor
from src.modules.deduper.processors.url_check import UrlCheckProcessor
from src.modules.deduper.repository import DeduperRepository
from src.modules.deduper.types import PipelineRunMode, PipelineStep, PipelineSummary, StepProgress


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class DeduperOrchestrator:
    def __init__(self, repository: DeduperRepository, config: DeduperConfig) -> None:
        self.repository = repository
        self.config = config
        self.logger = get_deduper_logger(__name__)

    def check_ready(self) -> bool:
        return self.repository.healthcheck()

    def new_summary(self, mode: PipelineRunMode) -> PipelineSummary:
        return PipelineSummary(mode=mode)

    def run_load(self, report_id: int | None = None) -> dict[str, Any]:
        return LoadProcessor(self.repository, self.config).execute(report_id=report_id)

    def run_states(self) -> dict[str, Any]:
        return StatesProcessor(self.repository, self.config).execute()

    def run_url_check(self) -> dict[str, Any]:
        return UrlCheckProcessor(self.repository, self.config).execute()

    def run_content_hash(self) -> dict[str, Any]:
        return ContentHashProcessor(self.repository, self.config).execute()

    def run_embedding(self) -> dict[str, Any]:
        return EmbeddingProcessor(self.repository, self.config).execute()

    def run_analyze(
        self,
        report_id: int | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> PipelineSummary:
        summary = self.new_summary(PipelineRunMode.ANALYZE)
        summary.report_id = report_id
        summary.status = "running"

        self.run_clear_table(skip_confirmation=True)
        steps = [
            (PipelineStep.LOAD, lambda: self.run_load(report_id=report_id)),
            (PipelineStep.STATES, self.run_states),
            (PipelineStep.URL_CHECK, self.run_url_check),
            (PipelineStep.CONTENT_HASH, self.run_content_hash),
            (PipelineStep.EMBEDDING, self.run_embedding),
        ]

        self._execute_pipeline_steps(summary, steps, should_cancel)
        return summary

    def run_analyze_fast(
        self,
        report_id: int | None = None,
        should_cancel: Callable[[], bool] | None = None,
    ) -> PipelineSummary:
        summary = self.new_summary(PipelineRunMode.ANALYZE_FAST)
        summary.report_id = report_id
        summary.status = "running"

        self.run_clear_table(skip_confirmation=True)
        steps = [
            (PipelineStep.LOAD, lambda: self.run_load(report_id=report_id)),
            (PipelineStep.STATES, self.run_states),
            (PipelineStep.URL_CHECK, self.run_url_check),
            (PipelineStep.EMBEDDING, self.run_embedding),
        ]

        self._execute_pipeline_steps(summary, steps, should_cancel)
        return summary

    def run_clear_table(self, skip_confirmation: bool = True) -> dict[str, Any]:
        _ = skip_confirmation
        rows_deleted = self.repository.clear_all_analysis_data()
        return {
            "cleared": True,
            "cancelledJobs": [],
            "exitCode": 0,
            "stdout": (
                f"Successfully deleted {rows_deleted} rows from "
                "ArticleDuplicateAnalyses table."
            ),
            "stderr": "",
            "timestamp": _utc_now_iso(),
        }

    def _execute_pipeline_steps(
        self,
        summary: PipelineSummary,
        steps: list[tuple[PipelineStep, Callable[[], dict[str, Any]]]],
        should_cancel: Callable[[], bool] | None,
    ) -> None:
        cancel_check = should_cancel or (lambda: False)

        try:
            for step, fn in steps:
                if cancel_check():
                    raise DeduperProcessorError("Pipeline cancelled")

                progress = StepProgress(
                    step=step,
                    status="running",
                    started_at=_utc_now_iso(),
                )
                summary.steps.append(progress)

                result = fn()

                progress.status = "completed"
                progress.completed_at = _utc_now_iso()
                progress.processed = int(result.get("processed", 0))
                progress.total = progress.processed
                progress.message = str(result)

            summary.status = "completed"
        except DeduperProcessorError:
            summary.status = "cancelled"
            raise
        except Exception:
            summary.status = "failed"
            raise
        finally:
            summary.completed_at = _utc_now_iso()
