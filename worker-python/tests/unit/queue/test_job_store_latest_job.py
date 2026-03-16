from __future__ import annotations

import pytest

from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobRecord, QueueJobStatus


def _build_job(job_id: str, endpoint_name: str, created_at: str) -> QueueJobRecord:
    return QueueJobRecord(
        jobId=job_id,
        endpointName=endpoint_name,
        status=QueueJobStatus.QUEUED,
        createdAt=created_at,
    )


@pytest.mark.unit
def test_get_latest_job_by_endpoint_name_returns_none_when_no_match(tmp_path) -> None:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    store.ensure_initialized()
    store.append_job(_build_job("0001", "/deduper/start-job", "2026-03-15T00:00:00Z"))

    latest_job = store.get_latest_job_by_endpoint_name("/location-scorer/start-job")

    assert latest_job is None


@pytest.mark.unit
def test_get_latest_job_by_endpoint_name_returns_newest_matching_job(tmp_path) -> None:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    store.ensure_initialized()
    store.append_job(_build_job("0001", "/deduper/start-job", "2026-03-15T00:00:00Z"))
    store.append_job(_build_job("0002", "/location-scorer/start-job", "2026-03-15T00:01:00Z"))
    store.append_job(_build_job("0003", "/deduper/start-job", "2026-03-15T00:02:00Z"))

    latest_job = store.get_latest_job_by_endpoint_name("/deduper/start-job")

    assert latest_job is not None
    assert latest_job.jobId == "0003"
    assert latest_job.createdAt == "2026-03-15T00:02:00Z"
