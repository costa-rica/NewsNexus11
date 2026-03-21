const mockLaunch = jest.fn();

jest.mock('playwright', () => ({
  chromium: {
    launch: mockLaunch
  }
}));

import {
  createGoogleNavigationSession,
  navigateGoogleUrl
} from '../../src/modules/article-content-02/googleNavigator';

describe('google navigator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a reusable browser context with the expected browser-like settings', async () => {
    const closeContext = jest.fn().mockResolvedValue(undefined);
    const closeBrowser = jest.fn().mockResolvedValue(undefined);
    const newContext = jest.fn().mockResolvedValue({
      close: closeContext
    });

    mockLaunch.mockResolvedValue({
      newContext,
      close: closeBrowser
    });

    const session = await createGoogleNavigationSession();

    expect(mockLaunch).toHaveBeenCalledWith({ headless: true });
    expect(newContext).toHaveBeenCalledWith({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      locale: 'en-US',
      viewport: { width: 1440, height: 900 },
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,' +
          'image/apng,*/*;q=0.8'
      }
    });

    await session.close();

    expect(closeContext).toHaveBeenCalled();
    expect(closeBrowser).toHaveBeenCalled();
  });

  it('navigates a Google URL and captures final url, status code, and html', async () => {
    const page = {
      goto: jest.fn().mockResolvedValue({
        status: () => 200
      }),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://publisher.example/story'),
      content: jest.fn().mockResolvedValue('<html>publisher</html>'),
      close: jest.fn().mockResolvedValue(undefined)
    };

    const result = await navigateGoogleUrl(
      {
        newPage: jest.fn().mockResolvedValue(page)
      },
      'https://news.google.com/rss/articles/abc'
    );

    expect(page.goto).toHaveBeenCalledWith('https://news.google.com/rss/articles/abc', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    expect(page.waitForTimeout).toHaveBeenCalledWith(5000);
    expect(result).toEqual({
      finalUrl: 'https://publisher.example/story',
      statusCode: 200,
      html: '<html>publisher</html>'
    });
    expect(page.close).toHaveBeenCalled();
  });

  it('retries failed Google navigation attempts before succeeding', async () => {
    const page = {
      goto: jest
        .fn()
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce({
          status: () => 200
        }),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      url: jest.fn().mockReturnValue('https://publisher.example/retry-story'),
      content: jest.fn().mockResolvedValue('<html>retry success</html>'),
      close: jest.fn().mockResolvedValue(undefined)
    };

    const result = await navigateGoogleUrl(
      {
        newPage: jest.fn().mockResolvedValue(page)
      },
      'https://news.google.com/rss/articles/retry'
    );

    expect(page.goto).toHaveBeenCalledTimes(2);
    expect(page.waitForTimeout).toHaveBeenNthCalledWith(1, 1000);
    expect(page.waitForTimeout).toHaveBeenNthCalledWith(2, 5000);
    expect(result.finalUrl).toBe('https://publisher.example/retry-story');
  });

  it('throws after exhausting the retry count', async () => {
    const page = {
      goto: jest.fn().mockRejectedValue(new Error('always failing')),
      waitForTimeout: jest.fn().mockResolvedValue(undefined),
      url: jest.fn(),
      content: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined)
    };

    await expect(
      navigateGoogleUrl(
        {
          newPage: jest.fn().mockResolvedValue(page)
        },
        'https://news.google.com/rss/articles/fail',
        undefined,
        {
          retryCount: 2,
          postLoadWaitMs: 10
        }
      )
    ).rejects.toThrow('always failing');

    expect(page.goto).toHaveBeenCalledTimes(2);
    expect(page.waitForTimeout).toHaveBeenCalledWith(1000);
  });
});
