import {
  normalizeExternalError,
  normalizeExternalJsonResponse,
  normalizeGNewsArticlesPayload,
  normalizeNewsApiArticlesPayload,
  normalizeNewsDataIoResultsPayload,
} from '../../src/modules/newsOrgs/responseNormalizers';

describe('news orgs response normalizers', () => {
  test('normalizeExternalJsonResponse returns ok for 2xx', () => {
    const result = normalizeExternalJsonResponse(200, { key: 'value' });

    expect(result.ok).toBe(true);
    expect(result.payload).toEqual({ key: 'value' });
    expect(result.statusCode).toBe(200);
  });

  test('normalizeExternalJsonResponse returns error for non-2xx', () => {
    const result = normalizeExternalJsonResponse(503, { message: 'upstream unavailable' });

    expect(result.ok).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(result.error).toContain('503');
  });

  test('normalizeNewsApiArticlesPayload returns empty array when missing articles', () => {
    const result = normalizeNewsApiArticlesPayload({});

    expect(result.ok).toBe(false);
    expect(result.articles).toEqual([]);
  });

  test('normalizeNewsDataIoResultsPayload returns results when present', () => {
    const result = normalizeNewsDataIoResultsPayload({ results: [{ id: 1 }] });

    expect(result.ok).toBe(true);
    expect(result.results).toHaveLength(1);
  });

  test('normalizeGNewsArticlesPayload returns articles when present', () => {
    const result = normalizeGNewsArticlesPayload({ articles: [{ id: 1 }] });

    expect(result.ok).toBe(true);
    expect(result.articles).toHaveLength(1);
  });

  test('normalizeExternalError unwraps Error messages', () => {
    const result = normalizeExternalError(new Error('network down'), 'fallback error');

    expect(result.status).toBe('error');
    expect(result.error).toBe('network down');
    expect(result.items).toEqual([]);
  });
});
