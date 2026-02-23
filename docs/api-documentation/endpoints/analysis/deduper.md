# Analysis Deduper API

This router handles duplicate article detection and analysis using embedding similarity scores. It integrates with the NewsNexusPythonQueuer service to process deduplication jobs and provides endpoints for analyzing duplicate articles within reports.

All endpoints are prefixed with `/analysis/deduper`.

## POST /analysis/deduper/report-checker-table

Generate duplicate article analysis for a specific report.

- Requires authentication (JWT token)
- Analyzes articles in a report for duplicates based on embedding similarity scores
- Creates an Excel file with deduplication analysis
- Returns a dictionary mapping each new article to its potential duplicates
- Filters duplicates by embedding threshold

### Parameters

- `reportId` (number, required): ID of the report to analyze
- `embeddingThresholdMinimum` (number, required): Minimum embedding similarity score (0-1 range) to include in results
- `spacerRow` (boolean, optional): Whether to include spacer rows in the Excel output

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/deduper/report-checker-table' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "reportId": 42,
  "embeddingThresholdMinimum": 0.75,
  "spacerRow": true
}'
```

### Sample Response

```json
{
  "length": 12,
  "reportArticleDictionary": {
    "123": {
      "maxEmbedding": 0.89,
      "articleReferenceNumberInReport": 5,
      "newArticleInformation": {
        "id": 123,
        "title": "Consumer Product Recall: Fire Hazard",
        "url": "https://example.com/article/123",
        "articleReportRefIdNew": 5
      },
      "approvedArticlesArray": [
        {
          "articleIdApproved": 456,
          "embeddingSearch": 0.89,
          "articleReportRefIdApproved": 3,
          "id": 456,
          "title": "Similar Fire Hazard Recall",
          "url": "https://example.com/article/456"
        },
        {
          "articleIdApproved": 789,
          "embeddingSearch": 0.82,
          "articleReportRefIdApproved": null,
          "id": 789,
          "title": "Another Similar Recall",
          "url": "https://example.com/article/789"
        }
      ]
    }
  }
}
```

### Error Responses

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database query failed"
}
```

### Response Structure

- `length`: Number of articles analyzed in the report
- `reportArticleDictionary`: Object mapping articleId to duplicate analysis
  - `maxEmbedding`: Highest embedding similarity score found for this article
  - `articleReferenceNumberInReport`: Reference number of this article in the report
  - `newArticleInformation`: Details about the new article
  - `approvedArticlesArray`: Array of potential duplicate articles, sorted by embeddingSearch score (descending)
    - `articleIdApproved`: ID of the potential duplicate article
    - `embeddingSearch`: Similarity score (0-1 range)
    - `articleReportRefIdApproved`: Reference number in report (null if not in any report)

### Excel Export

The endpoint automatically creates an Excel file with the deduplication analysis in the PATH_PROJECT_RESOURCES directory. Errors in Excel file creation are logged but do not fail the API request.

## GET /analysis/deduper/request-job/:reportId

Request a deduplication job for a specific report from the Python Queuer service.

- Requires authentication (JWT token)
- Validates that the report exists and has articles
- Sends request to NewsNexusPythonQueuer to process the deduplication job
- Returns job creation status and Python Queuer response

### Parameters

- `reportId` (number, required, URL parameter): ID of the report to process

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/deduper/request-job/42' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "message": "Job request successful",
  "articleCount": 25,
  "pythonQueuerResponse": {
    "status": "success",
    "jobId": "deduper-job-42-20240115",
    "queuePosition": 3,
    "estimatedStartTime": "2024-01-15T12:00:00.000Z"
  }
}
```

### Error Responses

#### Report has no articles (404)

```json
{
  "result": false,
  "message": "No articles found for reportId: 42"
}
```

#### Python Queuer URL not configured (500)

```json
{
  "result": false,
  "message": "URL_BASE_NEWS_NEXUS_PYTHON_QUEUER environment variable not configured"
}
```

#### Python Queuer error (varies)

```json
{
  "result": false,
  "message": "Error creating job via Python Queuer",
  "error": "Connection refused",
  "pythonQueuerResponse": {
    "error": "Service unavailable"
  }
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database connection failed"
}
```

## GET /analysis/deduper/job-list-status

Get the status of all deduplication jobs from the Python Queuer service.

- Requires authentication (JWT token)
- Fetches job queue status from NewsNexusPythonQueuer
- Returns list of pending, running, and completed jobs

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/deduper/job-list-status' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "jobs": [
    {
      "jobId": "deduper-job-42-20240115",
      "reportId": 42,
      "status": "completed",
      "startTime": "2024-01-15T12:00:00.000Z",
      "endTime": "2024-01-15T12:15:00.000Z",
      "articlesProcessed": 25
    },
    {
      "jobId": "deduper-job-43-20240115",
      "reportId": 43,
      "status": "running",
      "startTime": "2024-01-15T12:20:00.000Z",
      "articlesProcessed": 10,
      "totalArticles": 30
    },
    {
      "jobId": "deduper-job-44-20240115",
      "reportId": 44,
      "status": "pending",
      "queuePosition": 1
    }
  ]
}
```

### Error Responses

#### Python Queuer URL not configured (500)

```json
{
  "result": false,
  "message": "URL_BASE_NEWS_NEXUS_PYTHON_QUEUER environment variable not configured"
}
```

#### Python Queuer error (varies)

```json
{
  "result": false,
  "message": "Error fetching job list from Python Queuer",
  "error": "Request timeout",
  "pythonQueuerResponse": {
    "error": "Service timeout"
  }
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Network error"
}
```

## DELETE /analysis/deduper/clear-article-duplicate-analyses-table

Clear all records from the ArticleDuplicateAnalysis table via the Python Queuer service.

- Requires authentication (JWT token)
- Sends DELETE request to NewsNexusPythonQueuer to clear the table
- Use with caution - this deletes all deduplication analysis data

### Parameters

None

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:3000/analysis/deduper/clear-article-duplicate-analyses-table' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "message": "Article duplicate analyses table cleared successfully",
  "pythonQueuerResponse": {
    "status": "success",
    "recordsDeleted": 1547
  }
}
```

### Error Responses

#### Python Queuer URL not configured (500)

```json
{
  "result": false,
  "message": "URL_BASE_NEWS_NEXUS_PYTHON_QUEUER environment variable not configured"
}
```

#### Python Queuer error (varies)

```json
{
  "result": false,
  "message": "Error clearing table via Python Queuer",
  "error": "Permission denied",
  "pythonQueuerResponse": {
    "error": "Unauthorized"
  }
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Network error"
}
```

## GET /analysis/deduper/article-duplicate-analyses-status

Check if the ArticleDuplicateAnalysis table contains data and identify which report it's associated with.

- Requires authentication (JWT token)
- Returns status indicating whether table is populated or empty
- If populated, returns the reportId of the analysis data

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/deduper/article-duplicate-analyses-status' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response (Populated)

```json
{
  "status": "populated",
  "reportId": 42
}
```

### Sample Response (Empty)

```json
{
  "status": "empty",
  "reportId": null
}
```

### Error Responses

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database query failed"
}
```
