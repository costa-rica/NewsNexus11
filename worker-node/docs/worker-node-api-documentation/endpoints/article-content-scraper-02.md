# Article Content Scraper 02 API

This router creates queued jobs for the new Google-to-publisher article-content scraping workflow backed by `ArticleContents02`.

All endpoints are prefixed with `/article-content-scraper-02`.

## POST /article-content-scraper-02/start-job

Creates a queued job for the new browser-first article-content scraping flow.

- Does not require authentication
- Accepts the legacy broad-targeting request body shape and the newer targeted `articleIds` body shape
- Validates required request body fields are positive integers
- Returns `202` when the job is accepted into the queue

Implementation details:

- Candidate article selection matches the existing state assigner and legacy article-content scraper targeting rules
- The workflow expects `Articles.url` to contain the Google RSS article URL
- Google navigation uses Playwright with a browser-style desktop user agent
- Google navigation is browser-first and sequential in the current implementation
- Publisher URL discovery prefers the final browser URL, then falls back to page metadata
- Publisher fetching uses direct HTTP first and Playwright fallback second
- Outcomes are persisted to `ArticleContents02`

Persistence behavior:

- Stores both the original Google RSS URL and the discovered publisher URL
- Stores `status` as `success` or `fail`
- Stores `failureType` for blocked, no-publisher, navigation, publisher-fetch, and short-content outcomes
- Stores `details`, `extractionSource`, and `bodySource` for debugging and replay analysis
- Skips articles that already have a usable successful `ArticleContents02` row
- Failed attempts are still persisted when enough diagnostic information exists

Allowed `extractionSource` values:

1. `final-url`
2. `canonical`
3. `og:url`
4. `json-ld`
5. `fallback-link`
6. `none`

Allowed `bodySource` values:

1. `rss-feed`
2. `aggregator-feed`
3. `direct-http`
4. `playwright-publisher`
5. `google-page`
6. `none`

### Parameters

Body fields:

1. `targetArticleThresholdDaysOld` (required, positive integer)
2. `targetArticleStateReviewCount` (required, positive integer)
3. `includeArticlesThatMightHaveBeenStateAssigned` (optional, boolean)
4. `articleIds` (optional, non-empty array of positive integers)

### Sample Request

```bash
curl --location --request POST 'http://localhost:3002/article-content-scraper-02/start-job' \
--header 'Content-Type: application/json' \
--data '{
  "targetArticleThresholdDaysOld": 180,
  "targetArticleStateReviewCount": 100,
  "includeArticlesThatMightHaveBeenStateAssigned": true
}'
```

### Sample Response

```json
{
  "jobId": "job-22",
  "status": "queued",
  "endpointName": "/article-content-scraper-02/start-job"
}
```

### Error responses

1. Invalid body fields (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "status": 400,
    "details": [
      {
        "field": "targetArticleThresholdDaysOld",
        "message": "targetArticleThresholdDaysOld must be a positive integer"
      },
      {
        "field": "targetArticleStateReviewCount",
        "message": "targetArticleStateReviewCount must be a positive integer"
      }
    ]
  }
}
```

### Notes for testing

1. This is the active worker-node article-content scraping route.
2. It supports both broad article selection and targeted follow-up scraping by explicit `articleIds`.
