# Failure Assessment: requestGoogleRss — Google RSS Rate Limit (503)

**Date:** 2026-03-24
**Flow:** requestGoogleRss
**Environment:** nn11prod (RDC)

## Incident Summary

The requestGoogleRss job failed at spreadsheet row id 2325 after Google News RSS returned HTTP 503. The server had been making sequential RSS requests at 5-second intervals for an extended period. Google's rate limiting kicked in and the job terminated immediately — there is no retry logic.

## Error Chain

### 1. HTTP Response from Google

Google returns a **503 Service Unavailable** with no response body of use. The native `fetch` call receives:

```
response.ok    = false
response.status = 503
```

### 2. Worker-Node Log Output (in order)

```json
{"level":"error","message":"RSS request failed with status 503"}
```

```json
{"level":"error","message":"HTTP 503 Service Unavailable (id: 2325): https://news.google.com/rss/search?q=%22snowmobile+accident%22+%22Clay+County%22+when%3A180d&hl=en-US&gl=US&ceid=US%3Aen. Google RSS rate limit likely exceeded. Try increasing MILISECONDS_IN_BETWEEN_REQUESTS (current: 5000ms)."}
```

```json
{"level":"error","endpointName":"/request-google-rss/start-job","failureReason":"HTTP 503 Service Unavailable (id: 2325): ...","jobId":"0018","message":"Queue job failed"}
```

### 3. Portal Automation Page

The portal displays the `failureReason` from the queue job record verbatim:

```
HTTP 503 Service Unavailable (id: <ROW_ID>): <URL>. Google RSS rate limit likely exceeded. Try increasing MILISECONDS_IN_BETWEEN_REQUESTS (current: <VALUE>ms).
```

## What to Look For

| Signal | Where | Meaning |
|---|---|---|
| `response.status === 503` | `fetchRssItems` return object (`statusCode` field) | Google is rate limiting this IP |
| Log: `"RSS request failed with status 503"` | Worker-node log | First log line emitted on 503 |
| Log: `"HTTP 503 Service Unavailable (id: ..."` | Worker-node log | Second log line — includes row id and URL |
| Log: `"Queue job failed"` | Worker-node log | Job terminated, no retry attempted |
| Portal error containing `"HTTP 503"` | Portal automation page | Same failure reason surfaced to UI |

**Note:** The specific spreadsheet row content (search term + county) is irrelevant — the 503 is caused by cumulative request volume, not any particular query.

## Current Behavior (No Retry)

The code in `requestGoogleRssJob.ts` handles 503 as a fatal error:

```typescript
// ~line 636
if (response.statusCode === 503) {
  const message = `HTTP 503 Service Unavailable (id: ${row.id}): ${requestUrl}. ...`;
  logger.error(message);
  throw new Error(message);  // <-- kills the entire job
}
```

There is no backoff, no retry, and no resumption. The job fails and all remaining spreadsheet rows are skipped.

## Proposed Fix: Retry with Backoff

**Goal:** Keep `MILISECONDS_IN_BETWEEN_REQUESTS` at 5000ms but survive 503 errors by pausing and resuming from the row that failed.

### Behavior

1. On HTTP 503, **do not throw**. Instead:
   - Log a warning: `"Google RSS rate limit hit at id <ROW_ID>. Waiting <WAIT>ms before retry."`
   - Wait for a backoff period (start at 60 seconds)
   - Retry the same row
2. If the retry also returns 503, double the wait (60s → 120s → 240s) up to a configurable max (e.g., 5 minutes)
3. After a configurable max number of consecutive 503 retries (e.g., 5), fail the job as today
4. On a successful request after a 503 retry, reset the backoff counter and continue processing normally

### Pseudocode

```typescript
const BASE_BACKOFF_MS = 60_000;       // 1 minute
const MAX_BACKOFF_MS = 300_000;       // 5 minutes
const MAX_CONSECUTIVE_503_RETRIES = 5;

let consecutive503Count = 0;

for (const row of rows) {
  let response = await fetchRssItems(url, context.signal);

  while (response.statusCode === 503 && consecutive503Count < MAX_CONSECUTIVE_503_RETRIES) {
    consecutive503Count++;
    const backoff = Math.min(BASE_BACKOFF_MS * 2 ** (consecutive503Count - 1), MAX_BACKOFF_MS);
    logger.warn(`Google RSS rate limit hit at id ${row.id}. Retry ${consecutive503Count}/${MAX_CONSECUTIVE_503_RETRIES} after ${backoff}ms.`);
    await delay(backoff, context.signal);
    response = await fetchRssItems(url, context.signal);
  }

  if (response.statusCode === 503) {
    throw new Error(`Exhausted ${MAX_CONSECUTIVE_503_RETRIES} retries on 503 at id ${row.id}.`);
  }

  consecutive503Count = 0; // reset on success
  // ... process response as normal
  await delay(delayBetweenRequestsMs, context.signal);
}
```

### Configuration (env vars or constants)

| Name | Default | Description |
|---|---|---|
| `MILISECONDS_IN_BETWEEN_REQUESTS` | `5000` | Unchanged — delay between normal requests |
| `BASE_BACKOFF_MS` | `60000` | Initial wait on first 503 |
| `MAX_BACKOFF_MS` | `300000` | Cap on exponential backoff |
| `MAX_CONSECUTIVE_503_RETRIES` | `5` | Max retries before failing the job |
