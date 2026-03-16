from __future__ import annotations

from dataclasses import dataclass

from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobRecord, QueueJobStatus


@dataclass(slots=True)
class QueueStatusSummary:
    totalJobs: int
    queued: int
    running: int
    completed: int
    failed: int
    canceled: int


@dataclass(slots=True)
class QueueStatusView:
    summary: QueueStatusSummary
    runningJob: QueueJobRecord | None
    queuedJobs: list[QueueJobRecord]


def summarize_queue_jobs(jobs: list[QueueJobRecord]) -> QueueStatusSummary:
    return QueueStatusSummary(
        totalJobs=len(jobs),
        queued=len([job for job in jobs if job.status == QueueJobStatus.QUEUED]),
        running=len([job for job in jobs if job.status == QueueJobStatus.RUNNING]),
        completed=len([job for job in jobs if job.status == QueueJobStatus.COMPLETED]),
        failed=len([job for job in jobs if job.status == QueueJobStatus.FAILED]),
        canceled=len([job for job in jobs if job.status == QueueJobStatus.CANCELED]),
    )


def get_check_status_by_job_id(store: QueueJobStore, job_id: str) -> QueueJobRecord | None:
    return store.get_job_by_id(job_id)


def get_queue_status(store: QueueJobStore) -> QueueStatusView:
    jobs = store.get_jobs()
    running_job = next(
        (job for job in jobs if job.status == QueueJobStatus.RUNNING),
        None,
    )
    queued_jobs = [job for job in jobs if job.status == QueueJobStatus.QUEUED]

    return QueueStatusView(
        summary=summarize_queue_jobs(jobs),
        runningJob=running_job,
        queuedJobs=queued_jobs,
    )
