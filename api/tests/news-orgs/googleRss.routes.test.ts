jest.mock('../../src/modules/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

jest.mock('../../src/modules/userAuthentication', () => ({
  authenticateToken: (_req: unknown, _res: unknown, next: () => void) => next()
}));

jest.mock('../../src/modules/newsOrgs/queryBuilder', () => ({
  buildQuery: jest.fn(),
  buildRssUrl: jest.fn()
}));

jest.mock('../../src/modules/newsOrgs/rssFetcher', () => ({
  fetchRssItems: jest.fn()
}));

const mockStorage = {
  ensureAggregatorSourceAndEntity: jest.fn(),
  storeRequestAndArticles: jest.fn()
};

jest.mock('../../src/modules/newsOrgs/storageGoogleRss', () => mockStorage);

const mockAxios = {
  post: jest.fn(),
  isAxiosError: jest.fn()
};

jest.mock('axios', () => mockAxios);

const googleRssRouter = require('../../src/routes/newsOrgs/googleRss');

const getAddToDatabaseHandler = () => {
  const layer = (googleRssRouter.stack as any[]).find(
    (entry) => entry.route?.path === '/add-to-database' && entry.route?.stack?.[1]
  );

  if (!layer) {
    throw new Error('Could not locate /add-to-database POST handler');
  }

  return layer.route.stack[1].handle as any;
};

describe('google rss routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.URL_BASE_NEWS_NEXUS_WORKER_NODE = 'http://worker-node';
  });

  test('POST /google-rss/add-to-database triggers follow-up scraping for saved article ids that need it', async () => {
    mockStorage.ensureAggregatorSourceAndEntity.mockResolvedValue({
      newsArticleAggregatorSourceId: 1,
      entityWhoFoundArticleId: 2
    });
    mockStorage.storeRequestAndArticles.mockResolvedValue({
      newsApiRequestId: 5,
      articlesReceived: 2,
      articlesSaved: 2,
      articleIds: [101, 102],
      articleIdsNeedingScrape: [102]
    });
    mockAxios.post.mockResolvedValue({
      data: {
        endpointName: '/article-content-scraper-02/start-job',
        jobId: 'job-99',
        status: 'queued'
      }
    });

    const handler = getAddToDatabaseHandler();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    await handler(
      {
        body: {
          url: 'https://news.google.com/rss/search?q=example',
          articlesArray: [
            {
              title: 'Article one',
              link: 'https://news.google.com/rss/articles/1',
              description: 'Summary one',
              content: 'A'.repeat(220)
            },
            {
              title: 'Article two',
              link: 'https://news.google.com/rss/articles/2',
              description: 'Summary two'
            }
          ]
        }
      },
      { status },
      jest.fn()
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        newsApiRequestId: 5,
        articlesSaved: 2,
        articleIds: [101, 102],
        articleIdsNeedingScrape: [102],
        followUpScrape: {
          triggered: true,
          articleIds: [102],
          endpointName: '/article-content-scraper-02/start-job',
          jobId: 'job-99',
          status: 'queued'
        }
      })
    );
    expect(mockAxios.post).toHaveBeenCalledWith(
      'http://worker-node/article-content-scraper-02/start-job',
      {
        articleIds: [102]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  });

  test('POST /google-rss/add-to-database reports when follow-up scraping cannot be queued', async () => {
    mockStorage.ensureAggregatorSourceAndEntity.mockResolvedValue({
      newsArticleAggregatorSourceId: 1,
      entityWhoFoundArticleId: 2
    });
    mockStorage.storeRequestAndArticles.mockResolvedValue({
      newsApiRequestId: 6,
      articlesReceived: 1,
      articlesSaved: 1,
      articleIds: [201],
      articleIdsNeedingScrape: [201]
    });
    delete process.env.URL_BASE_NEWS_NEXUS_WORKER_NODE;

    const handler = getAddToDatabaseHandler();
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });

    await handler(
      {
        body: {
          url: 'https://news.google.com/rss/search?q=example',
          articlesArray: [
            {
              title: 'Article one',
              link: 'https://news.google.com/rss/articles/1',
              description: 'Summary one'
            }
          ]
        }
      },
      { status },
      jest.fn()
    );

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        followUpScrape: {
          triggered: false,
          articleIds: [201],
          error: 'URL_BASE_NEWS_NEXUS_WORKER_NODE is not configured.'
        }
      })
    );
    expect(mockAxios.post).not.toHaveBeenCalled();
  });
});
