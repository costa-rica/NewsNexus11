# AGENT.md

This file provides guidance to engineers and AI agents working in `worker-python`.

## Purpose

`worker-python` is the in-process queueing and execution service for NewsNexus Python workflows.

The deduper workflow from NewsNexusDeduper02 is now absorbed internally under `src/modules/deduper` and is no longer executed as an external child process.

## Architecture map

1. API/runtime integration
- `src/routes/deduper.py`
- `src/services/job_manager.py`

2. Deduper orchestration
- `src/modules/deduper/orchestrator.py`
- `src/modules/deduper/types.py`
- `src/modules/deduper/errors.py`
- `src/modules/deduper/config.py`

3. Deduper data access
- `src/modules/deduper/repository.py`

4. Deduper processors
- `src/modules/deduper/processors/load.py`
- `src/modules/deduper/processors/states.py`
- `src/modules/deduper/processors/url_check.py`
- `src/modules/deduper/processors/content_hash.py`
- `src/modules/deduper/processors/embedding.py`

5. Utilities
- `src/modules/deduper/utils/csv_input.py`
- `src/modules/deduper/utils/text_norm.py`

## Runtime flow

1. API receives deduper request at:
- `GET /deduper/jobs`
- `GET /deduper/jobs/reportId/{report_id}`

2. `job_manager` creates queue job and runs deduper in a background thread.

3. `DeduperOrchestrator.run_analyze_fast(...)` executes in-process stages:
- `load`
- `states`
- `url_check`
- `embedding`

4. Job status and logs are available via:
- `GET /deduper/jobs/{job_id}`

## Environment variables

Required:

1. `PATH_DATABASE`
- Directory containing SQLite DB file.

2. `NAME_DB`
- SQLite DB filename.

Optional:

1. `PATH_TO_CSV`
- Used by load stage when no `report_id` is provided.

2. `DEDUPER_ENABLE_EMBEDDING`
- Enable/disable embedding stage.
- Default: `true`.

3. Batch tuning
- `DEDUPER_BATCH_SIZE_LOAD` (default `1000`)
- `DEDUPER_BATCH_SIZE_STATES` (default `1000`)
- `DEDUPER_BATCH_SIZE_URL` (default `1000`)
- `DEDUPER_BATCH_SIZE_CONTENT_HASH` (default `1000`)
- `DEDUPER_BATCH_SIZE_EMBEDDING` (default `100`)

4. Resilience and memory tuning
- `DEDUPER_CACHE_MAX_ENTRIES` (default `10000`)
- `DEDUPER_CHECKPOINT_INTERVAL` (default `250`)

Deprecated in runtime path:

1. `PATH_TO_MICROSERVICE_DEDUPER`
2. `PATH_TO_PYTHON_VENV`

## Operational guidance

1. Health and verification
- `GET /deduper/health`
- `GET /deduper/jobs/list`
- `GET /deduper/jobs/{job_id}`

2. Common issue: `job not found`
- Usually caused by polling status with `reportId` instead of `jobId`.
- Always poll `/deduper/jobs/{jobIdFromCreateResponse}`.

3. Common issue: completed job but no rows
- Validate source rows for report in `ArticleReportContracts`.
- Validate approved rows in `ArticleApproveds`.
- Validate worker points at expected DB file.

4. Cancellation behavior
- Cancellation is cooperative and uses checkpoint intervals.
- Processors check `should_cancel` between batches.

## Design rules for maintainers

1. Keep route handlers thin.
- Routes validate and dispatch only.

2. Keep SQL in repository layer.
- Processors should call repository methods, not raw SQL.

3. Keep processors stage-focused.
- One processor per stage.
- Limit side effects to stage-owned updates.

4. Keep caches bounded.
- Respect `cache_max_entries`.

5. Keep docs updated with code changes.
- Update `worker-python/docs/worker-python-api-documentation/*` when endpoint behavior changes.

## Troubleshooting and rollback

1. If deduper flow fails:
- Capture request and `jobId`.
- Capture `/deduper/jobs/{job_id}` payload including `logs`.
- Capture `/deduper/health`.
- Verify DB row counts before and after retry.

2. Rollback order:
- First prefer application-level mitigation in current worker.
- Next use commit-level rollback in `worker-python`.
- Use `worker-python-flask` fallback only when needed operationally.
