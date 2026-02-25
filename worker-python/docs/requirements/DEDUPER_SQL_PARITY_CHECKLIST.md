# Deduper SQL parity checklist

Purpose: track SQL and data-access parity between legacy `NewsNexusDeduper02/src/modules/database.py` and the new in-process deduper repository.

## Table assumptions

- [x] `Articles`
- [x] `ArticleApproveds`
- [x] `ArticleReportContracts`
- [x] `ArticleStateContracts`
- [x] `States`
- [x] `ArticleDuplicateAnalyses`

## Read operations to preserve

1. Load stage
- [x] Fetch article IDs by report:
  - `SELECT DISTINCT articleId FROM ArticleReportContracts WHERE reportId = ? ORDER BY articleId`
- [x] Fetch approved article IDs:
  - `SELECT DISTINCT articleId FROM ArticleApproveds WHERE isApproved = 1`

2. States stage
- [x] Fetch candidate analysis rows for state updates.
- [x] Fetch article state by article ID using joins on `ArticleStateContracts` and `States`.
- [x] Fetch state-processing summary counts.

3. URL stage
- [x] Fetch candidate analysis rows for URL updates.
- [x] Fetch article URL from `Articles` by `id`.
- [x] Fetch URL-processing summary counts.

4. Content hash stage
- [x] Fetch candidate analysis rows for content hash updates.
- [x] Fetch content batch with joins to `ArticleApproveds` for new and approved article IDs.
- [x] Fetch content hash summary counts by thresholds.

5. Embedding stage
- [x] Fetch candidate analysis rows for embedding updates.
- [x] Fetch article content (`textForPdfReport`) from `ArticleApproveds` where approved.
- [x] Fetch embedding summary counts by thresholds.

## Write operations to preserve

1. Load stage writes
- [x] Batch insert into `ArticleDuplicateAnalyses` with fields:
  - `articleIdNew`, `articleIdApproved`, `reportId`, `sameArticleIdFlag`,
  - `articleNewState`, `articleApprovedState`, `sameStateFlag`,
  - `urlCheck`, `contentHash`, `embeddingSearch`, `createdAt`, `updatedAt`
- [x] Clear existing analysis rows scoped to incoming new article IDs.

2. States stage writes
- [x] Batch update `articleNewState`, `articleApprovedState`, `sameStateFlag`, `updatedAt`.

3. URL stage writes
- [x] Batch update `urlCheck`, `updatedAt`.

4. Content hash stage writes
- [x] Batch update `contentHash` (float), `updatedAt`.

5. Embedding stage writes
- [x] Batch update `embeddingSearch` (float), `updatedAt`.

6. Utility writes
- [x] Clear all rows from `ArticleDuplicateAnalyses`.

## Transaction and batching behavior

- [x] Preserve batched `executemany` style writes for performance.
- [x] Preserve commit semantics after each batch.
- [x] Preserve row factory behavior for dict-like reads.
- [x] Preserve safe handling for empty batch lists.

## Compatibility guardrails

- [x] Ensure `reportId` remains optional (nullable).
- [x] Ensure default values match legacy initialization (`''`, `0`, `0.0` behavior as applicable).
- [x] Ensure timestamp updates occur on each stage write.
- [x] Ensure query predicates do not unintentionally skip rows with legitimate zero values.

## Verification tasks

- [x] Add repository-level tests for each read/write method.
- [x] Add fixture-based tests for each pipeline stage update.
- [x] Compare row counts and key field outputs between legacy and new implementations for a known dataset.
