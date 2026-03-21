export const ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_TIMEOUT_MS = 30_000;
export const ARTICLE_CONTENT_02_GOOGLE_POST_LOAD_WAIT_MS = 5_000;
export const ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_RETRY_COUNT = 2;

export const ARTICLE_CONTENT_02_DESKTOP_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/136.0.0.0 Safari/537.36';

export const ARTICLE_CONTENT_02_DEFAULT_HEADERS = {
  'Accept-Language': 'en-US,en;q=0.9',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,' +
    'image/apng,*/*;q=0.8'
} as const;
