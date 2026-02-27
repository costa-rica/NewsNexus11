# State Assigner API

This router creates queued jobs for the state-assigner workflow.

All endpoints are prefixed with `/state-assigner`.

## POST /state-assigner/start-job

Creates a queued job for the state-assigner process.

- Does not require authentication
- Validates `KEY_OPEN_AI` is configured
- Validates `PATH_TO_STATE_ASSIGNER_FILES` is configured
- Validates required request body fields are positive integers
- Returns `202` when job is accepted into the queue

At runtime, this job also ensures these directories exist:

1. `PATH_TO_STATE_ASSIGNER_FILES/chatgpt_responses`
2. `PATH_TO_STATE_ASSIGNER_FILES/prompts`

Prompt behavior:

- Markdown files in `prompts/` are read at job start
- New prompt content is appended to the `Prompts` table if not already present
- The latest prompt in the database is used for article analysis

ChatGPT response file behavior:

- Raw JSON response content is written per processed article into `chatgpt_responses/`

### Parameters

Body fields:

1. `targetArticleThresholdDaysOld` (required, positive integer)
2. `targetArticleStateReviewCount` (required, positive integer)

Runtime dependencies:

- `KEY_OPEN_AI` (required env var)
- `PATH_TO_STATE_ASSIGNER_FILES` (required env var)

### Sample Request

```bash
curl --location --request POST 'http://localhost:3003/state-assigner/start-job' \
--header 'Content-Type: application/json' \
--data '{
  "targetArticleThresholdDaysOld": 30,
  "targetArticleStateReviewCount": 100
}'
```

### Sample Response

```json
{
  "jobId": "job-14",
  "status": "queued",
  "endpointName": "/state-assigner/start-job"
}
```

### Error responses

1. Missing OpenAI key env var (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "status": 400,
    "details": [
      {
        "field": "KEY_OPEN_AI",
        "message": "KEY_OPEN_AI env var is required"
      }
    ]
  }
}
```

2. Missing state assigner files env var (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "status": 400,
    "details": [
      {
        "field": "PATH_TO_STATE_ASSIGNER_FILES",
        "message": "PATH_TO_STATE_ASSIGNER_FILES env var is required"
      }
    ]
  }
}
```

3. Invalid body fields (400)

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
