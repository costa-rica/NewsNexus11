from __future__ import annotations

import json

import pytest

from src.modules.queue.errors import QueueStoreError
from src.modules.queue.store import QueueJobStore
from src.modules.queue.types import QueueJobRecord, QueueJobStatus


def _build_job(
    job_id: str,
    endpoint_name: str = "/deduper/start-job",
    created_at: str = "2026-03-15T00:00:00Z",
) -> QueueJobRecord:
    return QueueJobRecord(
        jobId=job_id,
        endpointName=endpoint_name,
        status=QueueJobStatus.QUEUED,
        createdAt=created_at,
    )


@pytest.mark.unit
def test_job_store_initializes_missing_directory_and_file(tmp_path) -> None:
    store_path = tmp_path / "utilities" / "worker-python" / "queue-jobs.json"
    store = QueueJobStore(store_path)

    store.ensure_initialized()

    assert store_path.exists() is True
    assert json.loads(store_path.read_text(encoding="utf-8")) == {"jobs": []}


@pytest.mark.unit
def test_job_store_append_and_get_job_by_id(tmp_path) -> None:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    store.ensure_initialized()

    queued_job = _build_job("0001")
    store.append_job(queued_job)

    stored_job = store.get_job_by_id("0001")

    assert stored_job is not None
    assert stored_job.jobId == "0001"
    assert stored_job.status == QueueJobStatus.QUEUED


@pytest.mark.unit
def test_job_store_update_job_persists_changes(tmp_path) -> None:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    store.ensure_initialized()
    store.append_job(_build_job("0001"))

    updated_job = store.update_job(
        "0001",
        lambda existing_job: QueueJobRecord(
            jobId=existing_job.jobId,
            endpointName=existing_job.endpointName,
            status=QueueJobStatus.RUNNING,
            createdAt=existing_job.createdAt,
            startedAt="2026-03-15T00:01:00Z",
        ),
    )

    assert updated_job is not None
    assert updated_job.status == QueueJobStatus.RUNNING
    assert updated_job.startedAt == "2026-03-15T00:01:00Z"

    persisted = json.loads(store.file_path.read_text(encoding="utf-8"))
    assert persisted["jobs"][0]["status"] == "running"
    assert persisted["jobs"][0]["startedAt"] == "2026-03-15T00:01:00Z"


@pytest.mark.unit
def test_job_store_writes_atomic_file_without_leaving_temp_files(tmp_path) -> None:
    store_dir = tmp_path / "worker-python"
    store = QueueJobStore(store_dir / "queue-jobs.json")
    store.ensure_initialized()

    store.append_job(_build_job("0001"))

    temp_files = list(store_dir.glob("queue-jobs.json.*.tmp"))
    assert temp_files == []


@pytest.mark.unit
def test_job_store_invalid_json_raises_queue_store_error(tmp_path) -> None:
    store_path = tmp_path / "worker-python" / "queue-jobs.json"
    store_path.parent.mkdir(parents=True, exist_ok=True)
    store_path.write_text("{not-json", encoding="utf-8")

    store = QueueJobStore(store_path)

    with pytest.raises(QueueStoreError, match="Queue job store contains invalid JSON"):
        store.get_jobs()
