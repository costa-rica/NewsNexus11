from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from threading import Condition, Event, Lock, Thread

from src.modules.queue.job_ids import get_next_job_id
from src.modules.queue.status import QueueStatusView, get_check_status_by_job_id, get_queue_status
from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobRecord, QueueJobStatus


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_error_message(error: Exception) -> str:
    message = str(error).strip()
    if message != "":
        return message

    return "job_failed"


class QueueJobCanceledError(Exception):
    """Raised when a running queue job exits because cancellation was requested."""


@dataclass(slots=True)
class QueueExecutionContext:
    jobId: str
    endpointName: str
    cancelEvent: Event

    def is_cancel_requested(self) -> bool:
        return self.cancelEvent.is_set()


QueueJobHandler = Callable[[QueueExecutionContext], None]


@dataclass(slots=True)
class EnqueueJobInput:
    endpointName: str
    run: QueueJobHandler
    parameters: dict[str, str | int | float | bool | None] | None = None


@dataclass(slots=True)
class EnqueueJobResult:
    jobId: str
    status: str


@dataclass(slots=True)
class CancelJobResult:
    jobId: str
    outcome: str


@dataclass(slots=True)
class PendingQueueItem:
    jobId: str
    endpointName: str
    run: QueueJobHandler
    parameters: dict[str, str | int | float | bool | None] | None


@dataclass(slots=True)
class ActiveJobState:
    jobId: str
    cancelEvent: Event
    cancelRequested: bool = False


class GlobalQueueEngine:
    def __init__(
        self,
        store: QueueJobStore,
        now: Callable[[], str] = utc_now_iso,
    ) -> None:
        self._store = store
        self._now = now
        self._state_lock = Lock()
        self._idle_condition = Condition(self._state_lock)
        self._pending_queue: list[PendingQueueItem] = []
        self._active_job: ActiveJobState | None = None
        self._worker_thread: Thread | None = None
        self._reconcile_incomplete_jobs()

    def enqueue_job(self, input_data: EnqueueJobInput) -> EnqueueJobResult:
        self._store.ensure_initialized()
        job_id = get_next_job_id([job.jobId for job in self._store.get_jobs()])
        now_iso = self._now()

        self._store.append_job(
                QueueJobRecord(
                    jobId=job_id,
                    endpointName=input_data.endpointName,
                    status=QueueJobStatus.QUEUED,
                    createdAt=now_iso,
                    parameters=input_data.parameters,
                    result=None,
                )
            )

        with self._state_lock:
            self._pending_queue.append(
                PendingQueueItem(
                    jobId=job_id,
                    endpointName=input_data.endpointName,
                    run=input_data.run,
                    parameters=input_data.parameters,
                )
            )
            self._ensure_worker_thread_locked()

        return EnqueueJobResult(jobId=job_id, status=QueueJobStatus.QUEUED.value)

    def get_check_status(self, job_id: str) -> QueueJobRecord | None:
        return get_check_status_by_job_id(self._store, job_id)

    def get_latest_job_by_endpoint_name(self, endpoint_name: str) -> QueueJobRecord | None:
        return self._store.get_latest_job_by_endpoint_name(endpoint_name)

    def get_queue_status_view(self) -> QueueStatusView:
        return get_queue_status(self._store)

    def cancel_job(self, job_id: str) -> CancelJobResult:
        with self._state_lock:
            queued_index = next(
                (
                    index
                    for index, pending_job in enumerate(self._pending_queue)
                    if pending_job.jobId == job_id
                ),
                None,
            )

            if queued_index is not None:
                self._pending_queue.pop(queued_index)
                self._store.update_job(
                    job_id,
                    lambda job: QueueJobRecord(
                        jobId=job.jobId,
                        endpointName=job.endpointName,
                        status=QueueJobStatus.CANCELED,
                        createdAt=job.createdAt,
                        startedAt=job.startedAt,
                        endedAt=self._now(),
                        failureReason="canceled_before_start",
                        logs=job.logs,
                        parameters=job.parameters,
                        result=job.result,
                    ),
                )
                self._notify_idle_waiters_locked()
                return CancelJobResult(jobId=job_id, outcome="canceled")

            if self._active_job is not None and self._active_job.jobId == job_id:
                self._active_job.cancelRequested = True
                self._active_job.cancelEvent.set()
                return CancelJobResult(jobId=job_id, outcome="cancel_requested")

        return CancelJobResult(jobId=job_id, outcome="not_found")

    def on_idle(self, timeout: float | None = None) -> bool:
        with self._idle_condition:
            if not self._pending_queue and self._active_job is None:
                return True

            self._idle_condition.wait_for(
                lambda: not self._pending_queue and self._active_job is None,
                timeout=timeout,
            )
            return not self._pending_queue and self._active_job is None

    def get_running_job_id(self) -> str | None:
        with self._state_lock:
            return self._active_job.jobId if self._active_job is not None else None

    def _ensure_worker_thread_locked(self) -> None:
        if self._worker_thread is not None and self._worker_thread.is_alive():
            return

        self._worker_thread = Thread(target=self._process_queue_loop, daemon=True)
        self._worker_thread.start()

    def _process_queue_loop(self) -> None:
        while True:
            with self._state_lock:
                if not self._pending_queue:
                    self._notify_idle_waiters_locked()
                    self._worker_thread = None
                    return

                next_item = self._pending_queue.pop(0)
                active_job = ActiveJobState(jobId=next_item.jobId, cancelEvent=Event())
                self._active_job = active_job

            self._execute_job(next_item, active_job)

            with self._state_lock:
                self._active_job = None
                self._notify_idle_waiters_locked()

    def _execute_job(self, item: PendingQueueItem, active_job: ActiveJobState) -> None:
        self._store.update_job(
            item.jobId,
            lambda job: QueueJobRecord(
                jobId=job.jobId,
                endpointName=job.endpointName,
                status=QueueJobStatus.RUNNING,
                createdAt=job.createdAt,
                startedAt=self._now(),
                endedAt=job.endedAt,
                failureReason=job.failureReason,
                logs=job.logs,
                parameters=job.parameters,
                result=job.result,
            ),
        )

        try:
            item.run(
                QueueExecutionContext(
                    jobId=item.jobId,
                    endpointName=item.endpointName,
                    cancelEvent=active_job.cancelEvent,
                )
            )

            if active_job.cancelRequested or active_job.cancelEvent.is_set():
                self._store.update_job(
                    item.jobId,
                    lambda job: QueueJobRecord(
                        jobId=job.jobId,
                        endpointName=job.endpointName,
                        status=QueueJobStatus.CANCELED,
                        createdAt=job.createdAt,
                        startedAt=job.startedAt,
                        endedAt=self._now(),
                        failureReason="cancel_requested",
                        logs=job.logs,
                        parameters=job.parameters,
                        result=job.result,
                    ),
                )
                return

            self._store.update_job(
                item.jobId,
                lambda job: QueueJobRecord(
                    jobId=job.jobId,
                    endpointName=job.endpointName,
                    status=QueueJobStatus.COMPLETED,
                    createdAt=job.createdAt,
                    startedAt=job.startedAt,
                    endedAt=self._now(),
                    failureReason=None,
                    logs=job.logs,
                    parameters=job.parameters,
                    result=job.result,
                ),
            )
        except QueueJobCanceledError:
            self._store.update_job(
                item.jobId,
                lambda job: QueueJobRecord(
                    jobId=job.jobId,
                    endpointName=job.endpointName,
                    status=QueueJobStatus.CANCELED,
                    createdAt=job.createdAt,
                    startedAt=job.startedAt,
                    endedAt=self._now(),
                    failureReason="cancel_requested",
                    logs=job.logs,
                    parameters=job.parameters,
                    result=job.result,
                ),
            )
        except Exception as error:
            self._store.update_job(
                item.jobId,
                lambda job: QueueJobRecord(
                    jobId=job.jobId,
                    endpointName=job.endpointName,
                    status=QueueJobStatus.FAILED,
                    createdAt=job.createdAt,
                    startedAt=job.startedAt,
                    endedAt=self._now(),
                    failureReason=_get_error_message(error),
                    logs=job.logs,
                    parameters=job.parameters,
                    result=job.result,
                ),
            )

    def _reconcile_incomplete_jobs(self) -> None:
        self._store.ensure_initialized()
        jobs = self._store.get_jobs()
        incomplete_job_ids = [
            job.jobId
            for job in jobs
            if job.status in {QueueJobStatus.QUEUED, QueueJobStatus.RUNNING}
        ]

        for job_id in incomplete_job_ids:
            self._store.update_job(
                job_id,
                lambda job: QueueJobRecord(
                    jobId=job.jobId,
                    endpointName=job.endpointName,
                    status=QueueJobStatus.FAILED,
                    createdAt=job.createdAt,
                    startedAt=job.startedAt,
                    endedAt=self._now(),
                    failureReason="worker_restarted_before_completion",
                    logs=job.logs,
                    parameters=job.parameters,
                    result=job.result,
                ),
            )

    def _notify_idle_waiters_locked(self) -> None:
        if not self._pending_queue and self._active_job is None:
            self._idle_condition.notify_all()
