# AI Approver TODO — Assessment

Based on review of `PRE_REQUIREMENTS_AI_APPROVER_20260317_V03.md` and `AI_APPROVER_TODO_20260317.md`.

---

## Issues

### 1. OpenAI SDK is not in worker-python and the TODO does not track adding it

Worker-python's `requirements.txt` has no OpenAI dependency. The only app that calls OpenAI today is worker-node (state assigner in `stateAssignerJob.ts`). The PRD specifies `gpt-4o-mini` and phase 3 of the TODO says "Use gpt-4o-mini for v1 AI approver calls" but never includes adding `openai` to `requirements.txt`, configuring an `OPENAI_API_KEY` environment variable, validating it at startup (matching the existing `validate_startup_env` pattern), or building an API client wrapper. This is a first-time integration for worker-python and is a blocking prerequisite for the scoring loop.

### 2. V1 skip logic blocks new prompt versions from scoring previously-processed articles

Section 4.4 skips any article with at least one existing `AiApproverArticleScores` row, checked by `articleId` alone. This means if you score 500 articles with the "Residential House Fire" prompt version, then later activate the "ATV Accident" prompt version, those 500 articles are permanently skipped — they already have rows. The skip filter would need to be per `(articleId, promptVersionId)` pair to allow new prompt versions to score existing articles. The current design contradicts the stated goal of flexibility for adding prompt versions. Additionally, failed and invalid attempts count as existing rows (PRD 6.4), so articles that errored out can never be retried without manual DB intervention.

### 3. Phase ordering builds prompt management UI before the review table

Phase 6 (prompt management page) is scheduled before phase 7 (review table column and modal). The review table is the primary user-facing deliverable — it's where users see and act on scores. The prompt management page is a configuration tool. For the first prompt version, you can seed the row via a migration script or a direct DB insert and test the full scoring-to-display flow without any management UI. Building prompt management first delays the point at which the feature delivers visible value and delays end-to-end integration testing.

### 4. No unique constraint defined on `(articleId, promptVersionId)`

The PRD states "one row per article scored by one active prompt version" but neither the PRD nor the TODO specifies a database-level unique constraint on `(articleId, promptVersionId)`. Without this, concurrent runs or retries could insert duplicate score rows for the same article and prompt version. The TODO phase 1 says "Add indexes needed for active prompt lookup and article score lookup" but indexes are not constraints. This should be an explicit composite unique index to enforce the one-row-per-pair rule at the database level.

---

## Additional minor items

- The `ArticleContents` table exists and has scraped article content. The TODO phase 3 correctly references it. Confirm coverage — not all articles will have a row in `ArticleContents`. The fallback-to-description path needs a clear threshold for whether a description-only article should be scored or skipped.
- The TODO does not include adding the new nav sidebar entry or route for the prompt management page. Phase 6 says "Add a new portal page" but doesn't mention navigation registration.

---

## Improvements

- **Change the skip filter to per-`(articleId, promptVersionId)` pair.** This single change resolves issue 2 and the failed-article retry problem. An article is only skipped for a given prompt version if a `completed` row already exists for that pair. Failed and invalid rows would not block rescoring. This aligns with the flexibility goal without adding complexity.

- **Reorder phases: move review table and modal (current phase 7) before prompt management (current phase 6).** Seed the initial "Residential House Fire" prompt version in phase 1 as part of the DB setup. This lets you test the complete flow — automation trigger through score display — before building the management UI.

- **Add a dedicated phase 3 task block for OpenAI integration setup.** Explicitly track: add `openai` to `requirements.txt`, add `OPENAI_API_KEY` to `.env` and config validation, build a thin client wrapper in `ai_approver/config.py` or a shared utility, and add a startup check that fails fast if the key is missing.

- **Add per-article write-after-score to the TODO.** Phase 3 should specify that each score row is persisted immediately after the LLM response is processed, not batched. This preserves partial progress if the job is cancelled or the process crashes mid-run. The existing location scorer writes after the full classify stage; the AI approver should write incrementally because each LLM call is an independent network request that can fail.

- **Log token usage and estimated cost per run.** Add a task in phase 3 to capture `usage` data from each OpenAI response (prompt tokens, completion tokens) and accumulate it in the job status. This gives visibility into cost per run and helps decide whether to move to a cheaper model or optimize prompts later.
