# Analysis LLM01 API

This router handles AI-powered article analysis using OpenAI's GPT-4o-mini model. It scrapes article content, processes it with a custom prompt template, and stores the structured analysis results in the database.

All endpoints are prefixed with `/analysis/llm01`.

## POST /analysis/llm01/:articleId

Analyze an article using OpenAI's GPT-4o-mini model and store the results.

- Requires authentication (JWT token)
- Fetches article from database
- Scrapes article content from the article's URL
- Processes content through OpenAI API using a custom prompt template
- Parses AI response and stores key-value pairs in the database
- Optionally saves AI response to file for backup

### Parameters

- `articleId` (number, required, URL parameter): ID of the article to analyze

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm01/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Successfully processed article with OpenAI and saved to database",
  "aiResponse": {
    "id": "chatcmpl-123456",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "{\"category\":\"product_safety\",\"hazard_level\":\"high\",\"product_type\":\"consumer_electronics\"}"
        },
        "finish_reason": "stop"
      }
    ],
    "usage": {
      "prompt_tokens": 250,
      "completion_tokens": 50,
      "total_tokens": 300
    }
  },
  "scraping": {
    "status": "success",
    "contentLength": 5432
  },
  "database": {
    "saved": true,
    "deletedCount": 3,
    "createdCount": 4
  },
  "file": {
    "saved": true,
    "filePath": "/path/to/resources/llm-01/responses/123_2024-01-15T10-30-00-000Z.json",
    "error": null
  }
}
```

### Error Responses

#### Article not found (404)

```json
{
  "result": false,
  "message": "Article not found with ID: 123"
}
```

#### Template file error (500)

```json
{
  "result": false,
  "message": "Error reading template file",
  "error": "ENOENT: no such file or directory"
}
```

#### OpenAI API key not configured (500)

```json
{
  "result": false,
  "message": "KEY_OPEN_AI environment variable not configured"
}
```

#### OpenAI API error (500)

```json
{
  "result": false,
  "message": "Error calling OpenAI API",
  "error": "Request failed with status code 401"
}
```

#### Database save error (500)

```json
{
  "result": false,
  "message": "Error saving AI response to database",
  "error": "AI entity \"Open AI 4o mini API\" not found in database. Please create it first using POST /artificial-intelligence/add-entity",
  "aiResponse": {
    "id": "chatcmpl-123456",
    "object": "chat.completion",
    "created": 1677652288,
    "model": "gpt-4o-mini",
    "choices": [
      {
        "index": 0,
        "message": {
          "role": "assistant",
          "content": "{\"category\":\"product_safety\"}"
        },
        "finish_reason": "stop"
      }
    ]
  }
}
```

#### General server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Unexpected error message"
}
```

### Processing Flow

1. Fetches article record from database using articleId
2. Scrapes article content from the article's URL (using scraper module)
3. Reads prompt template from `src/templates/prompt-markdown/prompt02.md`
4. Replaces placeholders in template with article title, description, and scraped content
5. Calls OpenAI API with the constructed prompt (model: gpt-4o-mini, temperature: 0, max_tokens: 100)
6. Parses JSON response from AI
7. Deletes existing analysis records for this article and AI entity
8. Creates new records in ArticleEntityWhoCategorizedArticleContracts02 table for each key-value pair
9. Saves AI response to backup file in PATH_PROJECT_RESOURCES/llm-01/responses/
10. Returns comprehensive result with AI response, scraping status, database save status, and file save status

### Database Storage

The AI response is parsed and stored in the `ArticleEntityWhoCategorizedArticleContracts02` table with the following structure:

- Each key-value pair from the AI's JSON response becomes a separate database record
- Values are stored in type-specific columns: `valueString`, `valueNumber`, or `valueBoolean`
- The AI entity "Open AI 4o mini API" must exist in the database before using this endpoint
- Existing records for the same article and AI entity are deleted before new records are created
- A `scrapingStatus` record (with value "success" or "fail") is also stored

## POST /analysis/llm01/scrape/:articleId

Test endpoint to scrape article content without calling OpenAI API.

- Requires authentication (JWT token)
- Useful for testing scraper functionality and debugging scraping issues
- Returns scraped content and performance metrics

### Parameters

- `articleId` (number, required, URL parameter): ID of the article to scrape

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm01/scrape/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{}'
```

### Sample Response

```json
{
  "result": true,
  "article": {
    "id": "123",
    "title": "Product Recall: Fire Hazard Detected in Consumer Electronics",
    "url": "https://example.com/article/product-recall-fire-hazard"
  },
  "scraping": {
    "success": true,
    "duration": "1234ms",
    "contentLength": 5432,
    "content": "Full scraped article text content here...",
    "error": null
  }
}
```

### Error Responses

#### Article not found (404)

```json
{
  "result": false,
  "message": "Article not found with ID: 123"
}
```

#### Scraping failed (200 with error details)

```json
{
  "result": true,
  "article": {
    "id": "123",
    "title": "Article Title",
    "url": "https://example.com/article"
  },
  "scraping": {
    "success": false,
    "duration": "567ms",
    "contentLength": 0,
    "content": null,
    "error": {
      "message": "Request timeout",
      "stack": "Error: Request timeout\n    at ..."
    }
  }
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Unexpected error message",
  "stack": "Error: Unexpected error message\n    at ..."
}
```
