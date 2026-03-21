const mockArticleContents02 = {
  create: jest.fn(),
  findAll: jest.fn()
};

jest.mock('@newsnexus/db-models', () => ({
  ArticleContents02: mockArticleContents02
}));

import {
  createArticleContent02Row,
  getCanonicalArticleContent02Row,
  hasSuccessfulArticleContent02,
  hasUsableArticleContent02,
  selectCanonicalArticleContent02Row,
  toArticleContent02StoredRow,
  updateArticleContent02Row
} from '../../src/modules/article-content-02/repository';

describe('article content 02 repository', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prefers successful rows with usable content when selecting a canonical row', () => {
    const selected = selectCanonicalArticleContent02Row([
      {
        id: 3,
        articleId: 10,
        content: 'x'.repeat(50),
        status: 'fail'
      },
      {
        id: 4,
        articleId: 10,
        content: 'x'.repeat(220),
        status: 'success'
      },
      {
        id: 5,
        articleId: 10,
        content: 'x'.repeat(120),
        status: 'success'
      }
    ] as Array<{
      id: number;
      articleId: number;
      content: string;
      status: string;
    }> as never[]);

    expect(selected?.id).toBe(4);
  });

  it('loads rows and returns the canonical article content 02 row', async () => {
    mockArticleContents02.findAll.mockResolvedValue([
      {
        id: 6,
        articleId: 11,
        content: 'x'.repeat(80),
        status: 'fail'
      },
      {
        id: 7,
        articleId: 11,
        content: 'x'.repeat(230),
        status: 'success'
      }
    ]);

    const row = await getCanonicalArticleContent02Row(11);

    expect(mockArticleContents02.findAll).toHaveBeenCalledWith({
      where: { articleId: 11 },
      order: [['id', 'DESC']]
    });
    expect(row?.id).toBe(7);
  });

  it('creates rows with stable defaults for optional metadata', async () => {
    mockArticleContents02.create.mockResolvedValue({ id: 12 });

    await createArticleContent02Row({
      articleId: 12,
      googleRssUrl: 'https://news.google.com/rss/articles/abc',
      status: 'fail'
    });

    expect(mockArticleContents02.create).toHaveBeenCalledWith({
      articleId: 12,
      url: null,
      googleRssUrl: 'https://news.google.com/rss/articles/abc',
      googleFinalUrl: null,
      publisherFinalUrl: null,
      title: null,
      content: null,
      status: 'fail',
      failureType: null,
      details: '',
      extractionSource: 'none',
      bodySource: 'none',
      googleStatusCode: null,
      publisherStatusCode: null
    });
  });

  it('updates a row while preserving existing values for omitted fields', async () => {
    const update = jest.fn().mockResolvedValue({ id: 13 });
    const row = {
      id: 13,
      url: 'https://publisher.example/story',
      googleFinalUrl: 'https://news.google.com/articles/abc',
      publisherFinalUrl: null,
      title: null,
      content: null,
      status: 'fail',
      failureType: 'navigation_error',
      details: 'Original details',
      extractionSource: 'none',
      bodySource: 'none',
      googleStatusCode: 200,
      publisherStatusCode: null,
      update
    };

    await updateArticleContent02Row(row as never, {
      title: 'Publisher title',
      status: 'success',
      bodySource: 'direct-http',
      details: 'Direct HTTP returned usable publisher HTML'
    });

    expect(update).toHaveBeenCalledWith({
      url: 'https://publisher.example/story',
      googleFinalUrl: 'https://news.google.com/articles/abc',
      publisherFinalUrl: null,
      title: 'Publisher title',
      content: null,
      status: 'success',
      failureType: 'navigation_error',
      details: 'Direct HTTP returned usable publisher HTML',
      extractionSource: 'none',
      bodySource: 'direct-http',
      googleStatusCode: 200,
      publisherStatusCode: null
    });
  });

  it('maps a database row to the stored-row shape', () => {
    const result = toArticleContent02StoredRow({
      id: 14,
      articleId: 21,
      url: 'https://publisher.example/story',
      googleRssUrl: 'https://news.google.com/rss/articles/xyz',
      googleFinalUrl: 'https://news.google.com/articles/xyz',
      publisherFinalUrl: 'https://publisher.example/story?ref=final',
      title: 'Publisher story',
      content: 'x'.repeat(220),
      status: 'success',
      failureType: null,
      details: 'Direct HTTP returned usable publisher HTML',
      extractionSource: 'canonical',
      bodySource: 'direct-http',
      googleStatusCode: 200,
      publisherStatusCode: 200,
      createdAt: new Date('2026-03-21T10:00:00Z'),
      updatedAt: new Date('2026-03-21T10:05:00Z')
    } as never);

    expect(result).toMatchObject({
      id: 14,
      articleId: 21,
      status: 'success',
      extractionSource: 'canonical',
      bodySource: 'direct-http'
    });
  });

  it('treats 200-plus characters as usable content and successful rows as skippable', () => {
    expect(hasUsableArticleContent02('x'.repeat(220))).toBe(true);
    expect(hasUsableArticleContent02('short')).toBe(false);
    expect(
      hasSuccessfulArticleContent02({
        status: 'success',
        content: 'x'.repeat(220)
      } as never)
    ).toBe(true);
    expect(
      hasSuccessfulArticleContent02({
        status: 'fail',
        content: 'x'.repeat(220)
      } as never)
    ).toBe(false);
  });
});
