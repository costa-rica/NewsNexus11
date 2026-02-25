# Deduper command-to-method mapping

Purpose: map legacy `NewsNexusDeduper02` CLI commands to internal callable methods in `worker-python` for in-process execution.

## Legacy command mapping

1. `load`
- Legacy entry: `src/main.py` -> `LoadProcessor(report_id=...)`
- New internal target: `DeduperOrchestrator.run_load(report_id: int | None = None)`
- Notes: supports CSV mode when `report_id` is `None`; supports report mode when `report_id` is provided.

2. `states`
- Legacy entry: `src/main.py` -> `StatesProcessor()`
- New internal target: `DeduperOrchestrator.run_states()`

3. `url_check`
- Legacy entry: `src/main.py` -> `UrlCheckProcessor()`
- New internal target: `DeduperOrchestrator.run_url_check()`

4. `content_hash`
- Legacy entry: `src/main.py` -> `ContentHashProcessor()`
- New internal target: `DeduperOrchestrator.run_content_hash()`

5. `embedding`
- Legacy entry: `src/main.py` -> `EmbeddingProcessor()`
- New internal target: `DeduperOrchestrator.run_embedding()`

6. `analyze`
- Legacy entry: `src/main.py` -> `run_analyze(report_id=...)`
- New internal target: `DeduperOrchestrator.run_analyze(report_id: int | None = None)`
- Expected step order: `load -> states -> url_check -> content_hash -> embedding`

7. `analyze_fast`
- Legacy entry: `src/main.py` -> `run_analyze_fast(report_id=...)`
- New internal target: `DeduperOrchestrator.run_analyze_fast(report_id: int | None = None)`
- Expected step order: `load -> states -> url_check -> embedding`

8. `clear_table`
- Legacy entry: `src/main.py` -> `clear_table(skip_confirmation=...)`
- New internal target: `DeduperOrchestrator.run_clear_table(skip_confirmation: bool = True)`

## Current worker API trigger mapping

1. Existing endpoint triggers
- `GET /deduper/jobs`
- `GET /deduper/jobs/reportId/{report_id}`

2. In-process execution target behavior
- `GET /deduper/jobs` should execute deduper run in CSV mode (`report_id=None`).
- `GET /deduper/jobs/reportId/{report_id}` should execute deduper run in report mode.
- Current worker runtime path defaults to `analyze_fast`; this should remain stable through absorption for compatibility.

## Implementation notes

1. Maintain current job-state API contract
- Preserve `pending`, `running`, `completed`, `failed`, `cancelled` behavior.

2. Keep route payload compatibility
- Preserve keys already consumed by `api/`.

3. Decouple orchestration from HTTP layer
- Route handlers should only validate input and dispatch orchestrator methods.
- Deduper module should own sequencing, progress, and errors.
