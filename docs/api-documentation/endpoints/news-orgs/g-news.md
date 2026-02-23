# GNews API

This router integrates with the GNews.io API to fetch and store news articles. It provides endpoints for making requests to GNews with various keyword and date filters.

All endpoints are prefixed with `/gnews`.

## POST /gnews/request

Fetch articles from GNews.io using simple keyword search and save to database.

- Does not require authentication
- Fetches articles from GNews.io API based on keyword and date range
- Automatically stores fetched articles in the database
- Requires ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES environment variable to be "true"

### Parameters

- `startDate` (string, required): Start date for article search (ISO format or date string)
- `endDate` (string, required): End date for article search (ISO format or date string)
- `keywordString` (string, required): Keyword to search for in articles

### Sample Request

```bash
curl --location 'http://localhost:3000/gnews/request' \
--header 'Content-Type: application/json' \
--data-raw '{
  "startDate": "2024-01-01",
  "endDate": "2024-01-15",
  "keywordString": "product recall"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Imported ## articles from GNews."
}
```

### Error Responses

#### Missing required fields (400)

```json
{
  "result": false,
  "message": "Missing startDate, endDate, keywordString"
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "NewsNexusAPI internal server error",
  "error": "API request failed"
}
```

## POST /gnews/get-articles

Fetch articles from GNews.io with advanced filtering options and save to database.

- Does not require authentication
- Supports AND, OR, and NOT keyword logic
- Automatically stores articles if ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is "true"
- Returns detailed request and response information

### Parameters

- `startDate` (string, required): Start date for article search
- `endDate` (string, required): End date for article search
- `keywordsAnd` (string or array, optional): Keywords that must all appear in articles (AND logic)
- `keywordsOr` (string or array, optional): Keywords where at least one must appear (OR logic)
- `keywordsNot` (string or array, optional): Keywords to exclude from results (NOT logic)

### Sample Request

```bash
curl --location 'http://localhost:3000/gnews/get-articles' \
--header 'Content-Type: application/json' \
--data-raw '{
  "startDate": "2024-01-01",
  "endDate": "2024-01-15",
  "keywordsAnd": "product recall safety",
  "keywordsOr": "fire hazard injury",
  "keywordsNot": "politics"
}'
```

### Sample Response

```json
{
  "result": true,
  "requestResponseData": {
    "totalArticles": 45,
    "articles": [
      {
        "title": "Major Product Recall Due to Fire Hazard",
        "description": "Safety officials announced a nationwide recall...",
        "content": "Full article content here...",
        "url": "https://example.com/article/123",
        "image": "https://example.com/images/123.jpg",
        "publishedAt": "2024-01-10T14:30:00Z",
        "source": {
          "name": "Safety News",
          "url": "https://example.com"
        }
      }
    ]
  },
  "newsApiRequestObj": {
    "newsArticleAggregatorSourceId": 2,
    "andString": "product recall safety",
    "orString": "fire hazard injury",
    "notString": "politics",
    "requestUrl": "https://gnews.io/api/v4/search?q=...",
    "startDate": "2024-01-01",
    "endDate": "2024-01-15"
  }
}
```

### Error Responses

#### GNews API error (400)

```json
{
  "status": "error",
  "result": false,
  "message": "API rate limit exceeded"
}
```

#### No articles in response (400)

```json
{
  "status": "error",
  "result": false,
  "message": "Failed to fetch articles"
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "NewsNexusAPI internal server error",
  "error": "Network timeout"
}
```

### Processing Flow

1. Looks up GNews source object from NewsArticleAggregatorSource table
2. Builds GNews API request URL with keyword and date parameters
3. Makes HTTP request to GNews.io API
4. If ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is "true":
   - Validates response contains articles array
   - Stores articles in database via storeGNewsArticles
5. Returns request details and response data

### Environment Variables

- `ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES`: Must be "true" to enable external API calls and database storage
- GNews API key must be configured in the GNews source object in the database
