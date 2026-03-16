from __future__ import annotations

import json

import pytest

from src.modules.queue.engine import GlobalQueueEngine
from src.modules.queue.store import QueueJobStore
from src.services.job_manager import JobManager


def _create_job_manager(tmp_path) -> JobManager:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    engine = GlobalQueueEngine(store)
    return JobManager(queue_engine=engine, queue_store=store)


@pytest.mark.integration
def test_deduper_job_queue_flow_persists_and_is_visible_via_queue_info(
    client, monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from src.routes import deduper as deduper_routes
    from src.routes import queue_info as queue_info_routes

    class _FakeSummary:
        status = "completed"

    class _FakeRepo:
        def close(self) -> None:
            return None

    class _FakeOrchestrator:
        def run_analyze_fast(self, report_id=None, should_cancel=None):
            assert report_id == 42
            assert should_cancel is not None
            return _FakeSummary()

    test_job_manager = _create_job_manager(tmp_path)
    monkeypatch.setattr(deduper_routes, "job_manager", test_job_manager)
    monkeypatch.setattr(queue_info_routes, "queue_engine", test_job_manager.queue_engine)
    monkeypatch.setattr(
        test_job_manager,
        "_create_orchestrator",
        lambda: (_FakeOrchestrator(), _FakeRepo()),
    )

    create_response = client.get("/deduper/jobs/reportId/42")
    assert create_response.status_code == 201
    job_id = create_response.json()["jobId"]
    assert isinstance(job_id, str)

    assert test_job_manager.wait_for_idle(timeout=1) is True

    latest_job_response = client.get(
        "/queue-info/latest-job",
        params={"endpointName": test_job_manager.DEDUPER_ENDPOINT_NAME},
    )
    assert latest_job_response.status_code == 200
    latest_job = latest_job_response.json()["job"]
    assert latest_job["jobId"] == job_id
    assert latest_job["status"] == "completed"

    persisted = json.loads(
        (tmp_path / "worker-python" / "queue-jobs.json").read_text(encoding="utf-8")
    )
    assert persisted["jobs"][0]["jobId"] == job_id
    assert persisted["jobs"][0]["endpointName"] == test_job_manager.DEDUPER_ENDPOINT_NAME
    assert persisted["jobs"][0]["parameters"]["reportId"] == 42
    assert persisted["jobs"][0]["result"]["exitCode"] == 0
