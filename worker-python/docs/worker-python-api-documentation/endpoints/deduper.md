# Deduper endpoints

These endpoints manage deduper job lifecycle operations including create, status, cancel, list, health checks, and table clear operations.

## GET /deduper/jobs

Creates a new deduper job and starts it in the background.

### parameters

- None

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/jobs'
```

### Sample Response

```json
{
  "jobId": 1,
  "status": "pending"
}
```

### Error responses

- `500`: Internal server error

## GET /deduper/jobs/reportId/{report_id}

Creates a new deduper job scoped to a specific report ID.

### parameters

- Path: `report_id` (integer)

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/jobs/reportId/125'
```

### Sample Response

```json
{
  "jobId": 9,
  "reportId": 125,
  "status": "pending"
}
```

### Error responses

- `422`: Invalid `report_id` type
- `500`: Internal server error

## GET /deduper/jobs/{job_id}

Returns status and metadata for a single deduper job.

Important:

1. `job_id` is the queue job identifier returned from job creation.
2. `job_id` is not the same value as `report_id`.

### parameters

- Path: `job_id` (integer)

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/jobs/9'
```

### Sample Response

```json
{
  "jobId": 9,
  "reportId": 125,
  "status": "completed",
  "createdAt": "2026-02-25T15:12:19.147420+00:00",
  "startedAt": "2026-02-25T15:12:19.149871+00:00",
  "completedAt": "2026-02-25T15:12:22.481555+00:00",
  "exitCode": 0,
  "stdout": "Deduper processed in-process inside worker-python",
  "stderr": "",
  "logs": [
    "2026-02-25T15:12:19.147420+00:00 event=job_created job_id=9 report_id=125",
    "2026-02-25T15:12:19.149871+00:00 event=job_started job_id=9 report_id=125",
    "2026-02-25T15:12:22.481555+00:00 event=job_completed job_id=9 report_id=125"
  ]
}
```

### Error responses

- `404`: Job not found
- `422`: Invalid `job_id` type

## POST /deduper/jobs/{job_id}/cancel

Cancels a pending or running job.

### parameters

- Path: `job_id` (integer)

### Sample Request

```bash
curl --location --request POST 'http://localhost:5000/deduper/jobs/9/cancel'
```

### Sample Response

```json
{
  "jobId": 9,
  "status": "cancelled",
  "message": "Job cancelled successfully"
}
```

### Error responses

- `404`: Job not found
- `400`: Job is not cancellable in its current state
- `422`: Invalid `job_id` type
- `500`: Cancellation failure

## GET /deduper/jobs/list

Returns a summary list of all tracked jobs.

### parameters

- None

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/jobs/list'
```

### Sample Response

```json
{
  "jobs": [
    {
      "jobId": 8,
      "status": "completed",
      "createdAt": "2026-02-25T15:10:01.006940+00:00"
    },
    {
      "jobId": 9,
      "status": "running",
      "createdAt": "2026-02-25T15:12:19.147420+00:00"
    }
  ]
}
```

### Error responses

- `500`: Internal server error

## GET /deduper/health

Returns deduper service health including environment and job counters.

### parameters

- None

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/health'
```

### Sample Response

```json
{
  "status": "healthy",
  "timestamp": "2026-02-25T15:14:03.488332+00:00",
  "environment": {
    "path_to_database_configured": true,
    "name_db_configured": true,
    "database_exists": true
  },
  "jobs": {
    "total": 2,
    "pending": 0,
    "running": 1,
    "completed": 1,
    "failed": 0,
    "cancelled": 0
  }
}
```

### Error responses

- `500`: Unexpected health check failure

## DELETE /deduper/clear-db-table

Cancels active jobs and clears the `ArticleDuplicateAnalyses` table in-process.

### parameters

- None

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:5000/deduper/clear-db-table'
```

### Sample Response

```json
{
  "cleared": true,
  "cancelledJobs": [9],
  "exitCode": 0,
  "stdout": "Successfully deleted 1024 rows from ArticleDuplicateAnalyses table.",
  "stderr": "",
  "timestamp": "2026-02-25T15:15:31.223614+00:00"
}
```

### Error responses

- `500`: Missing DB environment variables or internal clear-table failure
