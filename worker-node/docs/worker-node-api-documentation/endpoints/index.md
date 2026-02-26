# Index API

This router provides the basic service status endpoint for worker-node.

All endpoints are prefixed with `/`.

## GET /

Returns a lightweight service heartbeat payload.

- Does not require authentication
- Returns service identifier and status

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3002/'
```

### Sample Response

```json
{
  "service": "worker-node",
  "status": "up"
}
```
