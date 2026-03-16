from __future__ import annotations

from threading import Event

import pytest

from src.modules.queue.engine import EnqueueJobInput, GlobalQueueEngine
from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobRecord, QueueJobStatus


def _create_engine(tmp_path) -> GlobalQueueEngine:
    return GlobalQueueEngine(QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json"))


@pytest.mark.unit
def test_enqueue_job_stores_initial_queued_status(tmp_path) -> None:
    release_event = Event()

    def run_job(context) -> None:
        release_event.wait(timeout=1)

    engine = _create_engine(tmp_path)
    result = engine.enqueue_job(EnqueueJobInput(endpointName="/deduper/start-job", run=run_job))

    initial_job = engine.get_check_status(result.jobId)

    assert result.status == "queued"
    assert initial_job is not None
    assert initial_job.jobId == "0001"
    assert initial_job.status in {QueueJobStatus.QUEUED, QueueJobStatus.RUNNING}

    release_event.set()
    assert engine.on_idle(timeout=1) is True


@pytest.mark.unit
def test_queue_engine_transitions_job_to_completed(tmp_path) -> None:
    engine = _create_engine(tmp_path)

    result = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )

    assert engine.on_idle(timeout=1) is True

    completed_job = engine.get_check_status(result.jobId)
    assert completed_job is not None
    assert completed_job.status == QueueJobStatus.COMPLETED
    assert completed_job.startedAt is not None
    assert completed_job.endedAt is not None


@pytest.mark.unit
def test_queue_engine_marks_job_failed_with_failure_reason(tmp_path) -> None:
    engine = _create_engine(tmp_path)

    def run_job(context) -> None:
        raise RuntimeError("deduper_failed")

    result = engine.enqueue_job(EnqueueJobInput(endpointName="/deduper/start-job", run=run_job))

    assert engine.on_idle(timeout=1) is True

    failed_job = engine.get_check_status(result.jobId)
    assert failed_job is not None
    assert failed_job.status == QueueJobStatus.FAILED
    assert failed_job.failureReason == "deduper_failed"


@pytest.mark.unit
def test_queue_engine_recovers_incomplete_jobs_after_restart(tmp_path) -> None:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    store.ensure_initialized()
    store.append_job(
        QueueJobRecord(
            jobId="0001",
            endpointName="/deduper/start-job",
            status=QueueJobStatus.QUEUED,
            createdAt="2026-03-15T00:00:00Z",
        )
    )

    engine = GlobalQueueEngine(store)
    recovered_job = engine.get_check_status("0001")

    assert recovered_job is not None
    assert recovered_job.status == QueueJobStatus.FAILED
    assert recovered_job.failureReason == "worker_restarted_before_completion"
