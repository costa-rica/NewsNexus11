# Location Scorer Absorption Assessment

## Executive summary

Absorbing NewsNexusClassifierLocationScorer01 into worker-python is feasible and straightforward. The location scorer is a small, self-contained CLI app with a simple 3-step pipeline: query unscored articles from SQLite, classify each with the `facebook/bart-large-mnli` zero-shot model via Hugging Face Transformers, and write scores back to `ArticleEntityWhoCategorizedArticleContracts`. It has no API layer, no queue, and no concurrency — it is a batch script. Worker-python already absorbed a more complex project (deduper) using the same patterns this would follow: a `modules/location_scorer/` directory with an orchestrator, repository, config, and processor(s), a thin route handler at `routes/location_scorer.py`, and integration with the shared queue engine being built per the queue refactor TODO. The main dependency concern is `transformers` + `torch` (~2GB), which is significant but already partially mirrored by worker-python's existing `sentence-transformers` dependency (which includes `torch`). No architectural barriers exist. This is a clean fit.

## 1. Source project overview

**Project:** NewsNexusClassifierLocationScorer01
**Purpose:** Classify articles as occurring inside or outside the United States using Hugging Face zero-shot classification.

### Pipeline (3 steps)

1. **Article list creation** (`article_list_creator.py`)
   - Query `Articles` table for articles not yet scored by this AI entity
   - Check `ArticleEntityWhoCategorizedArticleContracts` to exclude already-processed articles
   - Support optional `--limit` parameter
   - Load any existing CSV progress file

2. **Classification** (`classify_to_csv.py`)
   - Load `facebook/bart-large-mnli` model via `transformers.pipeline("zero-shot-classification")`
   - For each article: classify `title + description` against two labels: "Occurred in the United States" / "Occurred outside the United States"
   - Extract the US score (0.0 to 1.0)
   - Save progress to CSV every 10 articles

3. **Database write** (`db_writer.py`)
   - Read scored CSV
   - Look up AI entity ID from `ArtificialIntelligences` and `EntityWhoCategorizedArticles` tables
   - Insert rows into `ArticleEntityWhoCategorizedArticleContracts` with `keyword`, `keywordRating`
   - Skip duplicates via `IntegrityError` catch

### One-time setup

- `standalone/update_ai_entities.py` creates the `ArtificialIntelligences` and `EntityWhoCategorizedArticles` database records for this scorer. This is a prerequisite, not part of the regular pipeline.

### Current invocation

- CLI only: `python src/main.py [--limit N] [--run-anyway]`
- Has a guardrail time window check (UTC-based, defaults to 23:00 +/- 5 minutes) intended for scheduled/cron execution
- No API, no queue, no background execution

### Database tables touched

| Table | Access | Purpose |
|-------|--------|---------|
| `Articles` | Read | Fetch articles (id, title, description) |
| `ArtificialIntelligences` | Read | Look up AI entity by name |
| `EntityWhoCategorizedArticles` | Read | Look up categorizer entity ID |
| `ArticleEntityWhoCategorizedArticleContracts` | Read + Write | Check existing scores, write new scores |

### Environment variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `PATH_DATABASE` | Yes | Directory containing SQLite DB |
| `NAME_DB` | Yes | SQLite filename |
| `NAME_AI_ENTITY_LOCATION_SCORER` | Yes | AI entity name for the location scorer workflow (e.g., `NewsNexusClassifierLocationScorer01`) |
| `PATH_OUTPUT_CLASSIFIER_LOCATION_SCORER` | Yes | Directory for CSV output |
| `NAME_OUTPUT_CLASSIFIER_LOCATION_SCORER_FILE` | Yes | CSV filename |
| `GUARDRAIL_TARGET_TIME` | No | UTC time window center (default `23:00`) |
| `GUARDRAIL_TARGET_WINDOW_IN_MINS` | No | Window width in minutes (default `5`) |

### Dependencies (relevant subset)

| Package | Purpose | Already in worker-python? |
|---------|---------|--------------------------|
| `transformers` | Zero-shot classification pipeline | Not explicit yet, but currently present transitively via `sentence-transformers` |
| `torch` | Model backend | Not explicit yet, but currently present transitively via `sentence-transformers` |
| `pandas` | CSV read/write, data manipulation | No |
| `SQLAlchemy` | Database access | No |
| `python-dotenv` | Environment loading | Yes |
| `loguru` | Logging | Yes |
| `tqdm` | Progress bars | No (not needed in server context) |

## 2. Absorption design

### Target structure

```
worker-python/src/
  modules/
    location_scorer/
      __init__.py
      config.py            # LocationScorerConfig dataclass, from_env()
      types.py             # Pipeline types, step enums
      errors.py            # LocationScorerConfigError, LocationScorerProcessorError
      repository.py        # SQLite access for articles and scoring tables
      orchestrator.py      # Pipeline orchestration with should_cancel support
      processors/
        __init__.py
        load.py            # Query unscored articles
        classify.py        # Run zero-shot classification
        write.py           # Write scores to DB
  routes/
    location_scorer.py     # POST /location-scorer/start-job, GET status endpoints
```

### Pattern alignment with deduper

| Concern | Deduper pattern | Location scorer adaptation |
|---------|----------------|---------------------------|
| Config | `DeduperConfig.from_env()` dataclass | `LocationScorerConfig.from_env()` with scorer-specific env vars including `NAME_AI_ENTITY_LOCATION_SCORER` |
| Repository | `DeduperRepository` with raw SQL via SQLite | `LocationScorerRepository` accessing Articles and scoring contract tables |
| Orchestrator | `DeduperOrchestrator` with step list and `should_cancel` | `LocationScorerOrchestrator` with 3-step pipeline and `should_cancel` |
| Processors | One class per stage, `.execute()` method | Same pattern: `LoadProcessor`, `ClassifyProcessor`, `WriteProcessor` |
| Route | Thin handler that creates job and starts via job manager | Same, but using the new shared queue engine from the refactor |
| Cancellation | Cooperative via `should_cancel()` callback at checkpoint intervals | Same pattern, check between article batches in classify step |

### Key design decisions

1. **Eliminate CSV intermediary.** The current project writes classification results to CSV, then reads CSV to write to DB. In the absorbed version, the classify processor should return results in-memory and the write processor should receive them directly. The CSV step was a progress-saving mechanism for a CLI script; the queue job store replaces that need.

2. **Eliminate guardrail time check.** The time window guardrail is a cron-scheduling concern. Once the scorer runs as a queue job triggered from the portal, timing is controlled by the user, not a cron window.

3. **Eliminate `tqdm` dependency.** Progress bars are for CLI use. In a server context, progress is reported via job status and logs.

4. **Eliminate `pandas` dependency if possible.** Pandas is used only for CSV read/write. If the CSV intermediary is removed, pandas is not needed. Score results can be passed as a list of dicts or dataclasses between processors.

5. **Keep `transformers` dependency.** This is the core ML dependency. It is already transitively present via `sentence-transformers` in worker-python's requirements. May need to pin the version or add `transformers` explicitly to `requirements.txt`.

6. **Keep `SQLAlchemy` or use raw `sqlite3`.** The current project uses SQLAlchemy for database access. Worker-python's deduper uses raw `sqlite3` via `DeduperRepository`. For consistency, the location scorer repository should follow the same raw `sqlite3` pattern. The queries are simple enough that SQLAlchemy adds no value.

7. **AI entity setup.** The `update_ai_entities.py` standalone script is a one-time database setup task. It should remain a standalone utility or be documented as a prerequisite, not part of the regular pipeline. It could be placed at `worker-python/src/standalone/update_location_scorer_ai_entities.py` or documented as a manual step.

8. **Startup validation should be strict once the route is wired.** If required location scorer env vars are missing, worker-python should fail startup and log the specific missing variable name before exiting. This keeps runtime behavior explicit and avoids silently exposing a partially configured worker.

9. **Keep shared queue statuses unchanged.** The queue contract should continue using `queued`, `running`, `completed`, `failed`, and `canceled`. If the portal needs more informative text during execution, the workflow should persist richer step or progress metadata in the job result payload instead of introducing a new queue status enum.

10. **Use the existing uniqueness constraint.** The current schema already defines a unique index on `ArticleEntityWhoCategorizedArticleContracts(articleId, entityWhoCategorizesId, keyword)`, so the repository can safely treat duplicate inserts as an `IntegrityError` path.

### Queue integration

Per the queue refactor TODO, the location scorer should:

- Be assigned a stable `endpointName`: `/location-scorer/start-job`
- Use the shared queue engine for job creation, lifecycle tracking, and persistence
- Accept optional parameters (e.g., `limit`) via POST body
- Return `{ jobId, status, endpointName }` on enqueue
- Support latest-job lookup via `/queue-info/latest-job?endpointName=/location-scorer/start-job`
- Support cancellation via cooperative `should_cancel` pattern

### Route design

```python
# routes/location_scorer.py
router = APIRouter(prefix="/location-scorer", tags=["location-scorer"])

@router.post("/start-job", status_code=202)
def start_location_scorer_job(body: LocationScorerStartRequest) -> dict:
    # Enqueue via shared queue engine
    # Return jobId, status, endpointName
    ...
```

Note: Unlike the current deduper routes that use `GET` for job creation, the location scorer should use `POST` as is semantically correct for a state-changing operation.

## 3. Dependency impact

### Already satisfied (transitively via `sentence-transformers`)
- `torch`
- `transformers`
- `numpy`
- `huggingface-hub`
- `tokenizers`

### New direct dependency needed
- `transformers` should still be added explicitly to `requirements.txt` because the location scorer imports it directly.

### Dependencies to NOT add
- `pandas` — eliminate by removing CSV intermediary
- `tqdm` — CLI-only, not needed in server context
- `SQLAlchemy` — use raw `sqlite3` to match deduper pattern

### Model download consideration
- `facebook/bart-large-mnli` (~1.6GB) must be downloaded on first use
- The `transformers.pipeline()` call handles this automatically, but the first invocation will be slow
- Consider documenting a pre-download step or handling the download during startup/health check

## 4. Risk assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Model size increases memory footprint | Medium | `bart-large-mnli` + `sentence-transformers` models may coexist in memory if both workflows run. Sequential queue execution (one job at a time) mitigates this — only one model loaded at a time. |
| First-run model download blocks job | Low | Document pre-download. Cancellation will become responsive after model load completes and regular checkpoint polling begins. |
| SQLAlchemy to sqlite3 migration introduces bugs | Low | The SQL queries are simple (4 queries total). Port directly and test. |
| Removing CSV intermediary loses progress on crash | Low | Queue job store provides durable state. Batch-level checkpointing in the classify processor can log progress. |
| `transformers` version conflict with `sentence-transformers` | Low | Both come from the same ecosystem. Pin compatible versions. |
| Location scorer and deduper compete for DB access | Low | SQLite supports concurrent readers. Sequential queue execution prevents write contention. |

## 5. Scope estimate

### Files to create
- `src/modules/location_scorer/__init__.py`
- `src/modules/location_scorer/config.py`
- `src/modules/location_scorer/types.py`
- `src/modules/location_scorer/errors.py`
- `src/modules/location_scorer/repository.py`
- `src/modules/location_scorer/orchestrator.py`
- `src/modules/location_scorer/processors/__init__.py`
- `src/modules/location_scorer/processors/load.py`
- `src/modules/location_scorer/processors/classify.py`
- `src/modules/location_scorer/processors/write.py`
- `src/routes/location_scorer.py`

### Files to modify
- `src/main.py` — register location scorer router
- `requirements.txt` — add `transformers` explicitly
- `AGENT.md` — document location scorer module
- `.env.example` — add location scorer env vars

### Files NOT needed (eliminated from source project)
- Guardrail time module
- CSV output logic
- Standalone scripts (keep `update_ai_entities.py` as documentation or standalone utility)
- Logging config (worker-python already has its own)

## 6. Conclusion

The absorption is a clean fit. The location scorer is simpler than the deduper that was already successfully absorbed. The same module structure, orchestration pattern, repository pattern, and processor pattern apply directly. The queue refactor (in progress) provides the job lifecycle infrastructure. The main ML dependency (`transformers` + `torch`) is already transitively present. No architectural changes to worker-python are needed — only additive module and route creation.
