import os

import pytest

from src.services.job_manager import JobStatus, job_manager


@pytest.mark.unit
def test_create_job_defaults() -> None:
    job = job_manager.create_job()

    assert job.id == 1
    assert job.status == JobStatus.PENDING
    assert job.report_id is None


@pytest.mark.unit
def test_cancel_missing_job() -> None:
    ok, message = job_manager.cancel_job(999)

    assert ok is False
    assert message == "Job not found"


@pytest.mark.unit
def test_clear_table_missing_env_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PATH_TO_MICROSERVICE_DEDUPER", raising=False)
    monkeypatch.delenv("PATH_TO_PYTHON_VENV", raising=False)

    with pytest.raises(RuntimeError, match="Missing environment variables"):
        job_manager.run_clear_table()


@pytest.mark.unit
def test_health_unhealthy_when_deduper_path_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH_TO_MICROSERVICE_DEDUPER", "/tmp/path/that/does/not/exist")
    monkeypatch.setenv("PATH_TO_PYTHON_VENV", "/tmp/venv")

    summary = job_manager.health_summary()

    assert summary["status"] == "unhealthy"
    assert summary["environment"]["deduper_path_exists"] is False
