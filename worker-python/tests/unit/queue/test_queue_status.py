from __future__ import annotations

import pytest

from src.modules.queue.engine import EnqueueJobInput, GlobalQueueEngine
from src.modules.queue.store import QueueJobStore


def _create_engine(tmp_path) -> GlobalQueueEngine:
    return GlobalQueueEngine(QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json"))


@pytest.mark.unit
def test_queue_engine_get_latest_job_by_endpoint_name(tmp_path) -> None:
    engine = _create_engine(tmp_path)
    engine.enqueue_job(EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None))
    assert engine.on_idle(timeout=1) is True
    second_result = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )
    assert engine.on_idle(timeout=1) is True

    latest_job = engine.get_latest_job_by_endpoint_name("/deduper/start-job")

    assert latest_job is not None
    assert latest_job.jobId == second_result.jobId


@pytest.mark.unit
def test_queue_engine_get_queue_status_view(tmp_path) -> None:
    engine = _create_engine(tmp_path)
    engine.enqueue_job(EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None))
    assert engine.on_idle(timeout=1) is True

    queue_status = engine.get_queue_status_view()

    assert queue_status.summary.totalJobs == 1
    assert queue_status.summary.completed == 1
    assert queue_status.summary.queued == 0
    assert queue_status.summary.running == 0
    assert queue_status.runningJob is None
    assert queue_status.queuedJobs == []
