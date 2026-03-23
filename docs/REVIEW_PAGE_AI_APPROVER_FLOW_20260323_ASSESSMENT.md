# REVIEW_PAGE_AI_APPROVER_FLOW_20260323_ASSESSMENT

## Initial assessment

This is feasible. The feature is a meaningful cross-package change, but it fits the current architecture well because the portal review page already shows AI approver results, the API already manages `AiApproverPromptVersions` and `AiApproverArticleScores`, and the worker-python app already owns the OpenAI-backed AI approver execution path. The main work is not inventing a new system from scratch, but adding a new one-off prompt flow that uses the existing AI approver storage and scoring model without disturbing the current active-prompts batch flow.

## Feasibility

1. Feasible: yes.
2. Expected difficulty: medium-high.
3. Expected scope: portal + api + worker-python, with likely no schema migration needed if we can reuse current prompt and score tables as-is.
4. Main reason it is feasible:
   - The portal review page already has article-level AI approver interactions and a modal flow.
   - The API already supports creating prompt rows and reading article AI approver scores.
   - The worker-python AI approver module already knows how to read article content, call OpenAI, and insert score rows.

## Why this fits the current codebase

1. Portal:
   - `/portal/src/app/(dashboard)/articles/review/page.tsx` already fetches AI approver top scores and opens AI-approver-related modals.
   - `/portal/src/components/tables/TableReviewArticles.tsx` already supports extra bottom-table columns and row-level AI approver actions.
2. API:
   - `/api/src/routes/analysis/ai-approver.ts` already exposes prompt CRUD and article score reads.
   - The API is the right place to own a new authenticated article-level request for a one-off AI approver run.
3. Worker-python:
   - `/worker-python/src/modules/ai_approver/repository.py` already loads article content and inserts score rows.
   - The OpenAI call path already exists in the AI approver worker, so the likely change is extending that flow to support a single article plus a single prompt version instead of only the active-prompt batch mode.

## Main implementation concerns

1. The new table icon should not affect sorting.
   - This looks straightforward if the icon is added as a separate display column in `TableReviewArticles` rather than changing the existing `id` accessor.
   - We will need article rows to carry a boolean or row id indicating whether `ArticleContents02` exists for that article.
2. The popup/modal needs article title and content.
   - The review table data currently does not appear to include canonical `ArticleContents02` content directly.
   - We likely need a dedicated API endpoint that returns the best content row for a given article, rather than overloading the existing selected-article content logic.
3. The one-off AI approver run is a new flow, not just a UI tweak.
   - The current worker-python path is built around active prompts and eligible-article batch selection.
   - A new route and orchestrator entry point will likely be needed for "run one prompt against one article now".
4. Prompt-row creation has business rules that differ from the existing prompt-management page.
   - Name is editable but defaulted from the copied prompt plus `-articleId: <id>`.
   - Description is system-generated from `userId`, `articleId`, and date, and should not be user-editable.
   - `isActive` must always be `false` in this modal flow.
5. Score-row uniqueness must be handled deliberately.
   - `AiApproverArticleScores` has a unique index on `(articleId, promptVersionId)`.
   - This is fine if each one-off submission creates a new prompt row first, but retries and duplicate-submit protection will matter.
6. The content source needs a clear rule.
   - We should decide whether the popup and the one-off request always use the canonical `ArticleContents02` row, or whether they can fall back to article description when scraped content is missing.

## Questions to resolve before implementation

1. Should the new icon appear only when a successful/canonical `ArticleContents02` row exists, or whenever any `ArticleContents02` row exists for the article?
2. Should the popup be read-only for content, or should the user be able to edit the article content before submitting the one-off prompt?
3. Should the prompt form allow:
   - starting from a blank prompt
   - copying an existing `AiApproverPromptVersion`
   - both
4. When the user submits, should the UI wait synchronously for the OpenAI result and then refresh the article’s AI approver scores, or should it queue a background job and poll?
5. How should the date be formatted inside the generated description string?
6. If the copied prompt is edited, do we want to keep any marker that identifies the source prompt version id for traceability, or is the generated description enough?
7. Should the one-off score participate immediately in the existing review-page "top score" logic the same way as batch-generated rows?

## Initial recommendation

1. Treat this as a three-phase implementation:
   - portal UI and modal wiring
   - api article-content and one-off submission endpoints
   - worker-python single-article single-prompt execution path
2. Prefer creating a new dedicated API/worker flow for the one-off request instead of trying to force it through the existing active-prompts batch route.
3. Reuse the existing tables:
   - create a new inactive `AiApproverPromptVersions` row for each submission
   - run OpenAI only for that new prompt and selected article
   - write the result into `AiApproverArticleScores`
4. Refresh the review page’s top-score data for that article after submission so the new score is visible immediately.

## Risk summary

1. Technical risk: moderate.
2. Product/UX risk: moderate, mainly around modal complexity and avoiding confusion between one-off prompts and active recurring prompts.
3. Data-model risk: low to moderate, assuming we keep the current schema and introduce the one-off flow through new routes rather than changing current batch semantics.
