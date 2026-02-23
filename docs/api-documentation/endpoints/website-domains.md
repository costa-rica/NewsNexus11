# Website Domains API

This router manages website domain names used for filtering news sources. It provides endpoints for adding and retrieving website domains.

All endpoints are prefixed with `/website-domains`.

## GET /website-domains/

Get all website domains.

- Requires authentication (JWT token)
- Returns all domains without filtering

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/website-domains/' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "websiteDomains": [
    {
      "id": 1,
      "name": "cnn.com",
      "isArchievedNewsDataIo": false,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "bbc.com",
      "isArchievedNewsDataIo": false,
      "createdAt": "2024-01-02T11:00:00.000Z",
      "updatedAt": "2024-01-02T11:00:00.000Z"
    },
    {
      "id": 3,
      "name": "tabloid-news.com",
      "isArchievedNewsDataIo": true,
      "createdAt": "2024-01-03T12:00:00.000Z",
      "updatedAt": "2024-01-03T12:00:00.000Z"
    }
  ]
}
```

## POST /website-domains/get-website-domains-array

Get website domains with optional filtering.

- Requires authentication (JWT token)
- Can filter out archived NewsData.io domains
- Used for populating domain selection dropdowns in frontend

### Parameters

- `excludeArchievedNewsDataIo` (boolean, optional): If true, excludes domains where isArchievedNewsDataIo is true

### Sample Request

```bash
curl --location 'http://localhost:3000/website-domains/get-website-domains-array' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "excludeArchievedNewsDataIo": true
}'
```

### Sample Response

```json
{
  "websiteDomainsArray": [
    {
      "id": 1,
      "name": "cnn.com",
      "isArchievedNewsDataIo": false,
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-01T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "bbc.com",
      "isArchievedNewsDataIo": false,
      "createdAt": "2024-01-02T11:00:00.000Z",
      "updatedAt": "2024-01-02T11:00:00.000Z"
    }
  ]
}
```

## POST /website-domains/add

Add a new website domain to the database.

- Requires authentication (JWT token)
- Domain name should be in format "example.com" (without http/https)

### Parameters

- `name` (string, required): Domain name to add

### Sample Request

```bash
curl --location 'http://localhost:3000/website-domains/add' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "consumerreports.org"
}'
```

### Sample Response

```json
{
  "result": true,
  "websiteDomain": {
    "id": 45,
    "name": "consumerreports.org",
    "isArchievedNewsDataIo": false,
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

### Error Responses

#### Missing required field (400)

```json
{
  "error": "Missing name"
}
```

### Use Cases

Website domains are used for:
- Filtering article sources in news aggregator requests
- Include/exclude lists when fetching from NewsAPI, GNews, NewsData.io
- Source whitelisting/blacklisting for article quality control
- Organizing and categorizing news sources
