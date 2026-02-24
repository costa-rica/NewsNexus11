import pytest


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
def test_create_job_and_fetch_status(client, monkeypatch: pytest.MonkeyPatch) -> None:
    from src.routes import deduper as deduper_routes

    monkeypatch.setattr(
        deduper_routes.job_manager,
        "start_deduper_job",
        lambda *args, **kwargs: None,
    )

    create_response = client.get("/deduper/jobs")

    assert create_response.status_code == 201
    job_id = create_response.json()["jobId"]

    status_response = client.get(f"/deduper/jobs/{job_id}")

    assert status_response.status_code == 200
    body = status_response.json()
    assert body["jobId"] == job_id
    assert body["status"] == "pending"


@pytest.mark.integration
def test_cancel_unknown_job(client) -> None:
    response = client.post("/deduper/jobs/999/cancel")

    assert response.status_code == 404
    assert response.json()["error"] == "Job not found"


@pytest.mark.integration
def test_clear_db_table_missing_env_returns_500(client, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PATH_TO_MICROSERVICE_DEDUPER", raising=False)
    monkeypatch.delenv("PATH_TO_PYTHON_VENV", raising=False)

    response = client.delete("/deduper/clear-db-table")

    assert response.status_code == 500
    assert "Missing environment variables" in response.json()["error"]
