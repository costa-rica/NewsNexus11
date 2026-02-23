# Downloads API

This router handles Excel file creation and download operations for utility and analysis spreadsheets. It provides secure file operations with path traversal protection and rate limiting.

All endpoints are prefixed with `/downloads`.

## GET /downloads/utilities/download-excel-file/:excelFileName

Download an existing Excel file from the utilities analysis directory.

- Requires authentication (JWT token)
- Rate limited (fileOperationLimiter)
- Secure file path validation prevents path traversal attacks
- Only allows .xlsx and .xls file extensions

### Parameters

- `excelFileName` (string, required, URL parameter): Name of the Excel file to download

### Sample Request

```bash
curl --location 'http://localhost:3000/downloads/utilities/download-excel-file/analysis_results_2024.xlsx' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--output analysis_results_2024.xlsx
```

### Sample Response

Binary file download with headers:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="analysis_results_2024.xlsx"
```

### Error Responses

#### Environment variable not configured (500)

```json
{
  "result": false,
  "message": "PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS environment variable not configured"
}
```

#### File not found (404)

```json
{
  "result": false,
  "message": "File not found."
}
```

#### Invalid file extension (404)

```json
{
  "result": false,
  "message": "File extension not allowed"
}
```

#### Path traversal attempt (404)

```json
{
  "result": false,
  "message": "Invalid file path"
}
```

#### Download failed (500)

```json
{
  "result": false,
  "message": "File download failed."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Unexpected error message"
}
```

## POST /downloads/utilities/download-excel-file/:excelFileName

Create an Excel file from array data and download it.

- Requires authentication (JWT token)
- Rate limited (fileOperationLimiter)
- Creates Excel file from provided array data
- Automatically triggers download after creation
- Overwrites existing file if it exists

### Parameters

- `excelFileName` (string, required, URL parameter): Name for the Excel file to create
- `arrayToExport` (array, required, body): Array of objects to export to Excel

### Sample Request

```bash
curl --location 'http://localhost:3000/downloads/utilities/download-excel-file/new_analysis.xlsx' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--header 'Content-Type: application/json' \
--data-raw '{
  "arrayToExport": [
    {
      "Article ID": 123,
      "Title": "Product Recall Announced",
      "State": "California",
      "Date": "2024-01-15"
    },
    {
      "Article ID": 456,
      "Title": "Safety Alert Issued",
      "State": "Texas",
      "Date": "2024-01-14"
    }
  ]
}' \
--output new_analysis.xlsx
```

### Sample Response

Binary file download with headers:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="new_analysis.xlsx"
```

### Error Responses

#### Environment variable not configured (500)

```json
{
  "result": false,
  "message": "PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS not configured"
}
```

#### Invalid filename (400)

```json
{
  "result": false,
  "message": "Invalid filename"
}
```

#### File creation failed (404)

```json
{
  "result": false,
  "message": "File not found."
}
```

#### Download failed (500)

```json
{
  "result": false,
  "message": "File download failed."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Unexpected error message"
}
```

### Excel File Format

The created Excel file will:
- Use the first object's keys as column headers
- Create one row per object in the array
- Auto-size columns to fit content
- Save in .xlsx format (Office Open XML)

**Example array input:**
```json
[
  {"Name": "Article 1", "Count": 5, "Status": "Active"},
  {"Name": "Article 2", "Count": 3, "Status": "Pending"}
]
```

**Results in Excel:**
```
| Name      | Count | Status  |
|-----------|-------|---------|
| Article 1 | 5     | Active  |
| Article 2 | 3     | Pending |
```

### Security Features

**Path Traversal Protection:**
- Validates filenames to prevent directory traversal attacks
- Blocks attempts like "../../../etc/passwd"
- Only allows files within the configured directory

**File Extension Validation:**
- Only .xlsx and .xls extensions allowed
- Prevents creation of executable or script files

**Rate Limiting:**
- File operations are rate limited
- Prevents abuse and resource exhaustion

### Environment Variables

- `PATH_TO_UTILITIES_ANALYSIS_SPREADSHEETS`: Directory path where Excel files are stored and created
