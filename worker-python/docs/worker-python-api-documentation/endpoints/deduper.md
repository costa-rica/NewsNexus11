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
curl --location 'http://localhost:5000/deduper/jobs/reportId/27'
```

### Sample Response

```json
{
  "jobId": 2,
  "reportId": 27,
  "status": "pending"
}
```

### Error responses

- `422`: Invalid `report_id` type
- `500`: Internal server error

## GET /deduper/jobs/{job_id}

Returns status and metadata for a single deduper job.

### parameters

- Path: `job_id` (integer)

### Sample Request

```bash
curl --location 'http://localhost:5000/deduper/jobs/2'
```

### Sample Response

```json
{
  "jobId": 2,
  "status": "running",
  "createdAt": "2026-02-25T15:12:19.147420+00:00",
  "startedAt": "2026-02-25T15:12:19.149871+00:00"
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
curl --location --request POST 'http://localhost:5000/deduper/jobs/2/cancel'
```

### Sample Response

```json
{
  "jobId": 2,
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
      "jobId": 1,
      "status": "completed",
      "createdAt": "2026-02-25T15:10:01.006940+00:00"
    },
    {
      "jobId": 2,
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
    "deduper_path_configured": true,
    "python_venv_configured": true,
    "deduper_path_exists": true
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

Cancels active jobs and runs deduper clear-table command.

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
  "cancelledJobs": [2],
  "exitCode": 0,
  "stdout": "...",
  "stderr": "",
  "timestamp": "2026-02-25T15:15:31.223614+00:00"
}
```

### Error responses

- `500`: Missing environment variables, subprocess failure, or timeout
