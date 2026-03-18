# Article Content Scraper API

This router creates queued jobs for the standalone article-content scraper workflow.

All endpoints are prefixed with `/article-content-scraper`.

## POST /article-content-scraper/start-job

Creates a queued job for bounded article-content scraping.

- Does not require authentication
- Uses the same request body shape as `/state-assigner/start-job`
- Validates required request body fields are positive integers
- Returns `202` when the job is accepted into the queue

Implementation details:

- Candidate article selection matches the state assigner candidate window
- Scraping uses platform `fetch` plus Cheerio
- Request timeout is 15 seconds
- Redirect policy is `follow`
- User-Agent is a browser-style NewsNexus worker string
- Minimum usable content threshold is 200 characters
- The initial implementation is Cheerio-only

Persistence behavior:

- Existing `ArticleContents` rows are updated first when present
- A new `ArticleContents` row is created only when none exists
- Duplicate rows are handled deterministically by selecting one effective row
- `scrapeStatusCheerio` is stored as `true` for success and `false` for failure

### Parameters

Body fields:

1. `targetArticleThresholdDaysOld` (required, positive integer)
2. `targetArticleStateReviewCount` (required, positive integer)

### Sample Request

```bash
curl --location --request POST 'http://localhost:3002/article-content-scraper/start-job' \
--header 'Content-Type: application/json' \
--data '{
  "targetArticleThresholdDaysOld": 180,
  "targetArticleStateReviewCount": 100
}'
```

### Sample Response

```json
{
  "jobId": "job-21",
  "status": "queued",
  "endpointName": "/article-content-scraper/start-job"
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
