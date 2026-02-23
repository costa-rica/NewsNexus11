import type {
  ExternalAdapterErrorResult,
  ExternalItemsPayloadShape,
  NormalizedExternalJsonResponse,
} from '../../types/externalAdapters';

export function normalizeExternalJsonResponse<TPayload>(
  statusCode: number,
  payload: TPayload
): NormalizedExternalJsonResponse<TPayload> {
  if (statusCode >= 200 && statusCode < 300) {
    return { ok: true, statusCode, payload };
  }

  return {
    ok: false,
    statusCode,
    payload,
    error: `External request failed with status ${statusCode}`,
  };
}

export function normalizeExternalError<TItem>(
  error: unknown,
  fallbackMessage: string
): ExternalAdapterErrorResult<TItem> {
  const message = error instanceof Error ? error.message : fallbackMessage;
  return {
    status: 'error',
    items: [],
    error: message,
  };
}

export function normalizeNewsApiArticlesPayload(payload: ExternalItemsPayloadShape): {
  ok: boolean;
  articles: unknown[];
} {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return { ok: articles.length > 0, articles };
}

export function normalizeNewsDataIoResultsPayload(payload: ExternalItemsPayloadShape): {
  ok: boolean;
  results: unknown[];
} {
  const results = Array.isArray(payload?.results) ? payload.results : [];
  return { ok: results.length > 0, results };
}

export function normalizeGNewsArticlesPayload(payload: ExternalItemsPayloadShape): {
  ok: boolean;
  articles: unknown[];
} {
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  return { ok: articles.length > 0, articles };
}
