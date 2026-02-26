# Health API

This router provides a health check endpoint for service monitoring.

All endpoints are prefixed with `/health`.

## GET /health

Returns health state for the worker-node process.

- Does not require authentication
- Intended for uptime/monitoring checks

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3002/health'
```

### Sample Response

```json
{
  "status": "ok",
  "service": "worker-node"
}
```
