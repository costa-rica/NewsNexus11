# Automations API

This router handles file management for automation-related resources including Excel files and web browser extensions. It provides endpoints for uploading, downloading, and listing automation files.

All endpoints are prefixed with `/automations`.

## GET /automations/excel-files

Get a list of Excel files available in the automation directory.

- Requires authentication (JWT token)
- Returns only files with .xlsx extension
- Files are stored in the PATH_TO_AUTOMATION_EXCEL_FILES directory

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/automations/excel-files' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "excelFileNamesArray": [
    "automation_keywords_2024.xlsx",
    "website_domains_export.xlsx",
    "article_analysis_template.xlsx"
  ]
}
```

### Error Responses

#### Directory not configured (500)

```json
{
  "result": false,
  "message": "Backup directory not configured."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Failed to read directory"
}
```

## GET /automations/excel-file/:filename

Download a specific Excel file from the automation directory.

- Requires authentication (JWT token)
- Returns the file with proper content-type headers for Excel files
- Triggers browser download

### Parameters

- `filename` (string, required, URL parameter): Name of the Excel file to download

### Sample Request

```bash
curl --location 'http://localhost:3000/automations/excel-file/automation_keywords_2024.xlsx' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--output automation_keywords_2024.xlsx
```

### Sample Response

Binary file download with headers:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="automation_keywords_2024.xlsx"
```

### Error Responses

#### File not found (404)

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

## POST /automations/excel-file/:filename

Upload an Excel file to the automation directory.

- Requires authentication (JWT token)
- Uses multipart/form-data encoding
- Filename is specified in the URL parameter (not from uploaded file)
- Overwrites existing file if filename already exists

### Parameters

- `filename` (string, required, URL parameter): Name to save the file as
- `file` (file, required, multipart form field): Excel file to upload

### Sample Request

```bash
curl --location 'http://localhost:3000/automations/excel-file/new_automation.xlsx' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--form 'file=@"/path/to/local/file.xlsx"'
```

### Sample Response

```json
{
  "result": true,
  "message": "File uploaded successfully."
}
```

### Error Responses

#### No file uploaded (400)

```json
{
  "result": false,
  "message": "No file uploaded."
}
```

## GET /automations/web-browser-extensions

Get a list of web browser extension files available for download.

- Requires authentication (JWT token)
- Returns only .zip files
- Files are stored in PATH_PROJECT_RESOURCES/utilities/web_browser_extensions/

### Parameters

None

### Sample Request

```bash
curl --location 'http://localhost:3000/automations/web-browser-extensions' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
```

### Sample Response

```json
{
  "result": true,
  "webBrowserExtensionsArray": [
    "article_scraper_extension_v1.2.zip",
    "keyword_highlighter_v2.0.zip",
    "news_monitor_chrome_extension.zip"
  ]
}
```

### Error Responses

#### Directory not configured (500)

```json
{
  "result": false,
  "message": "Backup directory not configured."
}
```

#### Server error (500)

```json
{
  "result": false,
  "message": "Internal server error",
  "error": "Failed to read directory"
}
```

## GET /automations/web-browser-extension/:filename

Download a specific web browser extension file.

- Requires authentication (JWT token)
- Returns .zip file with appropriate content-type
- Triggers browser download

### Parameters

- `filename` (string, required, URL parameter): Name of the extension file to download

### Sample Request

```bash
curl --location 'http://localhost:3000/automations/web-browser-extension/article_scraper_extension_v1.2.zip' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' \
--output extension.zip
```

### Sample Response

Binary file download with headers:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="article_scraper_extension_v1.2.zip"
```

### Error Responses

#### File not found (404)

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
