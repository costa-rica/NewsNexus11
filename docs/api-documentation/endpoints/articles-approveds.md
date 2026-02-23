# Articles Approveds API

This router provides access to approved articles data optimized for frontend components. It retrieves approved articles with associated metadata for display in user interfaces.

All endpoints are prefixed with `/articles-approveds`.

## GET /articles-approveds/for-component

Get approved articles formatted for frontend component consumption.

- Requires authentication (JWT token)
- Returns articles approved by the authenticated user
- Includes comprehensive article metadata
- Optimized query for frontend performance

### Parameters

None (uses authenticated user's ID from JWT token)

### Sample Request

```bash
curl --location 'http://localhost:3000/articles-approveds/for-component' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articlesArray": [
    {
      "id": 123,
      "title": "Major Product Recall: Fire Hazard in Electric Heaters",
      "description": "Federal safety officials announced a nationwide recall...",
      "url": "https://example.com/article/123",
      "urlToImage": "https://example.com/images/123.jpg",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "updatedAt": "2024-01-15T11:00:00.000Z",
      "approvalData": {
        "isApproved": true,
        "approvedAt": "2024-01-15T14:00:00.000Z",
        "userId": 5,
        "textForPdfReport": "Fire hazard in electric heaters..."
      },
      "states": [
        {
          "id": 5,
          "name": "California",
          "abbreviation": "CA"
        }
      ],
      "aiAnalysis": {
        "category": "product_safety",
        "hazardLevel": "high",
        "confidenceScore": 0.95
      }
    },
    {
      "id": 456,
      "title": "Consumer Safety Alert: Electrical Products",
      "description": "Another product safety incident...",
      "url": "https://example.com/article/456",
      "urlToImage": "https://example.com/images/456.jpg",
      "publishedDate": "2024-01-14T08:15:00.000Z",
      "createdAt": "2024-01-14T09:00:00.000Z",
      "updatedAt": "2024-01-14T09:00:00.000Z",
      "approvalData": {
        "isApproved": true,
        "approvedAt": "2024-01-14T16:30:00.000Z",
        "userId": 5,
        "textForPdfReport": "Electrical product safety concerns..."
      },
      "states": [
        {
          "id": 48,
          "name": "Texas",
          "abbreviation": "TX"
        },
        {
          "id": 36,
          "name": "New York",
          "abbreviation": "NY"
        }
      ],
      "aiAnalysis": {
        "category": "product_safety",
        "hazardLevel": "medium",
        "confidenceScore": 0.87
      }
    }
  ],
  "count": 2
}
```

### Error Responses

#### Server error (500)

```json
{
  "error": "Failed to fetch approved articles for component.",
  "message": "Database connection failed"
}
```

### Response Structure

The response includes comprehensive article data formatted for frontend display:

**Article Fields:**
- Basic article information (id, title, description, url, images, dates)
- Approval metadata (who approved, when, custom text for reports)
- Associated states (one or more states per article)
- AI analysis results (categorization, scoring, confidence levels)

### Use Cases

This endpoint is designed for:
- Displaying approved articles in dashboards
- Showing user's approval history
- Building article lists with state and AI metadata
- Frontend components that need complete article context

### Data Relationships

The query joins multiple tables to provide:
- Article base data from Articles table
- Approval information from ArticleApproveds table
- State assignments from ArticleStateContracts and States tables
- AI analysis from ArticleEntityWhoCategorizedArticleContracts02 table

### Performance Considerations

- Optimized SQL query using sqlQueryArticlesApprovedForComponent
- Filters by user ID to limit result set
- Returns only approved articles (isApproved = true)
- May return large datasets for users who have approved many articles
