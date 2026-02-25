# Absorb NewsNexusDeduper02 into worker-python TODO

Goal: move deduper logic from the standalone NewsNexusDeduper02 microservice into `NewsNexus11/worker-python` so the worker executes deduper workflows in-process instead of spawning a child process.

## Current legacy components identified

1. Entry orchestration
- `src/main.py`
- Commands: `load`, `states`, `url_check`, `content_hash`, `embedding`, `analyze`, `analyze_fast`, `clear_table`

2. Processing modules
- `modules/load_processor.py`
- `modules/states_processor.py`
- `modules/url_check_processor.py`
- `modules/content_hash_processor.py`
- `modules/embedding_processor.py`

3. Data and utility modules
- `modules/database.py`
- `modules/csv_reader.py`
- `modules/logger.py`

4. Runtime dependencies
- `loguru`
- `python-dotenv`
- `sentence-transformers`
- `numpy`

## Target internal structure in worker-python

1. Create one dedicated internal package at the same level as `routes`
- Proposed path: `worker-python/src/modules/deduper/`

2. Suggested package layout
- `src/modules/deduper/orchestrator.py` for pipeline control
- `src/modules/deduper/repository.py` for SQL read/write operations
- `src/modules/deduper/processors/load.py`
- `src/modules/deduper/processors/states.py`
- `src/modules/deduper/processors/url_check.py`
- `src/modules/deduper/processors/content_hash.py`
- `src/modules/deduper/processors/embedding.py`
- `src/modules/deduper/utils/csv_input.py`
- `src/modules/deduper/utils/text_norm.py`
- `src/modules/deduper/config.py`
- `src/modules/deduper/types.py`

3. API integration boundary
- `src/routes/deduper.py` should call internal module functions directly
- Remove subprocess execution path once parity is verified

## Phase 1: inventory and compatibility contract

- [x] Catalog each legacy command and map to internal callable methods.
- [x] Capture all SQL operations used by legacy `database.py`.
- [x] Confirm field-level expectations for `ArticleDuplicateAnalyses` writes.
- [x] Define behavior parity for `analyze` and `analyze_fast`.
- [x] Confirm how `reportId` and CSV modes are selected in the new API.

Stop point 1 validation
- [x] Produce command-to-method mapping table.
- [x] Produce SQL parity checklist.
- [x] Review and approve parity checklist before implementation.

## Phase 2: scaffold internal deduper package

- [x] Create `src/modules/deduper/` package and subpackages.
- [x] Add configuration loader for required env vars.
- [x] Add typed domain models for job input, progress, and result summaries.
- [x] Add centralized error classes for recoverable and fatal conditions.
- [x] Add logging adapter that matches worker logging style.

Stop point 2 validation
- [x] Import checks pass for all package modules.
- [x] Unit tests for config and type validation pass.

## Phase 3: migrate repository and SQL access

- [x] Port DB connection and query methods from legacy `database.py`.
- [x] Normalize DB lifecycle handling for worker runtime.
- [x] Keep query semantics identical during initial migration.
- [x] Add tests for each repository method with representative fixtures.
- [x] Confirm performance-sensitive queries have equivalent indexes and limits.

Stop point 3 validation
- [x] Repository test suite passes.
- [x] SQL parity checklist marked complete.

## Phase 4: migrate processors as internal modules

1. Load processor
- [x] Port report-based article ID loading.
- [x] Port CSV-based article ID loading.
- [x] Port batch insert behavior and sameArticleIdFlag logic.

2. States processor
- [x] Port state lookup and sameStateFlag calculation.
- [x] Port batch update and state summary stats.

3. URL check processor
- [x] Port URL canonicalization rules and comparison behavior.
- [x] Port batch update and URL summary stats.

4. Content hash processor
- [x] Port normalization, SHA-1, SimHash, and similarity scoring.
- [x] Keep cache behavior for repeated article IDs.
- [x] Preserve 0.0 to 1.0 continuous score behavior.

5. Embedding processor
- [x] Port model loading and embedding cache.
- [x] Port cosine similarity behavior and score clamping.
- [x] Add safeguards for environments where embedding model is unavailable.

Stop point 4 validation
- [x] Unit tests pass for each processor.
- [x] Golden-case fixtures confirm parity on known input pairs.

## Phase 5: orchestrator and route integration

- [ ] Implement internal pipeline orchestrator methods:
  - [ ] `run_load(report_id=None)`
  - [ ] `run_states()`
  - [ ] `run_url_check()`
  - [ ] `run_content_hash()`
  - [ ] `run_embedding()`
  - [ ] `run_analyze(report_id=None)`
  - [ ] `run_analyze_fast(report_id=None)`
  - [ ] `run_clear_table(skip_confirmation=True)`
- [ ] Update FastAPI deduper routes to call orchestrator directly.
- [ ] Keep existing API response contract stable.
- [ ] Add route tests that validate in-process execution flow.

Stop point 5 validation
- [ ] Contract tests for deduper endpoints pass.
- [ ] Integration tests confirm no subprocess calls remain.

## Phase 6: remove subprocess dependency path

- [ ] Remove legacy subprocess invocation from `worker-python/src/services/job_manager.py`.
- [ ] Keep job state transitions, cancellation, and health reporting intact.
- [ ] If needed, run deduper pipelines in managed worker threads/tasks in-process.
- [ ] Ensure `clear-db-table` uses internal service method, not shell command.

Stop point 6 validation
- [ ] No references to `PATH_TO_MICROSERVICE_DEDUPER` remain in runtime path.
- [ ] End-to-end deduper flow passes in local integration test.

## Phase 7: performance, resilience, and observability

- [ ] Add structured progress metrics per pipeline step.
- [ ] Add bounded caches and memory safety checks for large runs.
- [ ] Add timeout or cancellation checkpoints between step batches.
- [ ] Add failure-resume strategy for partially completed pipelines.

Stop point 7 validation
- [ ] Load test with representative article volume passes.
- [ ] Cancellation and retry behavior validated.

## Phase 8: docs and operational readiness

- [ ] Update endpoint docs for any request/response changes.
- [ ] Add internal module documentation for maintainers.
- [ ] Add runbook for deduper troubleshooting and rollback.
- [ ] Update `.env` docs with new required and deprecated variables.

Stop point 8 validation
- [ ] Documentation reviewed and aligned with implementation.
- [ ] Deployment checklist complete.

## Proposed environment variable transition

1. Keep
- `PATH_TO_DATABASE`
- `NAME_DB`

2. Deprecate after in-process migration
- `PATH_TO_MICROSERVICE_DEDUPER`
- `PATH_TO_PYTHON_VENV` (for deduper execution path)

3. Conditional for CSV mode
- `PATH_TO_CSV`

4. Add if needed
- `DEDUPER_ENABLE_EMBEDDING` for feature-flagging embedding stage
- `DEDUPER_BATCH_SIZE_LOAD`
- `DEDUPER_BATCH_SIZE_STATES`
- `DEDUPER_BATCH_SIZE_URL`
- `DEDUPER_BATCH_SIZE_CONTENT_HASH`
- `DEDUPER_BATCH_SIZE_EMBEDDING`

## Acceptance criteria

- [ ] Worker executes deduper pipeline internally without child process launch.
- [ ] Legacy deduper command behaviors are available via internal orchestrator methods.
- [ ] Existing worker API contract remains stable for `api/` integration.
- [ ] Tests include unit, integration, and contract coverage for absorbed functionality.
- [ ] Operational docs reflect new architecture and rollback plan.

## Suggested implementation order

1. Repository and config foundation
2. Load, states, and URL processors
3. Content hash processor
4. Embedding processor
5. Orchestrator integration with routes
6. Subprocess removal and cleanup

Summary: the safest path is to first reproduce legacy behavior inside a modular `src/modules/deduper` package, validate parity step-by-step with tests, and only then remove subprocess execution from the worker runtime path.
