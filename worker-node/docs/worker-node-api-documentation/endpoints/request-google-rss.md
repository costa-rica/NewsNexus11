# Request Google RSS API

This router creates queued jobs for the request-google-rss workflow.

All endpoints are prefixed with `/request-google-rss`.

## POST /request-google-rss/start-job

Creates a queued job for the request-google-rss process.

- Does not require authentication
- Validates `PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED` is configured
- Validates the spreadsheet file exists before enqueueing
- Returns `202` when job is accepted into the queue

### Parameters

None

Runtime dependency:

- `PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED` (required env var): Absolute spreadsheet path

### Sample Request

```bash
curl --location --request POST 'http://localhost:3002/request-google-rss/start-job' \
--header 'Content-Type: application/json' \
--data '{}'
```

### Sample Response

```json
{
  "jobId": "job-12",
  "status": "queued",
  "endpointName": "/request-google-rss/start-job"
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
        "field": "PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED",
        "message": "PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED env var is required"
      }
    ]
  }
}
```

2. Spreadsheet file not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Spreadsheet file not found: /absolute/path/to/queries.xlsx",
    "status": 404
  }
}
```
