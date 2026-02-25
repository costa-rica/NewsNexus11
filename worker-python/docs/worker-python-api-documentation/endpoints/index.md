# Index endpoints

These endpoints provide base service checks and simple request validation behavior.

## GET /

Returns the base worker service page.

### parameters

- None

### Sample Request

```bash
curl --location 'http://localhost:5000/'
```

### Sample Response

```html
<html><body><h1>News Nexus Python Queuer 01</h1></body></html>
```

### Error responses

- `500`: Unexpected server error

## GET /test

Echoes back JSON payload when provided. For `GET`, returns `{}` when no JSON body is present.

### parameters

- Body (optional JSON object)

### Sample Request

```bash
curl --location 'http://localhost:5000/test' \
--header 'Content-Type: application/json' \
--data '{"ping":"pong"}'
```

### Sample Response

```json
{
  "ping": "pong"
}
```

### Error responses

- `200` with `{}` for invalid or missing JSON body

## POST /test

Echoes back the JSON payload.

### parameters

- Body (optional JSON object)

### Sample Request

```bash
curl --location 'http://localhost:5000/test' \
--header 'Content-Type: application/json' \
--data '{"reportId":123,"dryRun":true}'
```

### Sample Response

```json
{
  "reportId": 123,
  "dryRun": true
}
```

### Error responses

- `200` with `{}` for invalid or missing JSON body
