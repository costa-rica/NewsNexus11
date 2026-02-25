import sqlite3

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
    monkeypatch.delenv("PATH_TO_DATABASE", raising=False)
    monkeypatch.delenv("NAME_DB", raising=False)

    with pytest.raises(Exception, match="PATH_TO_DATABASE is required"):
        job_manager.run_clear_table()


@pytest.mark.unit
def test_health_unhealthy_when_database_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PATH_TO_DATABASE", "/tmp/path/that/does/not/exist")
    monkeypatch.setenv("NAME_DB", "missing.db")

    summary = job_manager.health_summary()

    assert summary["status"] == "unhealthy"
    assert summary["environment"]["database_exists"] is False


@pytest.mark.unit
def test_run_deduper_job_uses_in_process_orchestrator(monkeypatch: pytest.MonkeyPatch) -> None:
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

    job = job_manager.create_job(report_id=42)

    monkeypatch.setattr(
        job_manager,
        "_create_orchestrator",
        lambda: (_FakeOrchestrator(), _FakeRepo()),
    )

    job_manager._run_deduper_job(job.id, report_id=42)
    updated = job_manager.get_job(job.id)

    assert updated is not None
    assert updated.status == JobStatus.COMPLETED
    assert updated.exit_code == 0
    assert any("event=job_completed" in line for line in updated.logs)


@pytest.mark.unit
def test_run_clear_table_in_process_success(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_file))
    conn.execute("CREATE TABLE ArticleDuplicateAnalyses (id INTEGER PRIMARY KEY AUTOINCREMENT)")
    conn.execute("INSERT INTO ArticleDuplicateAnalyses DEFAULT VALUES")
    conn.commit()
    conn.close()

    monkeypatch.setenv("PATH_TO_DATABASE", str(tmp_path))
    monkeypatch.setenv("NAME_DB", "test.db")

    response = job_manager.run_clear_table()
    assert response["cleared"] is True
    assert response["exitCode"] == 0
