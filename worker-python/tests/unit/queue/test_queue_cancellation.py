from __future__ import annotations

from threading import Event
from time import sleep

import pytest

from src.modules.queue.engine import EnqueueJobInput, GlobalQueueEngine, QueueJobCanceledError
from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobStatus


def _create_engine(tmp_path) -> GlobalQueueEngine:
    return GlobalQueueEngine(QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json"))


@pytest.mark.unit
def test_cancel_job_updates_queued_job_to_canceled(tmp_path) -> None:
    release_event = Event()

    def blocking_job(context) -> None:
        release_event.wait(timeout=1)

    engine = _create_engine(tmp_path)
    first_job = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=blocking_job)
    )
    second_job = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )

    cancel_result = engine.cancel_job(second_job.jobId)
    release_event.set()
    assert engine.on_idle(timeout=1) is True

    canceled_job = engine.get_check_status(second_job.jobId)
    first_completed = engine.get_check_status(first_job.jobId)

    assert cancel_result.outcome == "canceled"
    assert canceled_job is not None
    assert canceled_job.status == QueueJobStatus.CANCELED
    assert canceled_job.failureReason == "canceled_before_start"
    assert first_completed is not None
    assert first_completed.status == QueueJobStatus.COMPLETED


@pytest.mark.unit
def test_cancel_job_marks_running_job_as_canceled_when_handler_cooperates(tmp_path) -> None:
    started_event = Event()

    def cancellable_job(context) -> None:
        started_event.set()
        while not context.is_cancel_requested():
            sleep(0.01)
        raise QueueJobCanceledError()

    engine = _create_engine(tmp_path)
    result = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=cancellable_job)
    )

    assert started_event.wait(timeout=1) is True
    cancel_result = engine.cancel_job(result.jobId)
    assert engine.on_idle(timeout=1) is True

    canceled_job = engine.get_check_status(result.jobId)

    assert cancel_result.outcome == "cancel_requested"
    assert canceled_job is not None
    assert canceled_job.status == QueueJobStatus.CANCELED
    assert canceled_job.failureReason == "cancel_requested"
