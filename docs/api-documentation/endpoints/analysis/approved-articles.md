# Analysis Approved Articles API

This router provides analytics and statistics for approved articles grouped by state. It generates summary data showing article counts by state across different time periods.

All endpoints are prefixed with `/analysis/approved-articles`.

## GET /analysis/approved-articles/by-state

Get approved article counts grouped by state with time-based breakdowns.

- Requires authentication (JWT token)
- Returns article counts for all-time, current month, and since last submitted report
- Includes unassigned articles (articles without state assignments)
- Results sorted by total count descending

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/approved-articles/by-state' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articleCountByStateArray": [
    {
      "State": "California",
      "Count": 145,
      "January": 12,
      "Count since last report": 23
    },
    {
      "State": "Texas",
      "Count": 89,
      "January": 8,
      "Count since last report": 15
    },
    {
      "State": "New York",
      "Count": 76,
      "January": 5,
      "Count since last report": 10
    },
    {
      "State": "Unassigned",
      "Count": 34,
      "January": 4,
      "Count since last report": 8
    },
    {
      "State": "Total",
      "Count": 344,
      "January": 29,
      "Count since last report": 56
    }
  ],
  "unassignedArticlesArray": [
    {
      "id": 123,
      "title": "Product Recall Announced",
      "description": "A nationwide recall was issued...",
      "url": "https://example.com/article/123",
      "urlToImage": "https://example.com/images/123.jpg",
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
  "error": "Internal server error"
}
```

### Response Structure

**articleCountByStateArray:**
- Array of objects, each representing a state's article counts
- Sorted by total "Count" in descending order
- Last item is always the "Total" row with summed counts
- Column for current month is dynamically named (e.g., "January", "February", etc.)

**Fields per state:**
- `State` (string): Name of the state or "Unassigned" or "Total"
- `Count` (number): All-time count of approved articles for this state
- `[CurrentMonth]` (number): Count of approved articles in the current month (dynamic key based on current month name)
- `Count since last report` (number): Count of approved articles since the last submitted report

**unassignedArticlesArray:**
- Array of article objects that have been approved but have no state assignment
- Includes full article details (id, title, description, url, urlToImage, publishedDate, createdAt, updatedAt)

### Time Period Calculations

**All-time count:**
- All approved articles ever recorded for each state

**Current month count:**
- Articles approved in the current calendar month
- Determined by comparing ArticleApproveds.createdAt with current month/year

**Since last report count:**
- Articles approved after the last submitted report date
- Determined by comparing ArticleApproveds.createdAt with the date from getDateOfLastSubmittedReport()
- If no previous report exists, this count will be 0

### Use Cases

- Generate monthly reporting summaries
- Identify states with high article volumes
- Track unassigned articles that need state assignment
- Monitor approval activity since last report submission
- Generate statistics for dashboards and analytics
