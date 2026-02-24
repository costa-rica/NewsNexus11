# FastAPI transition requirements and TODO

Goal: replace the current Flask worker service with a FastAPI service while preserving endpoint behavior required by the main `api/` service and upcoming AI-agent workflows.

## Scope and constraints

- [ ] Keep legacy Flask app available in `worker-python-flask/` until cutover.
- [ ] Build new implementation in `worker-python/`.
- [ ] Prioritize API parity for deduper queueing and operational stability.
- [ ] Keep shared SQLite and existing microservice scripts unchanged in phase 1.

## Python testing stack for this migration

- [ ] Primary test runner: `pytest`
- [ ] API integration tests: `fastapi.testclient.TestClient` (or `httpx` with ASGI transport)
- [ ] Async behavior tests: `pytest-asyncio`
- [ ] Mocking subprocess and env dependencies: `pytest-mock` or `unittest.mock`
- [ ] Coverage and quality gate: `pytest-cov` with minimum threshold
- [ ] Optional contract test layer: snapshot/parity assertions comparing Flask vs FastAPI JSON schema/keys

## Test directory layout (worker-python)

- [ ] Create `worker-python/tests/unit/` for job manager and service logic tests.
- [ ] Create `worker-python/tests/integration/` for route-level FastAPI tests.
- [ ] Create `worker-python/tests/contracts/` for Flask parity checks (status codes and required keys).
- [ ] Create `worker-python/tests/fixtures/` for reusable payloads and response samples.

## Standard terminal test commands

- [ ] Add `make test` for full suite + coverage.
- [ ] Add `make test-fast` for unit + integration quick checks.
- [ ] Add `make test-contract` for parity checks.
- [ ] Add `make test-unit` and `make test-integration` for focused runs.

## Phase 1: inventory and parity contract

- [ ] Freeze Flask API contract and runtime behavior.
- [ ] Preserve these endpoints:
  - [ ] `GET /`
  - [ ] `GET /test`
  - [ ] `GET /deduper/jobs`
  - [ ] `GET /deduper/jobs/reportId/{report_id}`
  - [ ] `GET /deduper/jobs/{job_id}`
  - [ ] `POST /deduper/jobs/{job_id}/cancel`
  - [ ] `GET /deduper/jobs/list`
  - [ ] `GET /deduper/health`
  - [ ] `DELETE /deduper/clear-db-table`
- [ ] Capture status codes and payload fields for each endpoint.
- [ ] Confirm `api/` caller dependencies.
- [ ] Identify all `api/` calls into worker endpoints and required response fields.
- [ ] Define compatibility decisions.
- [ ] Keep route paths unchanged for low-friction integration.
- [ ] Keep JSON keys stable unless `api/` changes in same PR.

Stop point A test gate:
- [ ] Create parity matrix document from Flask behavior.
- [ ] Add baseline contract tests that fail if required keys/status codes drift.
- [ ] Run: `pytest -q tests/contracts`

## Phase 2: FastAPI core implementation

- [ ] Create app foundation (`src/main.py`, route modules, config).
- [ ] Load environment variables from `.env`.
- [ ] Add Pydantic models for job responses and errors.
- [ ] Standardize UTC timestamp fields.
- [ ] Create job manager service module.
- [ ] Encapsulate subprocess launch, lifecycle, cancellation, and status mapping.
- [ ] Implement index routes (`/`, `/test`).
- [ ] Implement full deduper route set with parity behavior.

Stop point B test gate:
- [ ] Unit test job manager lifecycle transitions.
- [ ] Unit test missing env var and subprocess failure paths.
- [ ] Unit test cancel behavior for pending/running/completed jobs.
- [ ] Run: `pytest -q tests/unit`

## Phase 3: reliability and observability

- [ ] Add structured logs for enqueue, start, complete, fail, cancel.
- [ ] Include job ID and report ID in lifecycle logs.
- [ ] Validate environment paths before job launch.
- [ ] Add subprocess timeout policy where needed.
- [ ] Ensure cancel and kill semantics are deterministic.
- [ ] Keep deduper configuration health checks.
- [ ] Add active job count metrics in health response.

Stop point C test gate:
- [ ] Add tests for timeout and cancellation determinism.
- [ ] Add tests for health endpoint and env validation branches.
- [ ] Run: `pytest -q tests/unit tests/integration/test_health.py`

## Phase 4: API parity and integration tests

- [ ] API tests for success and failure cases for each endpoint.
- [ ] Validate payload keys and status codes against Flask baseline.
- [ ] Add regression tests for `api/` integration calls.
- [ ] Verify response compatibility for consumer code in `api/`.

Stop point D test gate:
- [ ] Run route-level suite: `pytest -q tests/integration`
- [ ] Run full suite with coverage: `pytest --cov=src --cov-report=term-missing`
- [ ] Enforce minimum coverage target (suggested initial threshold: 80%).

## Phase 5: cutover and rollback readiness

- [ ] Run FastAPI worker locally with `api/` and shared database.
- [ ] Verify end-to-end deduper trigger flow.
- [ ] Update deployment startup command from Flask to Uvicorn.
- [ ] Update environment and process-manager configuration.
- [ ] Keep rollback path to `worker-python-flask/`.
- [ ] Perform staged rollout and monitor job failure and timeout rates.

Stop point E release gate:
- [ ] Smoke test in staging environment.
- [ ] Execute rollback drill once and document results.
- [ ] Obtain sign-off that `api/` integrations are stable.

## Definition of done

- [ ] All required Flask endpoints are implemented in FastAPI with agreed compatibility.
- [ ] Automated tests pass for job manager and API endpoints.
- [ ] `api/` triggers deduper flows successfully against FastAPI worker.
- [ ] Operational docs are updated for run, deploy, monitor, and rollback.
