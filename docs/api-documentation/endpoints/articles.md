# Articles API

This router manages news articles including retrieval, filtering, approval workflow, state assignments, and AI ratings. It is the central API for article management in the NewsNexus system.

All endpoints are prefixed with `/articles`.

## POST /articles/

Get filtered list of articles with comprehensive metadata.

- Requires authentication (JWT token)
- Supports multiple filter criteria
- Returns articles with states, relevance status, approval status, and keyword information
- Complex query with multiple table joins

### Parameters

- `returnOnlyThisPublishedDateOrAfter` (string, optional): ISO date string to filter articles published on or after this date
- `returnOnlyThisCreatedAtDateOrAfter` (string, optional): ISO date string to filter articles created on or after this date
- `returnOnlyIsNotApproved` (boolean, optional): If true, returns only articles that haven't been approved
- `returnOnlyIsRelevant` (boolean, optional): If true, returns only articles marked as relevant

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "returnOnlyThisPublishedDateOrAfter": "2024-01-01",
  "returnOnlyIsNotApproved": true,
  "returnOnlyIsRelevant": true
}'
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 123,
      "title": "Product Recall: Fire Hazard",
      "description": "Federal safety officials announced...",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "url": "https://example.com/article/123",
      "States": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        }
      ],
      "statesStringCommaSeparated": "CA",
      "ArticleIsRelevant": true,
      "articleIsApproved": false,
      "keyword": "AND product recall OR fire hazard",
      "NewsApiRequest": {
        "andString": "product recall",
        "orString": "fire hazard",
        "notString": null
      }
    }
  ]
}
```

## GET /articles/approved

Get all approved articles with report submission status.

- Requires authentication (JWT token)
- Returns performance timing metrics
- Includes state assignments and report submission status

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/approved' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 123,
      "title": "Product Recall: Fire Hazard",
      "description": "Federal safety officials announced...",
      "isSubmitted": "Yes",
      "articleHasBeenAcceptedByAll": true,
      "stateAbbreviation": "CA, TX",
      "States": [
        {"id": 5, "name": "California", "abbreviation": "CA"},
        {"id": 48, "name": "Texas", "abbreviation": "TX"}
      ],
      "ArticleApproveds": [
        {"isApproved": true, "userId": 5}
      ],
      "ArticleReportContracts": [
        {"reportId": 10, "articleAcceptedByCpsc": 1}
      ]
    }
  ],
  "timeToRenderResponseFromApiInSeconds": 1.234
}
```

## POST /articles/update-approved

Update the PDF report text for an approved article.

- Requires authentication (JWT token)
- Updates textForPdfReport field in ArticleApproveds table

### Parameters

- `articleId` (number, required): ID of the article
- `contentToUpdate` (string, required): New text content for PDF reports

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/update-approved' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "articleId": 123,
  "contentToUpdate": "Updated fire hazard description for PDF report"
}'
```

### Sample Response

```json
{
  "result": true,
  "articleApprovedArrayModified": [
    {
      "id": 456,
      "articleId": 123,
      "userId": 5,
      "isApproved": true,
      "textForPdfReport": "Updated fire hazard description for PDF report"
    }
  ]
}
```

## POST /articles/update-approved-all/:articleId

Update all editable fields for an approved article.

- Requires authentication (JWT token)
- Updates article metadata, content, and state assignments
- Comprehensive update endpoint for article editing

### Parameters

- `articleId` (number, required, URL parameter): ID of the article
- `newPublicationName` (string, optional): Updated publication name
- `newTitle` (string, optional): Updated article title
- `newUrl` (string, optional): Updated article URL
- `newPublishedDate` (string, optional): Updated publication date
- `newStateIdsArray` (array, optional): Array of state IDs to assign
- `newContent` (string, optional): Updated article content

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/update-approved-all/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "newTitle": "Updated Product Recall Title",
  "newPublicationName": "Safety News Daily",
  "newPublishedDate": "2024-01-15",
  "newStateIdsArray": [5, 36, 48],
  "newContent": "Updated article content"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Article updated successfully",
  "article": {
    "id": 123,
    "title": "Updated Product Recall Title",
    "publicationName": "Safety News Daily",
    "publishedDate": "2024-01-15T00:00:00.000Z"
  }
}
```

## POST /articles/user-toggle-is-not-relevant/:articleId

Toggle article relevance status.

- Requires authentication (JWT token)
- If article is marked as not relevant, removes the flag
- If article is relevant, marks it as not relevant
- Toggle behavior for easy UI interaction

### Parameters

- `articleId` (number, required, URL parameter): ID of the article

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/user-toggle-is-not-relevant/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{}'
```

### Sample Response (Marking as not relevant)

```json
{
  "result": true,
  "status": "articleId 123 is marked as NOT relevant",
  "articleIsRelevant": false
}
```

### Sample Response (Marking as relevant)

```json
{
  "result": true,
  "status": "articleId 123 is made relevant",
  "articleIsRelevant": true
}
```

## GET /articles/get-approved/:articleId

Get approval data for a specific article.

- Requires authentication (JWT token)
- Returns article with states and approval details
- Returns articleIsApproved: false if article not approved

### Parameters

- `articleId` (number, required, URL parameter): ID of the article

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/get-approved/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response (Approved)

```json
{
  "articleIsApproved": true,
  "article": {
    "id": 123,
    "title": "Product Recall: Fire Hazard",
    "description": "Federal safety officials...",
    "url": "https://example.com/article/123",
    "ArticleIsRelevants": []
  },
  "content": "Text for PDF report",
  "States": [
    {"id": 5, "name": "California", "abbreviation": "CA"}
  ]
}
```

### Sample Response (Not Approved)

```json
{
  "articleIsApproved": false,
  "article": {}
}
```

## POST /articles/approve/:articleId

Approve or un-approve an article.

- Requires authentication (JWT token)
- Creates or updates ArticleApproveds record
- Supports both approval and un-approval actions

### Parameters

- `articleId` (number, required, URL parameter): ID of the article
- `approvedStatus` (string, required): Either "Approve" or "Un-approve"
- `headlineForPdfReport` (string, optional): Custom headline for PDF reports
- Additional fields from req.body are saved to ArticleApproveds

### Sample Request (Approve)

```bash
curl --location 'http://localhost:3000/articles/approve/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "approvedStatus": "Approve",
  "headlineForPdfReport": "Fire Hazard in Electric Heaters",
  "textForPdfReport": "Federal safety officials announced..."
}'
```

### Sample Response

```json
{
  "result": true,
  "status": "articleId 123 is approved"
}
```

## GET /articles/summary-statistics

Get summary statistics for articles.

- Requires authentication (JWT token)
- Returns counts for various article categories
- Includes time-based filtering (since last Thursday 20:00 EST)

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/summary-statistics' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "summaryStatistics": {
    "articlesCount": 5432,
    "articlesSinceLastThursday20hEst": 145,
    "articleHasStateCount": 892,
    "articleIsApprovedCount": 456,
    "approvedButNotInReportCount": 78
  }
}
```

## POST /articles/add-article

Manually add a new article to the database.

- Requires authentication (JWT token)
- Creates article and associated records (states, approval, content)
- For manually found articles not from API sources

### Parameters

- `publicationName` (string, required): Name of the publication
- `author` (string, optional): Article author
- `title` (string, required): Article title
- `description` (string, optional): Article description
- `content` (string, optional): Full article content
- `url` (string, required): Article URL
- `publishedDate` (string, required): Publication date
- `stateObjArray` (array, required): Array of state objects with id field
- `isApproved` (boolean, optional): Whether to approve immediately
- `kmNotes` (string, optional): Knowledge management notes

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/add-article' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "publicationName": "Consumer Reports",
  "author": "Jane Smith",
  "title": "Fire Hazard Alert",
  "description": "Product recall announced",
  "content": "Full article text here",
  "url": "https://example.com/article",
  "publishedDate": "2024-01-15",
  "stateObjArray": [{"id": 5}, {"id": 48}],
  "isApproved": true,
  "kmNotes": "Found via manual search"
}'
```

### Sample Response

```json
{
  "result": true,
  "newArticle": {
    "id": 5433,
    "publicationName": "Consumer Reports",
    "author": "Jane Smith",
    "title": "Fire Hazard Alert",
    "description": "Product recall announced",
    "url": "https://example.com/article",
    "publishedDate": "2024-01-15T00:00:00.000Z",
    "entityWhoFoundArticleId": 12
  }
}
```

## DELETE /articles/:articleId

Delete an article and all associated records.

- Requires authentication (JWT token)
- Cascades deletion to ArticleApproveds, ArticleIsRelevant, ArticleStateContract, ArticleContent

### Parameters

- `articleId` (number, required, URL parameter): ID of the article to delete

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:3000/articles/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "status": "articleId 123 deleted"
}
```

## POST /articles/is-being-reviewed/:articleId

Mark article as being reviewed or not being reviewed.

- Requires authentication (JWT token)
- Prevents concurrent editing by multiple users
- Uses upsert for efficient database operations

### Parameters

- `articleId` (number, required, URL parameter): ID of the article
- `isBeingReviewed` (boolean, required): True to mark as being reviewed, false to unmark

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/is-being-reviewed/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "isBeingReviewed": true
}'
```

### Sample Response

```json
{
  "result": true,
  "status": "articleId 123 IS being reviewed"
}
```

## POST /articles/with-ratings

Get articles with AI semantic ratings and location classifier scores.

- Requires authentication (JWT token)
- Includes ratings from NewsNexusSemanticScorer02 and NewsNexusClassifierLocationScorer01
- Complex query with multiple AI score joins
- Returns performance metrics

### Parameters

- `returnOnlyThisPublishedDateOrAfter` (string, optional): Filter by published date
- `returnOnlyThisCreatedAtDateOrAfter` (string, optional): Filter by created date
- `semanticScorerEntityName` (string, required): Name of semantic scorer AI entity
- `returnOnlyIsNotApproved` (boolean, optional): Filter out approved articles
- `returnOnlyIsRelevant` (boolean, optional): Filter for relevant articles only

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/with-ratings' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "returnOnlyThisCreatedAtDateOrAfter": "2024-01-01",
  "semanticScorerEntityName": "NewsNexusSemanticScorer02",
  "returnOnlyIsNotApproved": true,
  "returnOnlyIsRelevant": true
}'
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 123,
      "title": "Product Recall",
      "description": "Fire hazard...",
      "semanticRatingMax": 0.87,
      "semanticRatingMaxLabel": "product safety",
      "locationClassifierScore": 0.92,
      "locationClassifierScoreLabel": "California",
      "States": [
        {"id": 5, "name": "California", "abbreviation": "CA"}
      ],
      "statesStringCommaSeparated": "California"
    }
  ],
  "timeToRenderResponseFromApiInSeconds": 2.156
}
```

### Error Responses

#### AI entity not found (404)

```json
{
  "message": "AI not found."
}
```

#### No related entity (500)

```json
{
  "message": "No related EntityWhoCategorizedArticles found"
}
```

## POST /articles/table-approved-by-request

Get summary of approved articles grouped by their source API request.

- Requires authentication (JWT token)
- Shows which API requests yielded the most approved articles
- Useful for evaluating keyword effectiveness

### Parameters

- `dateRequestsLimit` (string, optional): ISO date to limit requests after this date

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/table-approved-by-request' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "dateRequestsLimit": "2024-01-01"
}'
```

### Sample Response

```json
{
  "countOfApprovedArticles": 456,
  "countOfManuallyApprovedArticles": 23,
  "requestsArray": [
    {
      "id": 1001,
      "nameOfOrg": "NewsAPI",
      "andString": "product recall",
      "orString": "fire hazard",
      "countOfApprovedArticles": 45,
      "createdAt": "2024-01-10T10:00:00.000Z"
    }
  ]
}
```

### Error Responses

#### Server error (500)

```json
{
  "error": "Failed to fetch request summary."
}
```

## GET /articles/test-sql

Test endpoint for semantic scoring queries.

- Requires authentication (JWT token)
- Returns articles with semantic ratings
- Development/testing endpoint

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/test-sql' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articlesArrayModified": [
    {
      "id": 123,
      "title": "Product Recall",
      "semanticRatingMax": 0.87,
      "semanticRatingMaxLabel": "product safety"
    }
  ]
}
```

### Error Responses

#### AI not found (404)

```json
{
  "error": "AI not found."
}
```

## GET /articles/article-details/:articleId

Get comprehensive details for a specific article.

- Requires authentication (JWT token)
- Returns all article data including states, approval status, AI assignments
- Formatted response using formatArticleDetails helper

### Parameters

- `articleId` (number, required, URL parameter): ID of the article

### Sample Request

```bash
curl --location 'http://localhost:3000/articles/article-details/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "id": 123,
  "title": "Product Recall: Fire Hazard",
  "description": "Federal safety officials...",
  "url": "https://example.com/article/123",
  "publishedDate": "2024-01-15T10:30:00.000Z",
  "stateHumanApprovedArray": [
    {"stateId": 5, "stateName": "California", "stateAbbreviation": "CA"}
  ],
  "stateAiApproved": {
    "stateId": 5,
    "stateName": "California",
    "reasoning": "Article mentions California agencies"
  },
  "isApproved": true,
  "isRelevant": true
}
```

### Error Responses

#### Invalid article ID (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid article ID provided",
    "details": "Article ID must be a valid number",
    "status": 400
  }
}
```

#### Article not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Article not found",
    "details": "No article exists with ID 123",
    "status": 404
  }
}
```

#### Server error (500)

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Failed to retrieve article details",
    "status": 500
  }
}
```
