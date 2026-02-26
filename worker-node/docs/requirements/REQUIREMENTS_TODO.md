# worker-node implementation todo

This document breaks implementation into phases with checklists. A task can be marked `[x]` only after related tests pass. After each phase passes all tests, commit before moving to the next phase.

## Implementation order

1. Project scaffolding and baseline
2. Configuration, logging, and error contracts
3. Queue domain model and JSON job store
4. In-process global queue engine
5. Queue-info routes
6. requestGoogleRss integration
7. semanticScorer integration
8. stateAssigner integration
9. db-models integration and startup wiring
10. Internal-only deployment safeguards and final hardening

## Phase 1: project scaffolding and baseline

- [x] Initialize `worker-node` as an ExpressJS + TypeScript project.
- [x] Add package scripts for `dev`, `build`, `start`, `test`, and `test:watch`.
- [x] Create baseline folder structure:
  - `src/`
  - `src/routes/`
  - `src/modules/`
  - `src/modules/queue/`
  - `src/modules/startup/`
  - `src/modules/jobs/`
  - `tests/`
  - `tests/helpers/`
  - `tests/routes/`
  - `tests/modules/`
- [x] Add `src/server.ts` and `src/app.ts` with app bootstrap and router mounting.
- [x] Mount an index/health route for smoke testing.
- [x] Ensure route module names follow camelCase naming convention.

Stop point validation
- [x] TypeScript build passes.
- [x] Smoke test proves app boots and health endpoint responds.

## Phase 2: configuration, logging, and error contracts

- [x] Implement env loader and validator for required `.env` keys:
  - `PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED`
  - `PATH_TO_SEMANTIC_SCORER_DIR`
  - `PATH_TO_LOGS`
  - `NODE_ENV`
  - `KEY_OPEN_AI`
  - `PATH_TO_SAVE_CHATGPT_RESPONSES`
  - `NAME_APP`
  - `NAME_DB`
  - `PATH_DATABASE`
- [x] Fail fast on startup when required env vars are missing.
- [x] Implement logging setup per `worker-node/docs/requirements/LOGGING_NODE_JS_V07.md`.
- [x] Implement shared API error shape per `worker-node/docs/requirements/ERROR_REQUIREMENTS.md`.
- [x] Add centralized error helpers and middleware.

Stop point validation
- [x] Tests confirm startup fails when required env vars are missing.
- [x] Tests confirm error response contract for at least one validation and one internal failure path.

## Phase 3: queue domain model and JSON job store

- [ ] Define queue/job types with statuses: `queued`, `running`, `completed`, `failed`, `canceled`.
- [ ] Define job record shape:
  - `jobId`
  - `endpointName`
  - `status`
  - `createdAt`
  - `startedAt` (optional)
  - `endedAt` (optional)
  - `failureReason` (optional)
- [ ] Create JSON persistence module for job records.
- [ ] Implement atomic JSON writes using temp file + rename.
- [ ] Implement serialized JSON access using one in-process lock/queue.
- [ ] Implement startup maintenance module:
  - mark stale `queued` or `running` jobs as `failed`
  - set `endedAt` on repaired jobs
  - set `failureReason` to `worker_restart`
  - prune records older than 30 days based on `createdAt`
- [ ] Add queue status/read helpers for `checkStatus` and `queueStatus`.

Stop point validation
- [ ] Module tests cover create/read/update job records and status transitions.
- [ ] Module tests prove atomic write logic and lock/serialized access behavior.
- [ ] Startup maintenance tests cover stale job repair and 30-day pruning.

## Phase 4: in-process global queue engine

- [ ] Implement one global FIFO queue engine with `concurrency = 1`.
- [ ] Add enqueue behavior used by all job-start endpoints.
- [ ] Add execution lifecycle transitions:
  - `queued` on enqueue
  - `running` with `startedAt` when execution begins
  - terminal status `completed`, `failed`, or `canceled` with `endedAt`
- [ ] Implement cancellation flow:
  - if queued: cancel immediately
  - if running: send `SIGTERM`, wait 10 seconds, then `SIGKILL` if still alive
- [ ] Ensure no automatic retry behavior on failures.
- [ ] Ensure all queue state updates are persisted to JSON.

Stop point validation
- [ ] Tests prove FIFO order and global single-concurrency behavior across mixed job types.
- [ ] Tests prove queued and running cancellation behavior.
- [ ] Tests prove no retry occurs after failure.

## Phase 5: queue-info routes

- [ ] Add route file `src/routes/queueInfo.ts`.
- [ ] Implement endpoints under `/queue-info`:
  - [ ] `check-status/:jobId`
  - [ ] `queue_status/`
  - [ ] `cancel_job/:jobId`
- [ ] Select and document HTTP methods used for each endpoint.
- [ ] Validate `jobId` parameter and return contract-consistent errors.

Stop point validation
- [ ] Route contract tests for success and not-found/error paths.
- [ ] Tests verify endpoint responses reflect JSON-backed queue state.

## Phase 6: requestGoogleRss integration

- [ ] Add route file `src/routes/requestGoogleRss.ts`.
- [ ] Implement `POST /request-google-rss/start-job`.
- [ ] Validate required input and verify spreadsheet path from `PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED`.
- [ ] Create job handler module under `src/modules/jobs/` using legacy behavior from:
  - `/Users/nick/Documents/NewsNexus10-OBE/NewsNexusRequesterGoogleRss04`
- [ ] Wire start endpoint to enqueue global queue job.
- [ ] Ensure endpoint returns job metadata (`jobId`, status, and route/job type info).

Stop point validation
- [ ] Route tests confirm enqueue behavior and response contract.
- [ ] Job module tests cover expected failure path when spreadsheet file is missing.

## Phase 7: semanticScorer integration

- [ ] Add route file `src/routes/semanticScorer.ts`.
- [ ] Implement `POST /semantic-scorer/start-job`.
- [ ] Use only `PATH_TO_SEMANTIC_SCORER_DIR` for scorer files and keyword workbook.
- [ ] Create job handler module under `src/modules/jobs/` using legacy behavior from:
  - `/Users/nick/Documents/NewsNexus10-OBE/NewsNexusSemanticScorer02`
- [ ] Apply per-iteration external request timeout:
  - max 10 seconds, or less if legacy microservice used a lower timeout
  - timeout should skip current iteration, continue process, and log timeout event
- [ ] Wire start endpoint to enqueue global queue job.

Stop point validation
- [ ] Route tests confirm enqueue behavior and response contract.
- [ ] Job module tests confirm timeout skip-and-continue behavior with logging.

## Phase 8: stateAssigner integration

- [ ] Add route file `src/routes/stateAssigner.ts`.
- [ ] Implement `POST /state-assigner/start-job`.
- [ ] Remove use of env vars `TARGET_ARTICLE_THRESHOLD_DAYS_OLD` and `TARGET_ARTICLE_STATE_REVIEW_COUNT`.
- [ ] Accept equivalent values in request body using camelCase fields.
- [ ] Create job handler module under `src/modules/jobs/` using legacy behavior from:
  - `/Users/nick/Documents/NewsNexus10-OBE/NewsNexusLlmStateAssigner01`
- [ ] Apply per-iteration external request timeout:
  - max 10 seconds, or less if legacy microservice used a lower timeout
  - timeout should skip current iteration, continue process, and log timeout event
- [ ] Wire start endpoint to enqueue global queue job.

Stop point validation
- [ ] Route tests confirm request validation and enqueue behavior.
- [ ] Job module tests confirm timeout skip-and-continue behavior.

## Phase 9: db-models integration and startup wiring

- [ ] Add db-models integration module and startup initialization flow.
- [ ] Ensure worker connects via internal `db-models` package and configured DB path vars.
- [ ] Run startup maintenance module before accepting requests.
- [ ] Confirm startup order:
  - env validation
  - logger initialization
  - db initialization
  - queue JSON maintenance (stale repair + prune)
  - route mount
  - app listen

Stop point validation
- [ ] Integration test confirms startup sequence and failure behavior on missing env/db issues.
- [ ] Integration test confirms stale job repair happens before route handling.

## Phase 10: internal-only deployment safeguards and final hardening

- [ ] Ensure worker service bind/listen configuration is internal-only (localhost/private network).
- [ ] Confirm no auth is added to worker routes per current requirements.
- [ ] Add defensive request validation for all start-job and queue-info routes.
- [ ] Add final end-to-end queue tests covering mixed job types and cancellation under load.
- [ ] Add/update docs:
  - route reference
  - queue state model
  - JSON file retention behavior
  - operational notes for cancel and timeout handling

Stop point validation
- [ ] Full test suite passes with `npm test`.
- [ ] TypeScript compile passes with `npm run build`.
- [ ] Final requirement parity checklist is complete.

## Acceptance checklist

- [ ] Global queue concurrency is fixed at 1 across all job types.
- [ ] Queue ordering is FIFO with no priority.
- [ ] Queue data is stored in JSON with atomic writes and serialized access.
- [ ] Startup marks stale `queued`/`running` jobs as `failed` with `endedAt` and `failureReason`.
- [ ] Job history older than 30 days is pruned by `createdAt`.
- [ ] Queue-info endpoints support status checks, queue status, and cancellation by `jobId`.
- [ ] Cancellation uses `SIGTERM -> wait 10s -> SIGKILL` for running jobs.
- [ ] No retries are performed on failed jobs.
- [ ] External request timeouts are per iteration and continue processing after timeout.
- [ ] Route files follow TypeScript camelCase naming convention.
- [ ] Logging and error responses align with requirement documents.

Summary: the implementation should prioritize a reliable single-process queue with deterministic state tracking in JSON, while preserving legacy job behavior and exposing clear operational controls through queue-info endpoints.
