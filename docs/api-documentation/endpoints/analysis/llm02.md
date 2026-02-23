# Analysis LLM02 API

This router handles article approval workflow and AI entity authentication for external services. It provides endpoints for finding unapproved articles, authenticating AI services, and updating article approval status with LLM analysis data.

All endpoints are prefixed with `/analysis/llm02`.

## GET /analysis/llm02/no-article-approved-rows

Get articles that have no corresponding row in the ArticleApproveds table.

- Requires authentication (JWT token)
- Returns up to 10,000 of the latest articles (ordered by id DESC)
- Useful for finding articles that need LLM analysis and approval

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm02/no-article-approved-rows' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "count": 342,
  "articles": [
    {
      "id": 5432,
      "title": "Consumer Product Recall: Fire Hazard in Electric Heaters",
      "description": "Federal safety officials announced a recall...",
      "url": "https://example.com/article/5432",
      "urlToImage": "https://example.com/images/5432.jpg",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z"
    }
  ]
}
```

### Error Responses

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

## POST /analysis/llm02/service-login

Authenticate an AI service and retrieve its entityWhoCategorizesId.

- Requires authentication (JWT token)
- Used by external AI services to identify themselves before submitting analysis results
- Returns the entityWhoCategorizesId needed for storing analysis data

### Parameters

- `name` (string, required): Name of the AI entity (e.g., "Open AI 4o mini API")

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm02/service-login' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Open AI 4o mini API"
}'
```

### Sample Response

```json
{
  "result": true,
  "name": "Open AI 4o mini API",
  "entityWhoCategorizesId": 42
}
```

### Error Responses

#### Missing required field (400)

```json
{
  "result": false,
  "message": "Missing required field: name"
}
```

#### AI entity not found (404)

```json
{
  "result": false,
  "message": "AI entity with name \"Unknown AI\" not found in database"
}
```

#### No associated entity (404)

```json
{
  "result": false,
  "message": "No EntityWhoCategorizedArticle associated with AI entity \"Open AI 4o mini API\""
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database query failed"
}
```

## POST /analysis/llm02/update-approved-status

Update article approval status and store LLM analysis results.

- Requires authentication (JWT token)
- Creates ArticleApproveds row with approval status
- Creates ArticleStateContracts row if article is approved and stateId is provided
- Stores LLM analysis key-value pairs in ArticleEntityWhoCategorizedArticleContracts02
- Skips articles that already exist in ArticleApproveds table
- If isApproved is true, stateId must be provided

### Parameters

- `articleId` (number, required): ID of the article being approved
- `isApproved` (boolean, required): Whether the article is approved (true) or rejected (false)
- `entityWhoCategorizesId` (number, required): ID of the AI entity that categorized the article
- `llmAnalysis` (object, required): Analysis results from the LLM (key-value pairs)
- `articleApprovedTextForPdfReport` (string, optional): Custom text for PDF reports
- `stateId` (number, required if isApproved=true): State ID for approved articles

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm02/update-approved-status' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "articleId": 123,
  "isApproved": true,
  "entityWhoCategorizesId": 42,
  "stateId": 5,
  "articleApprovedTextForPdfReport": "Fire hazard in consumer electronics",
  "llmAnalysis": {
    "llmName": "gpt-4o-mini",
    "category": "product_safety",
    "hazardLevel": "high",
    "productType": "consumer_electronics",
    "isRelevant": true,
    "confidenceScore": 0.95
  }
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Article approval status updated successfully",
  "articleId": 123,
  "title": "Consumer Product Recall: Fire Hazard in Electric Heaters",
  "isApproved": true,
  "articleApproved": {
    "id": 456,
    "created": true
  },
  "articleStateContract": {
    "id": 789,
    "created": true
  },
  "llmAnalysisRecords": {
    "deletedCount": 0,
    "createdCount": 7
  }
}
```

### Error Responses

#### Missing required fields (400)

```json
{
  "result": false,
  "message": "Missing required fields: articleId, isApproved, entityWhoCategorizesId, llmAnalysis"
}
```

#### Missing stateId for approved article (400)

```json
{
  "result": false,
  "skipped": true,
  "message": "Cannot approve article without stateId. Both isApproved=true and stateId are required for approval.",
  "articleId": 123
}
```

#### Article already approved (200 with skipped flag)

```json
{
  "result": false,
  "skipped": true,
  "message": "Article already in ArticleApproveds table",
  "articleId": 123,
  "title": "Consumer Product Recall: Fire Hazard in Electric Heaters",
  "existingIsApproved": true
}
```

#### Article not found (404)

```json
{
  "result": false,
  "message": "Article not found with ID: 123"
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database transaction failed"
}
```

### LLM Analysis Storage

The `llmAnalysis` object is stored in the `ArticleEntityWhoCategorizedArticleContracts02` table with the following behavior:

**Successful LLM Response:**
- A record with key `llmResponse` and value `"success"` is created
- A record with key `llmName` and the LLM name is created (if provided)
- Each key-value pair in `llmAnalysis` becomes a separate database record
- Values are stored in type-specific columns: `valueString`, `valueNumber`, or `valueBoolean`

**Failed LLM Response:**
- If `llmAnalysis.llmResponse === "failed"`, only two records are created:
  - One with key `llmResponse` and value `"failed"`
  - One with key `llmName` and the LLM name (if provided)

**Data Management:**
- Existing records for the same articleId and entityWhoCategorizesId are deleted before new records are created
- This ensures only the latest analysis is stored
