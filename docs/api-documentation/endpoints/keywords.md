# Keywords API

This router manages keywords used for article searching and categorization. It provides endpoints for adding and retrieving keywords.

All endpoints are prefixed with `/keywords`.

## POST /keywords/add-keyword

Add a new keyword to the database.

- Requires authentication (JWT token)
- Keywords are used for searching and categorizing articles

### Parameters

- `keyword` (string, required): The keyword text to add
- `category` (string, optional): Category classification for the keyword

### Sample Request

```bash
curl --location 'http://localhost:3000/keywords/add-keyword' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "keyword": "product recall",
  "category": "safety"
}'
```

### Sample Response

```json
{
  "result": true
}
```

### Error Responses

#### Missing required field (400)

```json
{
  "error": "Missing keyword"
}
```

## GET /keywords/

Get all active keywords.

- Requires authentication (JWT token)
- Returns only non-archived keywords (isArchived: false)
- Returns a simplified array of keyword strings

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/keywords/' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "keywordsArray": [
    "product recall",
    "fire hazard",
    "safety alert",
    "consumer protection",
    "injury report"
  ]
}
```
