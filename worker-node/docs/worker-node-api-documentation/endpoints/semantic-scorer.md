# Semantic Scorer API

This router creates queued jobs for the semantic-scorer workflow.

All endpoints are prefixed with `/semantic-scorer`.

## POST /semantic-scorer/start-job

Creates a queued job for the semantic-scorer process.

- Does not require authentication
- Validates `PATH_TO_SEMANTIC_SCORER_DIR` is configured
- Validates the semantic scorer directory exists before enqueueing
- Validates `NewsNexusSemanticScorerKeywords.xlsx` exists in that directory before enqueueing
- Returns `202` when job is accepted into the queue

### Parameters

1. None

Runtime dependency:

- `PATH_TO_SEMANTIC_SCORER_DIR` (required env var): Absolute directory path that contains `NewsNexusSemanticScorerKeywords.xlsx`

### Sample Request

```bash
curl --location --request POST 'http://localhost:3002/semantic-scorer/start-job' \
--header 'Content-Type: application/json' \
--data '{}'
```

### Sample Response

```json
{
  "jobId": "job-13",
  "status": "queued",
  "endpointName": "/semantic-scorer/start-job"
}
```

### Error responses

1. Missing env var configuration (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "status": 400,
    "details": [
      {
        "field": "PATH_TO_SEMANTIC_SCORER_DIR",
        "message": "PATH_TO_SEMANTIC_SCORER_DIR env var is required"
      }
    ]
  }
}
```

2. Semantic scorer directory not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Semantic scorer directory not found: /absolute/path/to/semantic-scorer",
    "status": 404
  }
}
```

3. Keywords workbook not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Semantic scorer keywords workbook not found: /absolute/path/to/semantic-scorer/NewsNexusSemanticScorerKeywords.xlsx",
    "status": 404
  }
}
```
