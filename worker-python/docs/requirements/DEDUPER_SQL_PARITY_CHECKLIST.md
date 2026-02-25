# Deduper SQL parity checklist

Purpose: track SQL and data-access parity between legacy `NewsNexusDeduper02/src/modules/database.py` and the new in-process deduper repository.

## Table assumptions

- [ ] `Articles`
- [ ] `ArticleApproveds`
- [ ] `ArticleReportContracts`
- [ ] `ArticleStateContracts`
- [ ] `States`
- [ ] `ArticleDuplicateAnalyses`

## Read operations to preserve

1. Load stage
- [ ] Fetch article IDs by report:
  - `SELECT DISTINCT articleId FROM ArticleReportContracts WHERE reportId = ? ORDER BY articleId`
- [ ] Fetch approved article IDs:
  - `SELECT DISTINCT articleId FROM ArticleApproveds WHERE isApproved = 1`

2. States stage
- [ ] Fetch candidate analysis rows for state updates.
- [ ] Fetch article state by article ID using joins on `ArticleStateContracts` and `States`.
- [ ] Fetch state-processing summary counts.

3. URL stage
- [ ] Fetch candidate analysis rows for URL updates.
- [ ] Fetch article URL from `Articles` by `id`.
- [ ] Fetch URL-processing summary counts.

4. Content hash stage
- [ ] Fetch candidate analysis rows for content hash updates.
- [ ] Fetch content batch with joins to `ArticleApproveds` for new and approved article IDs.
- [ ] Fetch content hash summary counts by thresholds.

5. Embedding stage
- [ ] Fetch candidate analysis rows for embedding updates.
- [ ] Fetch article content (`textForPdfReport`) from `ArticleApproveds` where approved.
- [ ] Fetch embedding summary counts by thresholds.

## Write operations to preserve

1. Load stage writes
- [ ] Batch insert into `ArticleDuplicateAnalyses` with fields:
  - `articleIdNew`, `articleIdApproved`, `reportId`, `sameArticleIdFlag`,
  - `articleNewState`, `articleApprovedState`, `sameStateFlag`,
  - `urlCheck`, `contentHash`, `embeddingSearch`, `createdAt`, `updatedAt`
- [ ] Clear existing analysis rows scoped to incoming new article IDs.

2. States stage writes
- [ ] Batch update `articleNewState`, `articleApprovedState`, `sameStateFlag`, `updatedAt`.

3. URL stage writes
- [ ] Batch update `urlCheck`, `updatedAt`.

4. Content hash stage writes
- [ ] Batch update `contentHash` (float), `updatedAt`.

5. Embedding stage writes
- [ ] Batch update `embeddingSearch` (float), `updatedAt`.

6. Utility writes
- [ ] Clear all rows from `ArticleDuplicateAnalyses`.

## Transaction and batching behavior

- [ ] Preserve batched `executemany` style writes for performance.
- [ ] Preserve commit semantics after each batch.
- [ ] Preserve row factory behavior for dict-like reads.
- [ ] Preserve safe handling for empty batch lists.

## Compatibility guardrails

- [ ] Ensure `reportId` remains optional (nullable).
- [ ] Ensure default values match legacy initialization (`''`, `0`, `0.0` behavior as applicable).
- [ ] Ensure timestamp updates occur on each stage write.
- [ ] Ensure query predicates do not unintentionally skip rows with legitimate zero values.

## Verification tasks

- [ ] Add repository-level tests for each read/write method.
- [ ] Add fixture-based tests for each pipeline stage update.
- [ ] Compare row counts and key field outputs between legacy and new implementations for a known dataset.
