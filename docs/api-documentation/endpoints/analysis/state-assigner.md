# Analysis State Assigner API

This router handles AI-assigned state data for articles and human verification of those assignments. It provides endpoints for retrieving articles with state assignments, semantic scores, location classifier scores, and approving or rejecting AI state assignments.

All endpoints are prefixed with `/analysis/state-assigner`.

## POST /analysis/state-assigner/

Get articles with AI-assigned state data, semantic ratings, and location classifier scores.

- Requires authentication (JWT token)
- Returns articles from ArticleStateContract02 table (AI-assigned states)
- Includes semantic similarity scores from NewsNexusSemanticScorer02
- Includes location classifier scores from NewsNexusClassifierLocationScorer01
- Optionally filters by article publish date and null state assignments

### Parameters

- `includeNullState` (boolean, optional): If true, includes articles with null stateId assignments (default: false)
- `targetArticleThresholdDaysOld` (number, optional): Filter articles published within the last N days

### Sample Request

```bash
curl --location 'http://localhost:3000/analysis/state-assigner/' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "includeNullState": false,
  "targetArticleThresholdDaysOld": 30
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Successfully retrieved articles with state assignments",
  "count": 42,
  "articles": [
    {
      "id": 123,
      "title": "Consumer Product Recall: Fire Hazard in Electric Heaters",
      "description": "Federal safety officials announced a recall...",
      "url": "https://example.com/article/123",
      "createdAt": "2024-01-15T11:00:00.000Z",
      "publishedDate": "2024-01-15T10:30:00.000Z",
      "semanticRatingMax": 0.87,
      "semanticRatingMaxLabel": "product safety",
      "locationClassifierScore": 0.92,
      "locationClassifierScoreLabel": "California",
      "stateAssignment": {
        "promptId": 1,
        "isHumanApproved": false,
        "isDeterminedToBeError": false,
        "occuredInTheUS": true,
        "reasoning": "Article mentions California Consumer Protection Agency",
        "stateId": 5,
        "stateName": "California"
      }
    }
  ]
}
```

### Error Responses

#### Invalid request parameters (400)

```json
{
  "result": false,
  "message": "includeNullState must be a boolean"
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

### Response Fields

- `semanticRatingMax` (number, nullable): Highest semantic similarity score from NewsNexusSemanticScorer02 (0-1 range)
- `semanticRatingMaxLabel` (string, nullable): Keyword with the highest semantic similarity score
- `locationClassifierScore` (number, nullable): Location classifier confidence score from NewsNexusClassifierLocationScorer01 (0-1 range)
- `locationClassifierScoreLabel` (string, nullable): State name identified by location classifier
- `stateAssignment` (object): AI-assigned state information from ArticleStateContract02
  - `promptId`: ID of the prompt used for state assignment
  - `isHumanApproved`: Whether a human has approved this assignment
  - `isDeterminedToBeError`: Whether this assignment has been flagged as an error
  - `occuredInTheUS`: Whether the incident occurred in the US
  - `reasoning`: AI's reasoning for the state assignment
  - `stateId`: ID of the assigned state
  - `stateName`: Name of the assigned state

## POST /analysis/state-assigner/human-verify/:articleId

Approve or reject an AI-assigned state for an article.

- Requires authentication (JWT token)
- Updates ArticleStateContract02 table to set isHumanApproved flag
- For approvals: creates record in ArticleStateContracts table (human-approved states)
- For rejections: deletes record from ArticleStateContracts table if it exists
- Returns updated article state data after the action

### Parameters

- `articleId` (number, required, URL parameter): ID of the article
- `action` (string, required): Either "approve" or "reject"
- `stateId` (number, required): ID of the state being approved/rejected

### Sample Request (Approve)

```bash
curl --location 'http://localhost:3000/analysis/state-assigner/human-verify/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "action": "approve",
  "stateId": 5
}'
```

### Sample Response (Approve)

```json
{
  "status": "Article state approved successfully",
  "stateHumanApprovedArray": [
    {
      "stateId": 5,
      "stateName": "California",
      "stateAbbreviation": "CA"
    }
  ],
  "stateAiApproved": {
    "promptId": 1,
    "isHumanApproved": true,
    "isDeterminedToBeError": false,
    "occuredInTheUS": true,
    "reasoning": "Article mentions California Consumer Protection Agency",
    "stateId": 5,
    "stateName": "California"
  }
}
```

### Sample Request (Reject)

```bash
curl --location 'http://localhost:3000/analysis/state-assigner/human-verify/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "action": "reject",
  "stateId": 5
}'
```

### Sample Response (Reject)

```json
{
  "status": "Article state rejected successfully",
  "stateHumanApprovedArray": [],
  "stateAiApproved": {
    "promptId": 1,
    "isHumanApproved": false,
    "isDeterminedToBeError": false,
    "occuredInTheUS": true,
    "reasoning": "Article mentions California Consumer Protection Agency",
    "stateId": 5,
    "stateName": "California"
  }
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

#### Missing or invalid action (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "action must be either 'approve' or 'reject'",
    "status": 400
  }
}
```

#### AI state assignment not found (404)

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "AI state assignment not found",
    "details": "No AI state assignment exists for article 123 with state 5",
    "status": 404
  }
}
```

#### State already approved (409)

```json
{
  "error": {
    "code": "CONFLICT",
    "message": "State already approved",
    "details": "Article 123 already has human-approved state 5",
    "status": 409
  }
}
```

#### Article not found after update (404)

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
    "message": "Failed to process human verification",
    "details": "Database transaction failed",
    "status": 500
  }
}
```

### Approval Flow

When action is "approve":
1. Updates ArticleStateContract02: sets isHumanApproved = true
2. Checks if ArticleStateContracts record already exists (prevents duplicates)
3. Creates new record in ArticleStateContracts (human-approved table)
4. Returns updated article state data

When action is "reject":
1. Updates ArticleStateContract02: sets isHumanApproved = false
2. Deletes record from ArticleStateContracts if it exists
3. Returns updated article state data
