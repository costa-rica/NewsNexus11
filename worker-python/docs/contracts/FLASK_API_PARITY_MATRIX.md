# Flask API parity matrix

This baseline captures expected worker API behavior from the legacy Flask app (`worker-python-flask`) and is used to validate FastAPI compatibility during migration.

## Endpoints

1. `GET /`
- Expected status: `200`
- Response shape: HTML page with service label.

2. `GET /test`
- Expected status: `200`
- Response shape: echoes JSON body or `{}`.

3. `GET /deduper/jobs`
- Expected status: `201`
- Required keys: `jobId`, `status`

4. `GET /deduper/jobs/reportId/{report_id}`
- Expected status: `201`
- Required keys: `jobId`, `reportId`, `status`

5. `GET /deduper/jobs/{job_id}`
- Expected status: `200` (or `404` when missing)
- Required keys on success: `jobId`, `status`, `createdAt`

6. `POST /deduper/jobs/{job_id}/cancel`
- Expected status: `200` on success, `404` for missing, `400` for non-cancellable state
- Required keys on success: `jobId`, `status`, `message`

7. `GET /deduper/jobs/list`
- Expected status: `200`
- Required keys: `jobs`

8. `GET /deduper/health`
- Expected status: `200`
- Required keys: `status`, `timestamp`, `environment`, `jobs`

9. `DELETE /deduper/clear-db-table`
- Expected status: `200` or `500`
- Required keys: `cleared`, `cancelledJobs`, `exitCode`, `stdout`, `stderr`, `timestamp`
