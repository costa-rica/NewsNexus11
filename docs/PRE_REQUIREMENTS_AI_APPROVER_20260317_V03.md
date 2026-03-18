# PRE_REQUIREMENTS_AI_APPROVER_20260317_V03

1. objective
- Add an AI approval likelihood score for articles under review.
- Estimate likelihood that an article will be approved for a client report submitted to the consumer protection and safety agency.
- Show the score in the `/articles/review` table.
- Base the score on one or more AI agent evaluations stored through the worker-python flow.

2. initial user-facing scope

## 2.1 review table column
- Add a new score column to the review table.
- Display the highest non-rejected AI approver score for each `articleId`.
- Store scores as `FLOAT` values from `0.0` to `1.0`.
- Convert score display to percent-style UI only if needed in the frontend.
- Render the score as a clickable circle using the same color scheme as the Nexus Semantic Rating.
- Support sorting similar to existing scoring columns.
- Make the score clickable.

## 2.2 score details modal
- Open a modal when the score is clicked.
- Show per-agent scores.
- Show agent reasoning.
- Show all stored agent rows for the selected `articleId`.
- Show each prompt-version name as clickable.
- Show the prompt content when the user clicks the prompt-version name.
- Add a human validation form for the current highest non-rejected score row.
- Let the user toggle `approve`, `reject`, or `undetermined`.
- Show rejection text input only when `reject` is selected.
- Add a `Validate Human Approval Status` action that sends the selected human evaluation to the API.
- Treat this human validation as score-row validation only, not final article approval.
- If the current highest row is rejected, the next highest non-rejected row becomes the displayed top score.

## 2.3 automation trigger
- Add an `AI Approver` section to the articles automations page.
- Allow the user to start the scoring flow from the portal.
- Pass run options from portal to API.
- Add a `Manage Agent Prompts` button in the AI Approver section.
- Route this button to a new prompt-management page.
- Add an optional state dropdown filter in the AI Approver section.
- Use the selected state as an additional filter against AI-assigned state rows.
- Question: existing route is `/articles/automations`, not `/articles/automation`.

3. scoring model

## 3.1 scoring purpose
- Predict likelihood of final report approval.
- Use a `FLOAT` score between `0.0` and `1.0`.
- Keep the first version simple with one agent.

## 3.2 initial prompt-driven agent
- Start with one active prompt version: `Residential House Fire`.
- Treat the active prompt version as the effective AI approver definition.
- Have the OpenAI response return a score and concise reason.
- Use this as the pilot for the end-to-end flow.

## 3.3 next planned prompt-driven agent
- Prepare for a second active prompt version: `ATV Accident`.
- Keep architecture flexible for additional active prompt versions later.

4. workflow and orchestration

## 4.1 high-level flow
- Portal automation section starts the run.
- API acts as gatekeeper to worker-python.
- Worker-python runs the AI article approver loop.
- Persist scores and related metadata to the database.

## 4.2 proposed API and worker endpoint
- Add an API route that proxies to worker-python.
- Add a worker-python endpoint named `ai-article-approver`.
- Design the endpoint to support multiple active prompt versions.
- Design the endpoint to support future filter options.
- Question: current worker patterns use named workflow routes plus shared queue/job status endpoints; confirm if this flow should also be a queued job.

## 4.3 run request body
- Accept a limit value for article count.
- Accept optional filtering options.
- Default to processing latest eligible articles first.
- Default to requiring an existing AI-assigned state.
- Allow the request body to specify whether `ArticleStateContract02` filtering is applied.
- Allow an optional `state` body value from the portal.
- Apply the `state` body value against AI-assigned state data from `ArticleStateContract02`.

## 4.4 article selection rules
- Start with the highest `articleId` values first.
- Only include articles with no existing row in `AiApproverArticleScores`.
- Optionally filter to articles with an existing `ArticleStateContract02` row.
- Require `stateId` not null.
- Require `isDeterminedToBeError = 0`.
- Pass this state-filter behavior as a selectable option from the portal.
- Default this state-filter behavior to enabled.
- If a state filter is provided, only include articles whose AI-assigned state matches the selected state.
- Note: v1 skips any article once at least one `AiApproverArticleScores` row exists for that `articleId`.

## 4.5 agent execution order
- Run the generic AI approver flow for each selected article.
- Resolve all active rows from `AiApproverPromptVersions` and use them as the inner loop.
- Run prompt-version executions sequentially, one at a time, per article.
- Start the next prompt-version execution only after the previous result is written or marked invalid.
- Require each OpenAI response to return structured JSON for database persistence.
- Store one row per `articleId` per active prompt version in `AiApproverArticleScores`.
- Note: one article can have multiple score rows when multiple active prompt versions exist.
- Treat invalid output as a completed attempt with status and error metadata.

5. worker-python architecture

## 5.1 module organization
- Add a dedicated worker-python module for the AI approver workflow.
- Keep route handlers thin.
- Keep SQL in repository modules.
- Keep orchestration and processor stages separated.
- Note: this matches the current `worker-python/src/modules/` pattern.

## 5.2 agent organization
- Create one generic AI approver workflow module.
- Use one shared OpenAI request path for all AI approver runs.
- Let active prompt versions determine the inner loop behavior.
- Keep shared loading, prompt lookup, scoring, response parsing, and persistence logic centralized.
- Recommendation keyword: prompt-driven generic workflow instead of multiple agent modules.

## 5.3 run behavior
- Resolve all active prompt versions from `AiApproverPromptVersions`.
- Score each eligible article with all active prompt versions.
- Apply filtering functions before the scoring loop begins.
- Skip any article that already has at least one row in `AiApproverArticleScores`.
- Run prompt-version executions sequentially per article.
- Use `gpt-4o-mini` for all AI approver runs in v1.
- Persist score rows with the exact prompt version used.
- Persist an explicit result status for every prompt-version attempt.
- Persist invalid JSON responses as completed attempts with error metadata, not as unscored gaps.
- Return job status suitable for portal polling.

6. database and data model

## 6.1 design goals
- Let prompt versions define the effective AI approver variants for this flow.
- Preserve the exact prompt version used for each score.
- Keep active prompt lookup simple.
- Keep historical audits and rescoring traceable.
- Reduce ambiguity between prediction tables and final approval tables.

## 6.2 AI approver prompt versions table
- Add table: `AiApproverPromptVersions`.
- One row per saved prompt version used by the generic AI approver workflow.
- Do not overwrite old prompt text.
- Suggested fields:
  - `id`
  - `name`
  - `description` nullable
  - `promptInMarkdown`
  - `isActive`
  - `endedAt` nullable
- Purpose:
  - track prompt history for each effective AI approver variant
  - identify the current prompt with `isActive = true`
  - define which prompt variants participate in the inner loop
  - archive old prompts without deletion using `endedAt`
- Rule:
  - multiple rows may be active at the same time
  - each active row represents one effective AI approver in the loop
  - prompt rows are immutable after creation

## 6.3 AI approver article scores table
- Add table: `AiApproverArticleScores`.
- One row per article scored by one active prompt version.
- Suggested fields:
  - `id`
  - `articleId`
  - `promptVersionId`
  - `resultStatus`
  - `score`
  - `reason`
  - `errorCode` nullable
  - `errorMessage` nullable
  - `isHumanApproved` nullable
  - `reasonHumanRejected` nullable
  - `runKey` or `jobId` nullable
- Purpose:
  - keep score history
  - preserve exact prompt traceability
  - support modal detail by prompt-driven AI approver variant
  - avoid confusion with final approval tables
  - track completed, invalid, and failed attempts explicitly
  - support per-score-row human validation
- Rule:
  - one `articleId` can have multiple rows when multiple active prompt versions exist
  - v1 filtering skips articles after the first existing score row is found
  - review-table display should use the highest row where `isHumanApproved` is not `false`

## 6.4 result status behavior
- Store an explicit status for each prompt-version attempt.
- Suggested statuses:
  - `completed`
  - `invalid_response`
  - `failed`
- `completed` means a valid structured result was returned and stored.
- `invalid_response` means the agent responded but the payload could not be accepted as valid scoring output.
- `failed` means the attempt did not complete successfully due to execution or provider error.
- Invalid and failed attempts still count as existing rows for v1 article filtering.

## 6.5 current prompt lookup
- Worker finds all active prompt versions from `AiApproverPromptVersions`.
- Query by `isActive = true`.
- Archived prompts remain queryable through historical score rows.
- `promptVersionId` on score rows is the main historical link.

## 6.6 prompt lifecycle behavior
- Creating a new prompt variant creates a new prompt version row.
- Copying a prompt creates a new prompt version row that can then be modified before save.
- Deactivating a prompt variant sets `isActive = false`.
- Archived rows can also set `endedAt`.
- `endedAt` should be managed by the API, not directly by the user.
- Deletion is only allowed when no `AiApproverArticleScores` rows reference the prompt version.
- Existing score rows do not change.

## 6.7 indexing and query shape
- Index `AiApproverPromptVersions` on `isActive`.
- Index `AiApproverPromptVersions` on `name`.
- Index `AiApproverArticleScores` on `articleId`.
- Index `AiApproverArticleScores` on `promptVersionId`.
- Index `AiApproverArticleScores` on `resultStatus`.
- Consider index on `AiApproverArticleScores` for `jobId` or `runKey`.
- Goal: fast lookup for highest-score display and modal breakdown queries.

## 6.8 relationship to existing tables
- Keep this flow independent from `ArtificialIntelligences` unless another integration requires that link later.
- Avoid storing these score rows in `ArticleApproveds` or `ArticlesApproved02`.
- Note: this flow is prediction/scoring, not final approval.

7. prompt and agent management

## 7.1 prompt flexibility
- Allow adding new prompts.
- Do not allow direct editing of existing prompt rows.
- Allow copying an existing prompt into a new prompt row.
- Allow multiple prompt versions to be active at the same time.
- Allow viewing archived prompt versions.

## 7.2 portal management page
- Add a page for viewing AI approver prompt versions.
- Add a form at the top and a table below backed by `AiApproverPromptVersions`.
- Allow creating a new row when no existing row is selected.
- Show `id` in the form as read-only.
- Include `name` input.
- Include `description` input.
- Include `promptInMarkdown` as a textarea expecting markdown.
- Include `isActive` as a form field.
- Show `endedAt` as visible but read-only.
- Do not expose `endedAt` for direct user editing.
- Manage `endedAt` and active-state transitions through the API.
- Add a `Copy` action in the table.
- Add a `Delete` action in the table.
- `Copy` should create a new prompt draft in the form using the selected row as the source.
- `Delete` should be blocked when `AiApproverArticleScores` rows reference that `promptVersionId`.
- Handle prompt management through the main API, not worker-python.

## 7.3 suggested portal location
- Option A: new item under `Analysis` for AI approver prompt management.
- Option B: new item under `Articles` near `Automations`.
- Option C: keep trigger in `Articles > Automations` and add management under `Analysis`.
- Recommendation keyword: split run controls and configuration pages.

8. portal integration details

## 8.1 review page changes
- Add a new approval likelihood column to the articles review table.
- Add sortable score rendering using the highest non-rejected score row per article.
- Render the score as a clickable circle using the Nexus Semantic Rating color pattern.
- Add click behavior to open modal details.
- Show prompt-version breakdown and human validation controls in the modal.
- If the current highest row is rejected, show the next highest non-rejected row in the table.

## 8.2 automations page changes
- Add an `AI Approver` section to the existing automations page.
- Allow starting a run with configurable article count.
- Allow optional filter selections.
- Add a checkbox, checked by default, to require an AI-assigned state from the AI state assigner.
- Add an optional state dropdown sourced from existing states.
- Allow one or more selected states in the dropdown filter.
- Pass the selected state in the request body when chosen.
- Add a `Manage Agent Prompts` button linking to the prompt-management page.
- Show job/run status.

## 8.3 configuration page changes
- Add UI for current and archived prompt versions.
- Add UI for activating or deactivating prompt versions.
- Add UI for creating new prompt versions.
- Use one form for create behavior and copy-from-existing behavior.
- Use the table as the row-selection surface for viewing and copy/delete actions.

## 8.4 modal interaction details
- Fetch AI approver score rows for the selected `articleId` from the API when the modal opens.
- Show all score rows and reasons in score order.
- Make each prompt-version name clickable to reveal its prompt.
- Show the human validation controls for the current highest non-rejected score row.
- Allow `isHumanApproved` values of `true`, `false`, or `null`.
- Show rejection reason input only when `isHumanApproved = false`.
- Submit validation changes through the API to update the selected `AiApproverArticleScores` row.
- After validation, refresh modal data so the next eligible top score can appear.

9. open questions and risks
- Confirm whether the state dropdown should use state name, abbreviation, or `stateId` in the request body.
- Confirm whether the state dropdown should support multi-select in v1 or only a single selected state.
- Confirm whether the review table should always show the highest non-rejected prompt-version score or an aggregate score later.
- Confirm whether rescoring should create new score history rows every time.
- Confirm final worker endpoint naming and queue behavior.
- Confirm whether deleting an unused prompt should be hard delete or soft delete.
- Confirm whether human feedback should affect later scoring logic or remain audit-only.
- Confirm whether the modal should show validation controls only for the top eligible row or for every row.

10. first implementation target
- Build the end-to-end flow with one active prompt version: `Residential House Fire`.
- Support manual launch from the portal automations page.
- Support optional state filtering from the automations page.
- Store one score and one reason per eligible article.
- Store one active prompt version for the generic AI approver flow.
- Show the score on `/articles/review`.
- Open a modal with score detail and optional human feedback.
