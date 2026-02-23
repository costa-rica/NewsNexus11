# News Aggregators API

This router manages news article aggregator sources (like NewsAPI, GNews, NewsData.io) and tracks API requests made to these services. It provides endpoints for adding aggregators, retrieving request history, and managing aggregator configurations.

All endpoints are prefixed with `/news-aggregators`.

## POST /news-aggregators/add-aggregator

Add a new news aggregator source to the database.

- Requires authentication (JWT token)
- Creates both the aggregator source record and associated EntityWhoFoundArticle record
- URL must be unique

### Parameters

- `url` (string, required): Base URL for the aggregator service
- `nameOfOrg` (string, optional): Name of the organization/service
- `apiKey` (string, optional): API key for authenticated access
- `state` (string, optional): State or status of the aggregator
- `isApi` (boolean, optional): Whether this is an API-based source
- `isRss` (boolean, optional): Whether this is an RSS-based source

### Sample Request

```bash
curl --location 'http://localhost:3000/news-aggregators/add-aggregator' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "nameOfOrg": "NewsAPI",
  "url": "https://newsapi.org/v2/",
  "apiKey": "your-api-key-here",
  "state": "active",
  "isApi": true,
  "isRss": false
}'
```

### Sample Response

```json
{
  "message": "Aggregator added successfully",
  "aggregator": {
    "id": 4,
    "nameOfOrg": "NewsAPI",
    "url": "https://newsapi.org/v2/",
    "apiKey": "your-api-key-here",
    "state": "active",
    "isApi": true,
    "isRss": false,
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

### Error Responses

#### Missing required field (400)

```json
{
  "error": "Missing url"
}
```

#### Aggregator already exists (400)

```json
{
  "error": "Aggregator already exists"
}
```

## POST /news-aggregators/requests

Get history of API requests made to news aggregators.

- Requires authentication (JWT token)
- Returns formatted request data with keyword strings and domain filters
- Can filter by date and automation status
- Results include article counts and request status

### Parameters

- `dateLimitOnRequestMade` (string, optional): ISO date string to filter requests created after this date
- `includeIsFromAutomation` (boolean, optional): If true, includes automated requests; if false, excludes them

### Sample Request

```bash
curl --location 'http://localhost:3000/news-aggregators/requests' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "dateLimitOnRequestMade": "2024-01-01",
  "includeIsFromAutomation": false
}'
```

### Sample Response

```json
{
  "newsApiRequestsArray": [
    {
      "madeOn": "2024-01-15",
      "nameOfOrg": "NewsAPI",
      "keyword": "AND product recall OR fire hazard EXCLUDE politics",
      "startDate": "2024-01-01",
      "endDate": "2024-01-15",
      "count": 145,
      "countSaved": 142,
      "status": "success",
      "andArray": "product recall",
      "orArray": "fire hazard",
      "notArray": "politics",
      "includeSourcesArray": [
        {"name": "cnn.com"},
        {"name": "bbc.com"}
      ],
      "excludeSourcesArray": [
        {"name": "tabloid-news.com"}
      ],
      "includeString": "cnn.com, bbc.com",
      "excludeString": "tabloid-news.com"
    },
    {
      "madeOn": "2024-01-14",
      "nameOfOrg": "GNews",
      "keyword": "AND safety alert",
      "startDate": "2024-01-01",
      "endDate": "2024-01-14",
      "count": 87,
      "countSaved": 85,
      "status": "success",
      "andArray": "safety alert",
      "orArray": "",
      "notArray": "",
      "includeSourcesArray": [],
      "excludeSourcesArray": [],
      "includeString": "",
      "excludeString": ""
    }
  ]
}
```

### Response Fields

- `madeOn`: Date the request was made (formatted as YYYY-MM-DD)
- `nameOfOrg`: Name of the aggregator service
- `keyword`: Human-readable keyword string with AND/OR/NOT logic
- `count`: Total articles received from the API
- `countSaved`: Number of articles successfully saved to database
- `status`: Request status (success, error, etc.)
- `includeString`: Comma-separated list of included domains
- `excludeString`: Comma-separated list of excluded domains

## GET /news-aggregators/news-org-apis

Get all API-based news aggregator sources.

- Requires authentication (JWT token)
- Returns only aggregators where isApi is true
- Simplified response with essential fields only

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/news-aggregators/news-org-apis' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "newsOrgArray": [
    {
      "id": 1,
      "nameOfOrg": "NewsAPI",
      "url": "https://newsapi.org/v2/"
    },
    {
      "id": 2,
      "nameOfOrg": "GNews",
      "url": "https://gnews.io/api/v4/"
    },
    {
      "id": 3,
      "nameOfOrg": "NewsData.IO",
      "url": "https://newsdata.io/api/1/"
    }
  ]
}
```

## POST /news-aggregators/update/:newsArticleAggregatorSourceId

Update an existing news aggregator source.

- Requires authentication (JWT token)
- Only updates fields that are provided in the request body
- Returns updated aggregator object

### Parameters

- `newsArticleAggregatorSourceId` (number, required, URL parameter): ID of the aggregator to update
- `nameOfOrg` (string, optional): New name
- `url` (string, optional): New URL
- `apiKey` (string, optional): New API key
- `state` (string, optional): New state
- `isApi` (boolean, optional): New API flag
- `isRss` (boolean, optional): New RSS flag

### Sample Request

```bash
curl --location 'http://localhost:3000/news-aggregators/update/1' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "apiKey": "new-api-key-here",
  "state": "active"
}'
```

### Sample Response

```json
{
  "message": "Mise à jour réussie.",
  "newsArticleAggregatorSource": {
    "id": 1,
    "nameOfOrg": "NewsAPI",
    "url": "https://newsapi.org/v2/",
    "apiKey": "new-api-key-here",
    "state": "active",
    "isApi": true,
    "isRss": false,
    "createdAt": "2024-01-01T10:00:00.000Z",
    "updatedAt": "2024-01-15T14:35:00.000Z"
  }
}
```

### Error Responses

#### Aggregator not found (404)

```json
{
  "error": "News article aggregator source not found"
}
```

## DELETE /news-aggregators/:newsArticleAggregatorSourceId

Delete a news aggregator source.

- Requires authentication (JWT token)
- Permanently removes the aggregator from the database

### Parameters

- `newsArticleAggregatorSourceId` (number, required, URL parameter): ID of the aggregator to delete

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:3000/news-aggregators/1' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "message": "Suppression réussie."
}
```

### Error Responses

#### Aggregator not found (404)

```json
{
  "error": "News article aggregator source not found"
}
```
