import sqlite3

import pytest

from src.modules.queue.engine import GlobalQueueEngine
from src.modules.queue.store import QueueJobStore
from src.services.job_manager import JobManager, JobStatus


def _create_job_manager(tmp_path) -> JobManager:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    engine = GlobalQueueEngine(store)
    return JobManager(queue_engine=engine, queue_store=store)


@pytest.mark.unit
def test_enqueue_deduper_job_defaults(tmp_path) -> None:
    job_manager = _create_job_manager(tmp_path)

    response = job_manager.enqueue_deduper_job()

    assert response["jobId"] == "0001"
    assert response["status"] == "queued"
    assert "reportId" not in response


@pytest.mark.unit
def test_cancel_missing_job(tmp_path) -> None:
    job_manager = _create_job_manager(tmp_path)

    ok, message = job_manager.cancel_job(999)

    assert ok is False
    assert message == "Job not found"


@pytest.mark.unit
def test_clear_table_missing_env_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    from src.services.job_manager import job_manager

    monkeypatch.delenv("PATH_DATABASE", raising=False)
    monkeypatch.delenv("NAME_DB", raising=False)

    with pytest.raises(Exception, match="PATH_DATABASE is required"):
        job_manager.run_clear_table()


@pytest.mark.unit
def test_health_unhealthy_when_database_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    from src.services.job_manager import job_manager

    monkeypatch.setenv("PATH_DATABASE", "/tmp/path/that/does/not/exist")
    monkeypatch.setenv("NAME_DB", "missing.db")

    summary = job_manager.health_summary()

    assert summary["status"] == "unhealthy"
    assert summary["environment"]["database_exists"] is False


@pytest.mark.unit
def test_run_deduper_job_uses_in_process_orchestrator(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
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

    job_manager = _create_job_manager(tmp_path)

    monkeypatch.setattr(
        job_manager,
        "_create_orchestrator",
        lambda: (_FakeOrchestrator(), _FakeRepo()),
    )

    response = job_manager.enqueue_deduper_job(report_id=42)
    assert job_manager.wait_for_idle(timeout=1) is True
    updated = job_manager.get_job(str(response["jobId"]))

    assert updated is not None
    assert updated.status == JobStatus.COMPLETED
    assert updated.exit_code == 0
    assert any("event=job_completed" in line for line in updated.logs)


@pytest.mark.unit
def test_run_clear_table_in_process_success(monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    from src.services.job_manager import job_manager

    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_file))
    conn.execute("CREATE TABLE ArticleDuplicateAnalyses (id INTEGER PRIMARY KEY AUTOINCREMENT)")
    conn.execute("INSERT INTO ArticleDuplicateAnalyses DEFAULT VALUES")
    conn.commit()
    conn.close()

    monkeypatch.setenv("PATH_DATABASE", str(tmp_path))
    monkeypatch.setenv("NAME_DB", "test.db")

    response = job_manager.run_clear_table()
    assert response["cleared"] is True
    assert response["exitCode"] == 0
