.PHONY: test test-fast test-unit test-integration test-contract

test:
	python -m pytest --cov=src --cov-report=term-missing

test-fast:
	python -m pytest -m "unit or integration"

test-unit:
	python -m pytest -m unit tests/unit

test-integration:
	python -m pytest -m integration tests/integration

test-contract:
	python -m pytest -m contract tests/contracts
