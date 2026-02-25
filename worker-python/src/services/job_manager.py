from __future__ import annotations

import os
import threading
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import StrEnum
from pathlib import Path
from typing import Any

from src.modules.deduper.config import DeduperConfig
from src.modules.deduper.logging_adapter import get_deduper_logger
from src.modules.deduper.orchestrator import DeduperOrchestrator
from src.modules.deduper.repository import DeduperRepository


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class JobRecord:
    id: int
    status: JobStatus
    created_at: str
    logs: list[str] = field(default_factory=list)
    report_id: int | None = None
    started_at: str | None = None
    completed_at: str | None = None
    exit_code: int | None = None
    stdout: str | None = None
    stderr: str | None = None
    error: str | None = None
    cancel_requested: bool = False


class JobManager:
    def __init__(self) -> None:
        self.jobs: dict[int, JobRecord] = {}
        self.job_counter = 1
        self.lock = threading.Lock()
        self.logger = get_deduper_logger(__name__)

    def create_job(self, report_id: int | None = None) -> JobRecord:
        with self.lock:
            job_id = self.job_counter
            self.job_counter += 1
            job = JobRecord(
                id=job_id,
                status=JobStatus.PENDING,
                created_at=utc_now_iso(),
                report_id=report_id,
            )
            self.jobs[job_id] = job
            self._append_job_log(job, "job_created")
            return job

    def get_job(self, job_id: int) -> JobRecord | None:
        return self.jobs.get(job_id)

    def list_jobs(self) -> list[dict[str, Any]]:
        return [
            {"jobId": job.id, "status": job.status, "createdAt": job.created_at}
            for job in self.jobs.values()
        ]

    def _create_orchestrator(self) -> tuple[DeduperOrchestrator, DeduperRepository]:
        config = DeduperConfig.from_env()
        repository = DeduperRepository(config)
        orchestrator = DeduperOrchestrator(repository, config)
        return orchestrator, repository

    def _run_deduper_job(self, job_id: int, report_id: int | None = None) -> None:
        job = self.get_job(job_id)
        if job is None:
            return

        try:
            job.status = JobStatus.RUNNING
            job.started_at = utc_now_iso()
            self._append_job_log(job, "job_started")
            orchestrator, repository = self._create_orchestrator()
            try:
                summary = orchestrator.run_analyze_fast(
                    report_id=report_id,
                    should_cancel=lambda: bool(job.cancel_requested),
                )
            finally:
                repository.close()

            job.stdout = "Deduper processed in-process inside worker-python"
            job.stderr = ""
            job.exit_code = 0 if summary.status == "completed" else 1
            job.completed_at = utc_now_iso()

            if summary.status == "cancelled" or job.cancel_requested:
                job.status = JobStatus.CANCELLED
                self._append_job_log(job, "job_cancelled")
            elif summary.status == "completed":
                job.status = JobStatus.COMPLETED
                self._append_job_log(job, "job_completed")
            else:
                job.status = JobStatus.FAILED
                self._append_job_log(job, "job_failed")

        except Exception as exc:
            if job.cancel_requested:
                job.status = JobStatus.CANCELLED
                self._append_job_log(job, "job_cancelled")
            else:
                job.status = JobStatus.FAILED
                self._append_job_log(job, f"job_failed error={exc}")
            job.error = str(exc)
            job.stderr = str(exc)
            job.exit_code = 1
            job.completed_at = utc_now_iso()

    def start_deduper_job(self, job_id: int, report_id: int | None = None) -> None:
        thread = threading.Thread(target=self._run_deduper_job, args=(job_id, report_id))
        thread.daemon = True
        thread.start()

    def cancel_job(self, job_id: int) -> tuple[bool, str]:
        job = self.get_job(job_id)
        if job is None:
            return False, "Job not found"

        if job.status not in {JobStatus.PENDING, JobStatus.RUNNING}:
            return False, f"Cannot cancel job with status: {job.status}"

        try:
            job.cancel_requested = True
            job.status = JobStatus.CANCELLED
            job.completed_at = utc_now_iso()
            self._append_job_log(job, "cancel_requested")
            return True, "Job cancelled successfully"
        except Exception as exc:
            return False, f"Failed to cancel job: {exc}"

    def health_summary(self) -> dict[str, Any]:
        path_to_database = os.getenv("PATH_DATABASE")
        name_db = os.getenv("NAME_DB")
        sqlite_path = (
            str(Path(path_to_database) / name_db)
            if path_to_database and name_db
            else None
        )

        checks: dict[str, Any] = {
            "status": "healthy",
            "timestamp": utc_now_iso(),
            "environment": {
                "path_database_configured": bool(path_to_database),
                "name_db_configured": bool(name_db),
            },
            "jobs": {
                "total": len(self.jobs),
                "pending": len([j for j in self.jobs.values() if j.status == JobStatus.PENDING]),
                "running": len([j for j in self.jobs.values() if j.status == JobStatus.RUNNING]),
                "completed": len([j for j in self.jobs.values() if j.status == JobStatus.COMPLETED]),
                "failed": len([j for j in self.jobs.values() if j.status == JobStatus.FAILED]),
                "cancelled": len([j for j in self.jobs.values() if j.status == JobStatus.CANCELLED]),
            },
        }

        if sqlite_path:
            checks["environment"]["database_exists"] = Path(sqlite_path).exists()
            if not checks["environment"]["database_exists"]:
                checks["status"] = "unhealthy"

        return checks

    def cancel_all_active_jobs(self) -> list[int]:
        cancelled_jobs: list[int] = []

        for job in self.jobs.values():
            if job.status in {JobStatus.PENDING, JobStatus.RUNNING}:
                try:
                    job.cancel_requested = True
                    job.status = JobStatus.CANCELLED
                    job.completed_at = utc_now_iso()
                    self._append_job_log(job, "cancelled_by_clear")
                    cancelled_jobs.append(job.id)
                except Exception:
                    # Preserve Flask behavior: continue cancelling other jobs.
                    continue

        return cancelled_jobs

    def run_clear_table(self) -> dict[str, Any]:
        cancelled_jobs = self.cancel_all_active_jobs()
        orchestrator, repository = self._create_orchestrator()
        try:
            response = orchestrator.run_clear_table(skip_confirmation=True)
        finally:
            repository.close()

        response["cancelledJobs"] = cancelled_jobs
        return response

    def _append_job_log(self, job: JobRecord, event: str) -> None:
        message = f"{utc_now_iso()} event={event} job_id={job.id} report_id={job.report_id}"
        job.logs.append(message)
        self.logger.info(message)


job_manager = JobManager()
