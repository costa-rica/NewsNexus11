import json
from pathlib import Path

import pytest


@pytest.mark.contract
def test_contract_spec_file_exists() -> None:
    spec_path = Path("tests/contracts/flask_contract_spec.json")
    assert spec_path.exists()


@pytest.mark.contract
def test_contract_spec_has_endpoints() -> None:
    spec = json.loads(Path("tests/contracts/flask_contract_spec.json").read_text())
    endpoints = spec.get("endpoints", [])

    assert endpoints
    for endpoint in endpoints:
        assert "path" in endpoint
        assert "method" in endpoint
        assert "expected_status" in endpoint
        assert "required_json_keys" in endpoint
