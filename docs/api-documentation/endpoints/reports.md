# Reports API

This router manages report generation, including creating Excel spreadsheets, PDF files, and ZIP bundles for submission to clients. It handles the complete report lifecycle from creation to download.

All endpoints are prefixed with `/reports`.

## GET /reports/table

Get all reports grouped by CR name format with summary data.

- Requires authentication (JWT token)
- Returns reports with ArticleReportContract associations
- Groups reports by nameCrFormat (CR format name)

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/table' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "reportsArray": {
    "cr240115": [
      {
        "id": 10,
        "nameCrFormat": "cr240115",
        "nameZipFile": "report_bundle_10.zip",
        "dateSubmittedToClient": "2024-01-20T00:00:00.000Z",
        "userId": 5,
        "createdAt": "2024-01-15T14:30:00.000Z",
        "ArticleReportContracts": [
          {"id": 101, "articleId": 123, "reportId": 10}
        ]
      }
    ],
    "cr240122": [
      {
        "id": 11,
        "nameCrFormat": "cr240122",
        "nameZipFile": "report_bundle_11.zip",
        "dateSubmittedToClient": "N/A",
        "userId": 5,
        "createdAt": "2024-01-22T10:00:00.000Z",
        "ArticleReportContracts": []
      }
    ]
  }
}
```

## GET /reports/

Get all reports grouped by CR name with full data structure.

- Requires authentication (JWT token)
- Returns reports ordered by creation date (ascending)
- Provides structured array format for frontend consumption

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "reportsArrayByCrName": [
    {
      "crName": "cr240115",
      "reportsArray": [
        {
          "id": 10,
          "nameCrFormat": "cr240115",
          "nameZipFile": "report_bundle_10.zip",
          "dateSubmittedToClient": "2024-01-20T00:00:00.000Z",
          "userId": 5,
          "createdAt": "2024-01-15T14:30:00.000Z",
          "updatedAt": "2024-01-15T14:35:00.000Z",
          "ArticleReportContracts": []
        }
      ]
    },
    {
      "crName": "cr240122",
      "reportsArray": [
        {
          "id": 11,
          "nameCrFormat": "cr240122",
          "nameZipFile": "report_bundle_11.zip",
          "dateSubmittedToClient": "N/A",
          "userId": 5,
          "createdAt": "2024-01-22T10:00:00.000Z",
          "updatedAt": "2024-01-22T10:05:00.000Z",
          "ArticleReportContracts": []
        }
      ]
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

## POST /reports/create

Create a new report bundle with Excel, PDFs, and ZIP file.

- Requires authentication (JWT token)
- Generates Excel spreadsheet with article data
- Creates individual PDF files for each article
- Bundles everything into a ZIP file
- Automatically assigns reference numbers in format YYMMDDNNN (e.g., 240115001)

### Parameters

- `articlesIdArrayForReport` (array of numbers, required): Array of article IDs to include in the report

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/create' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "articlesIdArrayForReport": [123, 456, 789]
}'
```

### Sample Response

```json
{
  "message": "CSV created",
  "zipFilename": "report_bundle_10.zip"
}
```

### Error Responses

#### No approved articles (400)

```json
{
  "error": "No approved articles found"
}
```

#### Error processing article (500)

```json
{
  "error": "Error processing article id 123: Missing required field"
}
```

#### Error creating report (500)

```json
{
  "error": "Error creating report: Failed to write ZIP file"
}
```

### Report Generation Process

1. Fetches articles from database with approval and state data
2. Creates Report record in database
3. Generates CR name in format crYYMMDD (e.g., cr240115) using Eastern Time
4. Assigns reference numbers to each article (YYMMDDNNN format)
5. Creates ArticleReportContract records linking articles to report
6. Generates Excel spreadsheet with columns: refNumber, submitted, headline, publication, datePublished, state, text
7. Creates individual PDF files for each article
8. Bundles Excel and PDFs into ZIP file
9. Saves ZIP filename to Report record

### File Output

**Excel file contains:**
- Reference number (e.g., 240115001)
- Submitted date (current date in ET)
- Headline for PDF report
- Publication name
- Publication date
- State abbreviation
- Article text for PDF report

**ZIP bundle contains:**
- Excel spreadsheet (crYYMMDD.xlsx)
- Individual PDF files (one per article)

**Files saved to:** `PATH_PROJECT_RESOURCES_REPORTS` environment variable directory

## GET /reports/list

Get list of all report ZIP files in the reports directory.

- Requires authentication (JWT token)
- Returns only .zip files
- Does not include other file types

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/list' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "reports": [
    "report_bundle_10.zip",
    "report_bundle_11.zip",
    "report_bundle_12.zip"
  ]
}
```

### Error Responses

#### Directory not configured (500)

```json
{
  "result": false,
  "message": "Reports directory not configured."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Permission denied"
}
```

## DELETE /reports/:reportId

Delete a report and its associated ZIP file.

- Requires authentication (JWT token)
- Deletes Report database record
- Removes ZIP file from filesystem
- Cascades deletion to ArticleReportContracts

### Parameters

- `reportId` (number, required, URL parameter): ID of the report to delete

### Sample Request

```bash
curl --location --request DELETE 'http://localhost:3000/reports/10' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "message": "Report deleted successfully."
}
```

### Error Responses

#### Report not found (404)

```json
{
  "result": false,
  "message": "Report not found."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "File deletion failed"
}
```

## GET /reports/download/:reportId

Download a report ZIP bundle.

- Requires authentication (JWT token)
- Returns ZIP file with proper headers for browser download
- Exposes Content-Disposition header for CORS

### Parameters

- `reportId` (number, required, URL parameter): ID of the report to download

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/download/10' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--output report_bundle_10.zip
```

### Sample Response

Binary file download with headers:
```
Content-Disposition: attachment; filename="report_bundle_10.zip"
Access-Control-Expose-Headers: Content-Disposition
```

### Error Responses

#### Report not found (404)

```json
{
  "result": false,
  "message": "Report not found."
}
```

#### Directory not configured (500)

```json
{
  "result": false,
  "message": "Reports directory not configured."
}
```

#### File not found (404)

```json
{
  "result": false,
  "message": "File not found."
}
```

#### Error sending file (500)

```json
{
  "result": false,
  "message": "Error sending file."
}
```

## POST /reports/update-submitted-to-client-date/:reportId

Update the date a report was submitted to the client.

- Requires authentication (JWT token)
- Tracks when reports were submitted for record-keeping

### Parameters

- `reportId` (number, required, URL parameter): ID of the report
- `dateSubmittedToClient` (string, required): ISO date string of submission date

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/update-submitted-to-client-date/10' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "dateSubmittedToClient": "2024-01-20"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Submissions status updated successfully."
}
```

### Error Responses

#### Report not found (404)

```json
{
  "result": false,
  "message": "Report not found."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Database update failed"
}
```

## POST /reports/toggle-article-rejection/:articleReportContractId

Toggle whether an article in a report was accepted or rejected by the client (CPSC).

- Requires authentication (JWT token)
- Tracks client feedback on submitted articles
- Toggle behavior: accepted ↔ rejected

### Parameters

- `articleReportContractId` (number, required, URL parameter): ID of the ArticleReportContract
- `articleRejectionReason` (string, optional): Reason for rejection (can be used for both states)

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/toggle-article-rejection/101' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "articleRejectionReason": "Not relevant to consumer safety"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Article rejection toggled successfully.",
  "articleReportContract": {
    "id": 101,
    "articleId": 123,
    "reportId": 10,
    "articleReferenceNumberInReport": "240115001",
    "articleAcceptedByCpsc": false,
    "articleRejectionReason": "Not relevant to consumer safety"
  }
}
```

### Error Responses

#### Contract not found (404)

```json
{
  "result": false,
  "message": "Article Report Contract not found."
}
```

## POST /reports/update-article-report-reference-number/:articleReportContractId

Update the reference number for an article in a report.

- Requires authentication (JWT token)
- Allows manual correction of reference numbers

### Parameters

- `articleReportContractId` (number, required, URL parameter): ID of the ArticleReportContract
- `articleReferenceNumberInReport` (string, required): New reference number

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/update-article-report-reference-number/101' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "articleReferenceNumberInReport": "240115999"
}'
```

### Sample Response

```json
{
  "result": true,
  "message": "Article report reference number updated successfully.",
  "articleReportContract": {
    "id": 101,
    "articleId": 123,
    "reportId": 10,
    "articleReferenceNumberInReport": "240115999"
  }
}
```

### Error Responses

#### Contract not found (404)

```json
{
  "result": false,
  "message": "Article Report Contract not found."
}
```

## GET /reports/recreate/:reportId

Recreate an existing report with the same articles and CR name.

- Requires authentication (JWT token)
- Useful for regenerating reports after updates to article data
- Creates new Report record and ZIP bundle
- Preserves original reference numbers and CR name
- Uses original submission date if available

### Parameters

- `reportId` (number, required, URL parameter): ID of the report to recreate

### Sample Request

```bash
curl --location 'http://localhost:3000/reports/recreate/10' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "message": "Report recreated successfully.",
  "newReportId": 15,
  "originalReportId": 10,
  "originalReportSubmittedDate": "1/20/2024"
}
```

### Error Responses

#### Report not found (404)

```json
{
  "result": false,
  "message": "Report not found."
}
```

#### Error processing article (500)

```json
{
  "error": "Error processing article id 123: Missing state assignment"
}
```

#### Error creating report (500)

```json
{
  "error": "Error creating report: Failed to generate PDF files"
}
```

### Recreate Process

1. Fetches original report data
2. Gets all ArticleReportContracts for the original report
3. Fetches approved article data
4. Creates new Report record with same CR name
5. Preserves original reference numbers
6. Uses original submission date if available
7. Generates new Excel, PDFs, and ZIP bundle
8. Creates new ArticleReportContract records linking to new report ID
9. Returns both old and new report IDs for reference

### Use Cases

- Regenerating report after correcting article data
- Creating updated version with same reference numbers
- Maintaining report history while updating content
