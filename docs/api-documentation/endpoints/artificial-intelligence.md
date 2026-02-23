# Artificial Intelligence API

This router manages AI model entities used for article analysis and categorization. It provides endpoints for registering AI models and retrieving articles for semantic scoring.

All endpoints are prefixed with `/artificial-intelligence`.

## POST /artificial-intelligence/add-entity

Register a new AI entity for article categorization.

- Requires authentication (JWT token)
- Creates both an ArtificialIntelligence record and associated EntityWhoCategorizedArticle record
- Supports HuggingFace model integration

### Parameters

- `name` (string, required): Name of the AI entity (e.g., "Open AI 4o mini API", "NewsNexusSemanticScorer02")
- `description` (string, optional): Description of the AI entity's purpose
- `huggingFaceModelName` (string, optional): HuggingFace model identifier (e.g., "Xenova/paraphrase-MiniLM-L6-v2")
- `huggingFaceModelType` (string, optional): Type of HuggingFace model (e.g., "feature-extraction", "text-classification")

### Sample Request

```bash
curl --location 'http://localhost:3000/artificial-intelligence/add-entity' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "name": "Open AI 4o mini API",
  "description": "OpenAI GPT-4o-mini model for article categorization and safety analysis",
  "huggingFaceModelName": null,
  "huggingFaceModelType": null
}'
```

### Sample Response

```json
{
  "message": "Artificial Intelligence created successfully",
  "ai": {
    "id": 5,
    "name": "Open AI 4o mini API",
    "description": "OpenAI GPT-4o-mini model for article categorization and safety analysis",
    "huggingFaceModelName": null,
    "huggingFaceModelType": null,
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  },
  "entity": {
    "id": 12,
    "artificialIntelligenceId": 5,
    "userId": null,
    "newsArticleAggregatorSourceId": null,
    "createdAt": "2024-01-15T14:30:00.000Z",
    "updatedAt": "2024-01-15T14:30:00.000Z"
  }
}
```

### Use Cases

AI entities must be created before they can be used in analysis workflows. Common entities include:

**OpenAI Models:**
```json
{
  "name": "Open AI 4o mini API",
  "description": "GPT-4o-mini for article analysis"
}
```

**HuggingFace Models:**
```json
{
  "name": "NewsNexusSemanticScorer02",
  "description": "Semantic similarity scoring for keyword matching",
  "huggingFaceModelName": "Xenova/paraphrase-MiniLM-L6-v2",
  "huggingFaceModelType": "feature-extraction"
}
```

**Location Classifier:**
```json
{
  "name": "NewsNexusClassifierLocationScorer01",
  "description": "Geographic location classifier for state assignment"
}
```

## GET /artificial-intelligence/articles-for-semantic-scoring

Get articles that need semantic similarity scoring.

- Requires authentication (JWT token)
- Returns articles that don't have semantic scores from NewsNexusSemanticScorer02
- Prioritizes articles with descriptions; falls back to PDF report text
- Used by external semantic scoring services to get their work queue

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/artificial-intelligence/articles-for-semantic-scoring' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "articleCount": 145,
  "articlesArray": [
    {
      "id": 123,
      "title": "Major Product Recall: Fire Hazard in Electric Heaters",
      "description": "Federal safety officials announced a nationwide recall...",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "url": "https://example.com/article/123"
    },
    {
      "id": 456,
      "title": "Consumer Safety Alert: Electrical Products",
      "description": "Text for PDF report from ArticleApproveds table",
      "publishedDate": "2024-01-14T08:15:00.000Z",
      "url": "https://example.com/article/456"
    }
  ]
}
```

### Response Logic

**Description Priority:**
1. If article.description exists and is not empty, use it
2. If article.description is null or empty:
   - Look for ArticleApproveds record
   - Use ArticleApproveds.textForPdfReport if available
3. Return simplified article objects with id, title, description, publishedDate, url

### Semantic Scoring Workflow

1. External service calls this endpoint to get articles
2. Service performs semantic similarity analysis
3. Service stores results via POST /analysis/llm02/update-approved-status
4. Results are linked to the NewsNexusSemanticScorer02 entity

### AI Entity Requirements

This endpoint specifically looks for an AI entity with:
- `name`: "NewsNexusSemanticScorer02"
- `huggingFaceModelName`: "Xenova/paraphrase-MiniLM-L6-v2"
- `huggingFaceModelType`: "feature-extraction"

If this entity doesn't exist, the endpoint will fail. Create it first using POST /artificial-intelligence/add-entity.
