# States API

This router manages US state information and article-state associations. It provides endpoints for retrieving states and assigning states to articles.

All endpoints are prefixed with `/states`.

## GET /states/

Get all US states.

- Does not require authentication
- Returns complete state objects with all fields

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/states/'
```

### Sample Response

```json
{
  "statesArray": [
    {
      "id": 1,
      "name": "Alabama",
      "abbreviation": "AL",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Alaska",
      "abbreviation": "AK",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "id": 5,
      "name": "California",
      "abbreviation": "CA",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## POST /states/:articleId

Assign one or more states to an article.

- Requires authentication (JWT token)
- Deletes all existing state assignments for the article before creating new ones
- Allows multiple states to be assigned to a single article

### Parameters

- `articleId` (number, required, URL parameter): ID of the article
- `stateIdArray` (array of numbers, required): Array of state IDs to assign to the article

### Sample Request

```bash
curl --location 'http://localhost:3000/states/123' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "stateIdArray": [5, 36, 48]
}'
```

### Sample Response

```json
{
  "result": true,
  "articleStateContracts": [
    {
      "articleId": 123,
      "stateId": 5
    },
    {
      "articleId": 123,
      "stateId": 36
    },
    {
      "articleId": 123,
      "stateId": 48
    }
  ]
}
```

### Error Responses

#### Missing required field (400)

```json
{
  "error": "Missing stateIdArray"
}
```

### Behavior Notes

**Destructive Operation:**
- This endpoint deletes all existing ArticleStateContract records for the article before creating new ones
- If you want to add states without removing existing ones, you must include all desired state IDs in the request
- Passing an empty array will remove all state assignments

**Multiple States:**
- An article can be associated with multiple states
- This is useful for incidents that affect multiple states
- Example: A nationwide product recall might be assigned to all 50 states
