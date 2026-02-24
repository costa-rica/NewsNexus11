import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.routes import deduper as deduper_routes


@pytest.mark.contract
def test_runtime_matches_min_contract(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        deduper_routes.job_manager,
        "start_deduper_job",
        lambda *args, **kwargs: None,
    )

    spec = json.loads(Path("tests/contracts/flask_contract_spec.json").read_text())

    with TestClient(app) as client:
        create_job_id = None
        for endpoint in spec["endpoints"]:
            method = endpoint["method"]
            path = endpoint["path"]
            if path == "/deduper/jobs/{job_id}":
                if create_job_id is None:
                    created = client.get("/deduper/jobs")
                    create_job_id = created.json()["jobId"]
                path = f"/deduper/jobs/{create_job_id}"

            if method == "GET":
                response = client.get(path)
            elif method == "POST":
                response = client.post(path, json={"ping": "pong"})
            else:
                pytest.fail(f"Unsupported method in contract: {method}")

            assert response.status_code == endpoint["expected_status"]

            if endpoint["required_json_keys"]:
                body = response.json()
                for required_key in endpoint["required_json_keys"]:
                    assert required_key in body
