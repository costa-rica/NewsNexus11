from __future__ import annotations

from threading import Event
from time import sleep

import pytest

from src.modules.queue.engine import EnqueueJobInput, GlobalQueueEngine, QueueJobCanceledError
from src.modules.queue.store import QueueJobStore


def _create_engine(tmp_path) -> GlobalQueueEngine:
    return GlobalQueueEngine(QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json"))


@pytest.fixture
def queue_engine_override(monkeypatch: pytest.MonkeyPatch, tmp_path):
    from src.routes import queue_info as queue_info_routes

    engine = _create_engine(tmp_path)
    monkeypatch.setattr(queue_info_routes, "queue_engine", engine)
    return engine


@pytest.mark.integration
def test_check_status_returns_job_by_id(client, queue_engine_override: GlobalQueueEngine) -> None:
    result = queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )
    assert queue_engine_override.on_idle(timeout=1) is True

    response = client.get(f"/queue-info/check-status/{result.jobId}")

    assert response.status_code == 200
    body = response.json()
    assert body["job"]["jobId"] == result.jobId
    assert body["job"]["status"] == "completed"


@pytest.mark.integration
def test_check_status_returns_404_for_unknown_job(client, queue_engine_override: GlobalQueueEngine) -> None:
    response = client.get("/queue-info/check-status/9999")

    assert response.status_code == 404
    assert response.json()["error"] == "Job not found: 9999"


@pytest.mark.integration
def test_latest_job_returns_latest_matching_job(client, queue_engine_override: GlobalQueueEngine) -> None:
    queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )
    assert queue_engine_override.on_idle(timeout=1) is True
    second_result = queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )
    assert queue_engine_override.on_idle(timeout=1) is True

    response = client.get("/queue-info/latest-job", params={"endpointName": "/deduper/start-job"})

    assert response.status_code == 200
    assert response.json()["job"]["jobId"] == second_result.jobId


@pytest.mark.integration
def test_latest_job_returns_400_when_endpoint_name_missing(
    client, queue_engine_override: GlobalQueueEngine
) -> None:
    response = client.get("/queue-info/latest-job")

    assert response.status_code == 400
    assert response.json()["error"] == "endpointName query parameter is required"


@pytest.mark.integration
def test_queue_status_returns_summary_running_and_queued_jobs(
    client, queue_engine_override: GlobalQueueEngine
) -> None:
    release_event = Event()

    def blocking_job(context) -> None:
        release_event.wait(timeout=1)

    first_result = queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=blocking_job)
    )
    second_result = queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=lambda context: None)
    )

    response = client.get("/queue-info/queue-status")

    assert response.status_code == 200
    body = response.json()
    assert body["summary"]["totalJobs"] == 2
    assert body["summary"]["running"] == 1
    assert body["summary"]["queued"] == 1
    assert body["runningJob"]["jobId"] == first_result.jobId
    assert body["queuedJobs"][0]["jobId"] == second_result.jobId

    release_event.set()
    assert queue_engine_override.on_idle(timeout=1) is True


@pytest.mark.integration
def test_cancel_job_returns_cancel_requested_for_running_job(
    client, queue_engine_override: GlobalQueueEngine
) -> None:
    started_event = Event()

    def cancellable_job(context) -> None:
        started_event.set()
        while not context.is_cancel_requested():
            sleep(0.01)
        raise QueueJobCanceledError()

    result = queue_engine_override.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=cancellable_job)
    )
    assert started_event.wait(timeout=1) is True

    response = client.post(f"/queue-info/cancel-job/{result.jobId}")

    assert response.status_code == 200
    assert response.json()["jobId"] == result.jobId
    assert response.json()["outcome"] == "cancel_requested"
    assert queue_engine_override.on_idle(timeout=1) is True


@pytest.mark.integration
def test_cancel_job_returns_404_for_unknown_job(
    client, queue_engine_override: GlobalQueueEngine
) -> None:
    response = client.post("/queue-info/cancel-job/9999")

    assert response.status_code == 404
    assert response.json()["error"] == "Job not found: 9999"
