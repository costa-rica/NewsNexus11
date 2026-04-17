import pytest
import sqlite3

from src.modules.queue.engine import GlobalQueueEngine
from src.modules.queue.store import QueueJobStore
from src.services.job_manager import JobManager


def _create_job_manager(tmp_path) -> JobManager:
    store = QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json")
    engine = GlobalQueueEngine(store)
    return JobManager(queue_engine=engine, queue_store=store)


@pytest.mark.integration
def test_home_route(client) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert "News Nexus Python Queuer 01" in response.text


@pytest.mark.integration
def test_test_route_echoes_json(client) -> None:
    payload = {"ok": True, "reportId": 42}

    response = client.post("/test", json=payload)

    assert response.status_code == 200
    assert response.json() == payload


@pytest.mark.integration
def test_create_job_and_fetch_status(client, monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    from src.routes import deduper as deduper_routes

    db_file = tmp_path / "test.db"
    sqlite3.connect(str(db_file)).close()
    monkeypatch.setenv("PATH_DATABASE", str(tmp_path))
    monkeypatch.setenv("NAME_DB", "test.db")

    test_job_manager = _create_job_manager(tmp_path)
    monkeypatch.setattr(
        deduper_routes.job_manager,
        "enqueue_deduper_job",
        test_job_manager.enqueue_deduper_job,
    )
    monkeypatch.setattr(deduper_routes, "job_manager", test_job_manager)

    create_response = client.get("/deduper/jobs")

    assert create_response.status_code == 201
    job_id = create_response.json()["jobId"]
    assert isinstance(job_id, str)
    assert create_response.json()["status"] == "queued"

    status_response = client.get(f"/deduper/jobs/{job_id}")

    assert status_response.status_code == 200
    body = status_response.json()
    assert body["jobId"] == job_id
    assert body["status"] in {"queued", "running"}


@pytest.mark.integration
def test_cancel_unknown_job(client) -> None:
    response = client.post("/deduper/jobs/999/cancel")

    assert response.status_code == 404
    assert response.json()["error"] == "Job not found"


@pytest.mark.integration
def test_clear_db_table_missing_env_returns_500(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PATH_DATABASE", raising=False)
    monkeypatch.delenv("NAME_DB", raising=False)

    response = client.delete("/deduper/clear-db-table")

    assert response.status_code == 500
    assert "PATH_DATABASE is required" in response.json()["error"]


@pytest.mark.integration
def test_clear_db_table_in_process_success(client, monkeypatch: pytest.MonkeyPatch, tmp_path) -> None:
    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_file))
    conn.execute("CREATE TABLE ArticleDuplicateAnalyses (id INTEGER PRIMARY KEY AUTOINCREMENT)")
    conn.execute("INSERT INTO ArticleDuplicateAnalyses DEFAULT VALUES")
    conn.commit()
    conn.close()

    monkeypatch.setenv("PATH_DATABASE", str(tmp_path))
    monkeypatch.setenv("NAME_DB", "test.db")

    response = client.delete("/deduper/clear-db-table")

    assert response.status_code == 200
    body = response.json()
    assert body["cleared"] is True
    assert body["exitCode"] == 0


@pytest.mark.integration
def test_report_job_runs_deduper_in_process_e2e(
    client, monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from src.routes import deduper as deduper_routes
    from src.routes import queue_info as queue_info_routes

    db_file = tmp_path / "test.db"
    conn = sqlite3.connect(str(db_file))
    conn.executescript(
        """
        CREATE TABLE Articles (
            id INTEGER PRIMARY KEY,
            url TEXT,
            title TEXT,
            description TEXT,
            publishedDate TEXT
        );
        CREATE TABLE ArticleApproveds (
            articleId INTEGER,
            isApproved INTEGER,
            headlineForPdfReport TEXT,
            textForPdfReport TEXT
        );
        CREATE TABLE ArticleReportContracts (
            articleId INTEGER,
            reportId INTEGER
        );
        CREATE TABLE States (
            id INTEGER PRIMARY KEY,
            abbreviation TEXT
        );
        CREATE TABLE ArticleStateContracts (
            articleId INTEGER,
            stateId INTEGER
        );
        CREATE TABLE ArticleDuplicateAnalyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            articleIdNew INTEGER,
            articleIdApproved INTEGER,
            reportId INTEGER,
            sameArticleIdFlag INTEGER,
            articleNewState TEXT DEFAULT '',
            articleApprovedState TEXT DEFAULT '',
            sameStateFlag INTEGER DEFAULT 0,
            urlCheck INTEGER DEFAULT 0,
            contentHash REAL DEFAULT 0,
            embeddingSearch REAL DEFAULT 0,
            createdAt TEXT,
            updatedAt TEXT
        );
        """
    )

    conn.executemany(
        "INSERT INTO Articles(id, url, title, description, publishedDate) VALUES(?, ?, ?, ?, ?)",
        [
            (1, "https://example.com/news?id=1", "T1", "D1", "2026-01-01"),
            (2, "https://example.com/news?id=2", "T2", "D2", "2026-01-02"),
        ],
    )
    conn.executemany(
        "INSERT INTO ArticleApproveds(articleId, isApproved, headlineForPdfReport, textForPdfReport) VALUES(?, ?, ?, ?)",
        [
            (1, 1, "H1", "match content"),
            (2, 1, "H2", "match content"),
        ],
    )
    conn.executemany(
        "INSERT INTO ArticleReportContracts(articleId, reportId) VALUES(?, ?)",
        [(1, 10)],
    )
    conn.executemany(
        "INSERT INTO States(id, abbreviation) VALUES(?, ?)",
        [(1, "CA"), (2, "CA")],
    )
    conn.executemany(
        "INSERT INTO ArticleStateContracts(articleId, stateId) VALUES(?, ?)",
        [(1, 1), (2, 2)],
    )
    conn.commit()
    conn.close()

    monkeypatch.setenv("PATH_DATABASE", str(tmp_path))
    monkeypatch.setenv("NAME_DB", "test.db")
    monkeypatch.setenv("DEDUPER_ENABLE_EMBEDDING", "false")
    test_job_manager = _create_job_manager(tmp_path)
    monkeypatch.setattr(deduper_routes, "job_manager", test_job_manager)
    monkeypatch.setattr(queue_info_routes, "queue_engine", test_job_manager.queue_engine)

    create_response = client.get("/deduper/jobs/reportId/10")
    assert create_response.status_code == 201
    job_id = create_response.json()["jobId"]
    assert isinstance(job_id, str)

    assert test_job_manager.wait_for_idle(timeout=2) is True

    status_response = client.get(f"/deduper/jobs/{job_id}")
    assert status_response.status_code == 200
    body = status_response.json()
    assert body["status"] == "completed"
    assert body["exitCode"] == 0


@pytest.mark.integration
def test_deduper_job_is_visible_through_queue_info_latest_job(
    client, monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    from src.routes import deduper as deduper_routes
    from src.routes import queue_info as queue_info_routes

    test_job_manager = _create_job_manager(tmp_path)
    monkeypatch.setattr(deduper_routes, "job_manager", test_job_manager)
    monkeypatch.setattr(queue_info_routes, "queue_engine", test_job_manager.queue_engine)

    create_response = client.get("/deduper/jobs")
    assert create_response.status_code == 201

    response = client.get(
        "/queue-info/latest-job",
        params={"endpointName": test_job_manager.DEDUPER_ENDPOINT_NAME},
    )

    assert response.status_code == 200
    assert response.json()["job"]["jobId"] == create_response.json()["jobId"]
