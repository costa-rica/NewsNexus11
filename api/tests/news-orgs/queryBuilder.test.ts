import { buildQuery, buildRssUrl } from '../../src/modules/newsOrgs/queryBuilder';

describe('news orgs queryBuilder', () => {
  test('buildQuery constructs AND/OR query and db strings', () => {
    const result = buildQuery({
      and_keywords: 'consumer,recall',
      and_exact_phrases: 'product safety',
      or_keywords: 'hazard,danger',
      or_exact_phrases: 'injury report',
      time_range: '30d',
    });

    expect(result.query).toContain('consumer');
    expect(result.query).toContain('recall');
    expect(result.query).toContain('"product safety"');
    expect(result.query).toContain('OR');
    expect(result.query).toContain('when:30d');
    expect(result.andString).toBe('consumer, recall, product safety');
    expect(result.orString).toBe('hazard, danger, injury report');
    expect(result.timeRangeInvalid).toBe(false);
  });

  test('buildQuery falls back to default when time range is invalid', () => {
    const result = buildQuery({
      and_keywords: 'recall',
      time_range: 'abc',
    });

    expect(result.query).toContain('when:180d');
    expect(result.timeRangeInvalid).toBe(true);
  });

  test('buildRssUrl includes expected params', () => {
    const url = buildRssUrl('consumer recall when:7d');
    expect(url).toContain('https://news.google.com/rss/search?');
    expect(url).toContain('q=consumer+recall+when%3A7d');
    expect(url).toContain('hl=');
    expect(url).toContain('gl=');
    expect(url).toContain('ceid=');
  });
});
