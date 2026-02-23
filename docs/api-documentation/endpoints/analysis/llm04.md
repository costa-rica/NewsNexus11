# Analysis LLM04 API

This router handles retrieval of approved articles with AI analysis data and human approval workflow. It provides endpoints for fetching approved articles with state assignments and copying AI-approved articles to human-approved status.

All endpoints are prefixed with `/analysis/llm04`.

## GET /analysis/llm04/approved

Get all approved articles with AI analysis, state assignments, and ChatGPT categorization data.

- Requires authentication (JWT token)
- Filters results to only include articles where ArticlesApproved02.isApproved is true
- Includes state abbreviations for each article
- Returns performance metrics for the query

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm04/approved' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 123,
      "title": "Consumer Product Recall: Fire Hazard in Electric Heaters",
      "description": "Federal safety officials announced a recall...",
      "url": "https://example.com/article/123",
      "urlToImage": "https://example.com/images/123.jpg",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "stateAbbreviation": "CA",
      "ArticlesApproved02": [
        {
          "id": 456,
          "articleId": 123,
          "isApproved": true,
          "headlineForPdfReport": "Fire Hazard in Electric Heaters",
          "publicationNameForPdfReport": "Consumer Safety News",
          "publicationDateForPdfReport": "2024-01-15",
          "textForPdfReport": "Federal safety officials announced...",
          "urlForPdfReport": "https://example.com/article/123"
        }
      ],
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        }
      ]
    }
  ],
  "timeToRenderResponseFromApiInSeconds": 1.234
}
```

### Error Responses

This endpoint does not return specific error responses, but may return an empty array if no approved articles exist.

## GET /analysis/llm04/human-approved/:articleId

Copy AI-approved article data to human-approved status in the ArticleApproveds table.

- Requires authentication (JWT token)
- Validates that the article exists in ArticlesApproved02 table
- Checks article relevance in ArticleIsRelevants table
- Creates or updates ArticleApproveds record with data from ArticlesApproved02
- Prevents duplicate human approvals

### Parameters

- `articleId` (number, required, URL parameter): ID of the article to human-approve

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/llm04/human-approved/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "message": "Successfully human approved article"
}
```

### Error Responses

#### No AI approval record (404)

```json
{
  "error": "No row for articleId 123 in the ArticlesApproved02 table"
}
```

#### Multiple AI approval records (400)

```json
{
  "error": "Multiple rows in the ArticlesApproved02 table for the same articleId 123"
}
```

#### Article not relevant (400)

```json
{
  "error": "Article 123 is marked as not relevant in ArticleIsRelevants table. To approve this article, you must first mark it as relevant - in the Articles Review Page."
}
```

#### Article already human approved (400)

```json
{
  "error": "This article has already been human approved"
}
```

#### Server error (500)

```json
{
  "error": "Internal server error"
}
```

### Data Flow

1. Validates article exists in ArticlesApproved02 table (exactly one record)
2. Checks ArticleIsRelevants table - if a record exists, isRelevant must be true
3. Checks if ArticleApproveds record already exists with isApproved=true (prevents duplicates)
4. Copies data from ArticlesApproved02 to ArticleApproveds:
   - articleId
   - isApproved
   - headlineForPdfReport
   - publicationNameForPdfReport
   - publicationDateForPdfReport
   - textForPdfReport
   - urlForPdfReport
5. Sets userId to the authenticated user's ID
6. If an ArticleApproveds record exists with isApproved=false, it updates that record
7. Otherwise, creates a new ArticleApproveds record
