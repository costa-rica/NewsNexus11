from __future__ import annotations

import json
from pathlib import Path
from threading import Event
from time import sleep

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.modules.queue.engine import EnqueueJobInput, GlobalQueueEngine, QueueJobCanceledError
from src.modules.queue.store import QueueJobStore
from src.routes import queue_info as queue_info_routes


def _create_engine(tmp_path) -> GlobalQueueEngine:
    return GlobalQueueEngine(QueueJobStore(tmp_path / "worker-python" / "queue-jobs.json"))


@pytest.mark.contract
def test_queue_info_contract_spec_file_exists() -> None:
    spec_path = Path("tests/contracts/queue_info_contract_spec.json")
    assert spec_path.exists()


@pytest.mark.contract
def test_queue_info_contract_runtime_matches_spec(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path,
) -> None:
    engine = _create_engine(tmp_path)
    monkeypatch.setattr(queue_info_routes, "queue_engine", engine)

    release_event = Event()

    def blocking_job(context) -> None:
        release_event.wait(timeout=1)

    def cancellable_job(context) -> None:
        while not context.is_cancel_requested():
            sleep(0.01)
        raise QueueJobCanceledError()

    first_result = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=blocking_job)
    )
    second_result = engine.enqueue_job(
        EnqueueJobInput(endpointName="/deduper/start-job", run=cancellable_job)
    )

    spec = json.loads(Path("tests/contracts/queue_info_contract_spec.json").read_text())

    with TestClient(app) as client:
        for endpoint in spec["endpoints"]:
            path = endpoint["path"]
            if path == "/queue-info/check-status/{job_id}":
                path = f"/queue-info/check-status/{first_result.jobId}"
                response = client.get(path)
            elif path == "/queue-info/latest-job":
                response = client.get(path, params={"endpointName": "/deduper/start-job"})
            elif path == "/queue-info/queue-status":
                response = client.get(path)
            elif path == "/queue-info/cancel-job/{job_id}":
                path = f"/queue-info/cancel-job/{second_result.jobId}"
                response = client.post(path)
            else:
                pytest.fail(f"Unsupported contract path: {path}")

            assert response.status_code == endpoint["expected_status"]
            body = response.json()
            for required_key in endpoint["required_json_keys"]:
                assert required_key in body

    release_event.set()
    assert engine.on_idle(timeout=1) is True
