jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

import { fetchRssItems } from '../../src/modules/newsOrgs/rssFetcher';

describe('news orgs rssFetcher', () => {
  test('fetchRssItems returns parsed success items', async () => {
    const xml = `
      <rss>
        <channel>
          <item>
            <title>Sample Title</title>
            <description><![CDATA[<a href="https://example.com">Anchor Description</a>]]></description>
            <link>https://example.com/article</link>
            <pubDate>Mon, 01 Jan 2026 00:00:00 GMT</pubDate>
            <source>Example Source</source>
            <content:encoded>Body content</content:encoded>
          </item>
        </channel>
      </rss>
    `;

    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => xml,
      } as Response);

    const result = await fetchRssItems('https://example.com/rss');

    expect(result.status).toBe('success');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].title).toBe('Sample Title');
    expect(result.items[0].description).toBe('Anchor Description');
    expect(result.items[0].link).toBe('https://example.com/article');

    fetchMock.mockRestore();
  });

  test('fetchRssItems returns error when upstream response is not ok', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch' as any)
      .mockResolvedValue({ ok: false, status: 503 } as Response);

    const result = await fetchRssItems('https://example.com/rss');

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.statusCode).toBe(503);
      expect(result.error).toContain('503');
    }

    fetchMock.mockRestore();
  });
});
