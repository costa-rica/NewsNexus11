# NewsAPI API

This router integrates with the NewsAPI.org service to fetch and store news articles. It provides endpoints for making requests to NewsAPI with keyword search and advanced filtering options.

All endpoints are prefixed with `/news-api`.

## POST /news-api/request

Fetch articles from NewsAPI.org using simple keyword search and save to database.

- Does not require authentication
- Fetches articles from NewsAPI.org based on keyword and date range
- Automatically stores fetched articles in the database
- Returns error if NewsAPI.org returns an error status

### Parameters

- `startDate` (string, required): Start date for article search (ISO format or date string)
- `endDate` (string, required): End date for article search (ISO format or date string)
- `keywordString` (string, required): Keyword to search for in articles
- `max` (number, optional): Maximum number of articles to fetch

### Sample Request

```bash
curl --location 'http://localhost:3000/news-api/request' \
--header 'Content-Type: application/json' \
--data-raw '{
  "startDate": "2024-01-01",
  "endDate": "2024-01-15",
  "keywordString": "product recall",
  "max": 100
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Request sent successfully",
  "newsApiSourceObj": {
    "id": 1,
    "nameOfOrg": "NewsAPI",
    "apiKey": "********",
    "baseUrl": "https://newsapi.org/v2/"
  }
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

#### NewsAPI error (400)

```json
{
  "status": "error",
  "result": false,
  "message": "API rate limit exceeded"
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "NewsNexusAPI internal server error",
  "error": "Network connection failed"
}
```

## POST /news-api/get-articles

Fetch articles from NewsAPI.org with advanced filtering options and save to database.

- Does not require authentication
- Supports AND, OR, and NOT keyword logic
- Supports website domain inclusion and exclusion filters
- Automatically stores articles if ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is "true"
- Returns detailed request and response information

### Parameters

- `startDate` (string, required): Start date for article search
- `endDate` (string, required): End date for article search
- `keywordsAnd` (string or array, optional): Keywords that must all appear in articles (AND logic)
- `keywordsOr` (string or array, optional): Keywords where at least one must appear (OR logic)
- `keywordsNot` (string or array, optional): Keywords to exclude from results (NOT logic)
- `includeWebsiteDomainObjArray` (array, optional): Array of website domain objects to include (e.g., [{"name": "cnn.com"}, {"name": "bbc.com"}])
- `excludeWebsiteDomainObjArray` (array, optional): Array of website domain objects to exclude

### Sample Request

```bash
curl --location 'http://localhost:3000/news-api/get-articles' \
--header 'Content-Type: application/json' \
--data-raw '{
  "startDate": "2024-01-01",
  "endDate": "2024-01-15",
  "keywordsAnd": "product recall safety",
  "keywordsOr": "fire hazard injury",
  "keywordsNot": "politics entertainment",
  "includeWebsiteDomainObjArray": [
    {"name": "consumerreports.org"},
    {"name": "cpsc.gov"}
  ],
  "excludeWebsiteDomainObjArray": [
    {"name": "tabloid-news.com"}
  ]
}'
```

### Sample Response

```json
{
  "result": true,
  "requestResponseData": {
    "status": "ok",
    "totalResults": 142,
    "articles": [
      {
        "source": {
          "id": null,
          "name": "Consumer Reports"
        },
        "author": "Jane Smith",
        "title": "Major Product Recall: Fire Hazard in Electric Heaters",
        "description": "Federal safety officials announced a nationwide recall...",
        "url": "https://consumerreports.org/article/123",
        "urlToImage": "https://consumerreports.org/images/123.jpg",
        "publishedAt": "2024-01-10T14:30:00Z",
        "content": "Full article content here..."
      }
    ]
  },
  "newsApiRequest": {
    "newsArticleAggregatorSourceId": 1,
    "andString": "product recall safety",
    "orString": "fire hazard injury",
    "notString": "politics entertainment",
    "requestUrl": "https://newsapi.org/v2/everything?q=...",
    "startDate": "2024-01-01",
    "endDate": "2024-01-15",
    "includeSourcesString": "consumerreports.org,cpsc.gov",
    "excludeSourcesString": "tabloid-news.com"
  }
}
```

### Error Responses

#### No articles in response (400)

```json
{
  "status": "error",
  "result": false,
  "message": "Failed to fetch articles"
}
```

#### NewsAPI error (400)

```json
{
  "status": "error",
  "result": false,
  "message": "apiKeyInvalid - Your API key is invalid or incorrect"
}
```

### Processing Flow

1. Looks up NewsAPI source object from NewsArticleAggregatorSource table
2. Builds NewsAPI request URL with keywords, date range, and domain filters
3. Makes HTTP request to NewsAPI.org
4. If ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is "true":
   - Validates response contains articles array
   - Stores articles in database via storeNewsApiArticles
   - Skips duplicate articles based on URL
5. Returns request details and full response data

### Keyword Logic

**AND keywords:**
- All keywords must appear in the article
- Example: "product recall" requires both "product" AND "recall"

**OR keywords:**
- At least one keyword must appear
- Example: "fire hazard" matches articles with "fire" OR "hazard" OR both

**NOT keywords:**
- Excludes articles containing these keywords
- Example: "politics" excludes all articles mentioning "politics"

**Combined example:**
```json
{
  "keywordsAnd": "product recall",
  "keywordsOr": "fire electrical",
  "keywordsNot": "politics"
}
```
This finds articles that:
- Must contain "product" AND "recall"
- Must contain "fire" OR "electrical" (or both)
- Must NOT contain "politics"

### Environment Variables

- `ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES`: Must be "true" to enable external API calls and database storage
- NewsAPI API key must be configured in the NewsAPI source object in the database
