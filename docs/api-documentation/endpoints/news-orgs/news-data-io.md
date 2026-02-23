# NewsData.IO API

This router integrates with the NewsData.io service to fetch and store news articles. It provides an endpoint for making requests to NewsData.io with advanced filtering options.

All endpoints are prefixed with `/news-data-io`.

## POST /news-data-io/get-articles

Fetch articles from NewsData.io with advanced filtering options and save to database.

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
- `includeWebsiteDomainObjArray` (array, optional): Array of website domain objects to include
- `excludeWebsiteDomainObjArray` (array, optional): Array of website domain objects to exclude

### Sample Request

```bash
curl --location 'http://localhost:3000/news-data-io/get-articles' \
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
    "status": "success",
    "totalResults": 87,
    "results": [
      {
        "title": "Major Product Recall: Fire Hazard in Electric Heaters",
        "link": "https://consumerreports.org/article/123",
        "keywords": ["product safety", "recall", "fire hazard"],
        "creator": ["Jane Smith"],
        "video_url": null,
        "description": "Federal safety officials announced a nationwide recall...",
        "content": "Full article content here...",
        "pubDate": "2024-01-10 14:30:00",
        "image_url": "https://consumerreports.org/images/123.jpg",
        "source_id": "consumerreports",
        "source_priority": 500000,
        "country": ["united states"],
        "category": ["business"],
        "language": "english"
      }
    ],
    "nextPage": "1234567890"
  },
  "newsApiRequest": {
    "newsArticleAggregatorSourceId": 3,
    "andString": "product recall safety",
    "orString": "fire hazard injury",
    "notString": "politics entertainment",
    "requestUrl": "https://newsdata.io/api/1/news?q=...",
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

#### NewsData.io API error (400)

```json
{
  "status": "error",
  "result": false,
  "message": "Invalid API key"
}
```

### Processing Flow

1. Looks up NewsData.IO source object from NewsArticleAggregatorSource table (nameOfOrg: "NewsData.IO")
2. Builds NewsData.io request URL with keywords, date range, and domain filters
3. Makes HTTP request to NewsData.io API
4. If ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is "true":
   - Validates response has status "success"
   - Validates response contains results array
   - Stores articles in database via storeNewsDataIoArticles
   - Skips duplicate articles based on URL
5. Returns request details and full response data

### NewsData.io API Features

NewsData.io provides additional filtering capabilities beyond keywords:
- **country**: Filter by country (e.g., "us" for United States)
- **language**: Filter by language (e.g., "en" for English)
- **excludecategory**: Exclude specific categories (e.g., "entertainment,world,politics")

These parameters can be configured in the NewsData.IO source object in the database.

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

### Environment Variables

- `ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES`: Must be "true" to enable external API calls and database storage
- NewsData.io API key must be configured in the NewsData.IO source object in the database

### Response Fields

NewsData.io returns articles in the "results" array (not "articles" like other providers). Each article includes:
- Rich metadata: keywords, creator, category, country, language
- Source information: source_id, source_priority
- Pagination support: nextPage token for fetching additional results
- Optional video_url for video content
