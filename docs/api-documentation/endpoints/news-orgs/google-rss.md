# Google RSS API

This router fetches articles from Google News RSS feeds using custom query builders. It provides a two-step workflow: first fetch and preview articles, then optionally save them to the database.

All endpoints are prefixed with `/google-rss`.

## POST /google-rss/make-request

Fetch articles from Google News RSS feed without saving to database.

- Requires authentication (JWT token)
- Builds custom Google News RSS query from keywords and phrases
- Returns parsed articles for preview/review
- Does not save articles to database
- Handles rate limiting (HTTP 503) gracefully

### Parameters

- `and_keywords` (string, optional): Space-separated keywords that must all appear (AND logic)
- `and_exact_phrases` (string, optional): Comma-separated exact phrases that must all appear
- `or_keywords` (string, optional): Space-separated keywords where at least one must appear (OR logic)
- `or_exact_phrases` (string, optional): Comma-separated exact phrases where at least one must appear
- `time_range` (string, optional): Time range filter (e.g., "when:7d" for last 7 days)

At least one of: and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided.

### Sample Request

```bash
curl --location 'http://localhost:3000/google-rss/make-request' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "and_keywords": "product recall",
  "and_exact_phrases": "consumer safety",
  "or_keywords": "fire hazard injury",
  "time_range": "when:7d"
}'
```

### Sample Response

```json
{
  "success": true,
  "url": "https://news.google.com/rss/search?q=product+recall+%22consumer+safety%22+fire+OR+hazard+OR+injury+when:7d",
  "articlesArray": [
    {
      "title": "Major Product Recall Announced Due to Fire Hazard",
      "link": "https://example.com/article/123",
      "description": "Federal safety officials announced a nationwide recall...",
      "content": "Full article content or snippet here...",
      "pubDate": "2024-01-15T10:30:00.000Z",
      "source": "Safety News"
    },
    {
      "title": "Consumer Safety Alert: Electrical Products",
      "link": "https://example.com/article/456",
      "description": "Another product safety incident...",
      "content": "Article content...",
      "pubDate": "2024-01-14T08:15:00.000Z",
      "source": "Consumer Reports"
    }
  ],
  "count": 2
}
```

### Error Responses

#### Missing required parameters (400)

```json
{
  "success": false,
  "error": "Invalid parameters",
  "message": "At least one of and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided"
}
```

#### Rate limit exceeded (503)

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Google News returned HTTP 503. Please wait before retrying.",
  "statusCode": 503
}
```

#### RSS fetch error (500)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "Failed to fetch RSS feed: Connection timeout"
}
```

#### Server error (500)

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## POST /google-rss/add-to-database

Save previously fetched Google RSS articles to the database.

- Requires authentication (JWT token)
- Stores articles and creates request record in database
- Skips duplicate articles automatically
- Validates article structure before saving
- Returns detailed save statistics

### Parameters

- `articlesArray` (array, required): Array of article objects from /make-request response
- `url` (string, required): The Google RSS URL used to fetch articles
- `and_keywords` (string, optional): AND keywords from original request
- `and_exact_phrases` (string, optional): AND exact phrases from original request
- `or_keywords` (string, optional): OR keywords from original request
- `or_exact_phrases` (string, optional): OR exact phrases from original request
- `time_range` (string, optional): Time range from original request

Each article object must have:
- `title` (string, required)
- `link` (string, required)
- At least one of: `description` or `content`

### Sample Request

```bash
curl --location 'http://localhost:3000/google-rss/add-to-database' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "url": "https://news.google.com/rss/search?q=product+recall",
  "and_keywords": "product recall",
  "and_exact_phrases": "consumer safety",
  "articlesArray": [
    {
      "title": "Major Product Recall Announced",
      "link": "https://example.com/article/123",
      "description": "Federal safety officials announced...",
      "content": "Full content here...",
      "pubDate": "2024-01-15T10:30:00.000Z",
      "source": "Safety News"
    }
  ]
}'
```

### Sample Response

```json
{
  "success": true,
  "newsApiRequestId": 789,
  "articlesReceived": 25,
  "articlesSaved": 22,
  "articleIds": [1234, 1235, 1236, 1237, 1238],
  "message": "Successfully saved 22 of 25 articles to database (3 duplicates skipped)"
}
```

### Error Responses

#### Invalid articlesArray (400)

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "articlesArray must be a non-empty array"
}
```

#### Missing URL (400)

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "url is required and must be a string"
}
```

#### Invalid article structure (400)

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "Each article must have at least title and link fields"
}
```

#### Missing description/content (400)

```json
{
  "success": false,
  "error": "Invalid request",
  "message": "Each article must have at least one of description or content"
}
```

#### Database error (500)

```json
{
  "success": false,
  "error": "Database error",
  "message": "Failed to save articles: Connection timeout"
}
```

### Two-Step Workflow

**Step 1: Preview Articles**
1. Call POST /google-rss/make-request with search parameters
2. Review returned articles
3. Verify count and quality

**Step 2: Save to Database**
1. Call POST /google-rss/add-to-database with the articlesArray and url from step 1
2. System automatically:
   - Creates NewsApiRequest record
   - Saves articles to Articles table
   - Links articles to NewsApiRequest
   - Skips duplicates (based on URL)
   - Associates with Google RSS aggregator source

### Database Storage

Articles are stored with:
- Full article metadata (title, description, content, URL, publication date)
- Link to NewsApiRequest record (tracks when/how article was found)
- Link to EntityWhoFoundArticle (identifies Google RSS as the source)
- Link to NewsArticleAggregatorSource (identifies this as a Google RSS article)
