import type { Browser, BrowserContext, Page, Response } from 'playwright';
import { chromium } from 'playwright';
import logger from '../logger';
import {
  ARTICLE_CONTENT_02_DEFAULT_HEADERS,
  ARTICLE_CONTENT_02_DESKTOP_USER_AGENT,
  ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_RETRY_COUNT,
  ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_TIMEOUT_MS,
  ARTICLE_CONTENT_02_GOOGLE_POST_LOAD_WAIT_MS
} from './config';

export interface GoogleNavigationResult {
  finalUrl: string;
  statusCode: number | null;
  html: string;
}

export interface GoogleNavigationSession {
  browser: Browser;
  context: BrowserContext;
  close: () => Promise<void>;
}

export interface GoogleNavigationDependencies {
  chromiumImpl?: Pick<typeof chromium, 'launch'>;
}

export interface NavigateGoogleUrlDependencies {
  retryCount?: number;
  timeoutMs?: number;
  postLoadWaitMs?: number;
}

export const createGoogleNavigationSession = async (
  dependencies: GoogleNavigationDependencies = {}
): Promise<GoogleNavigationSession> => {
  const chromiumImpl = dependencies.chromiumImpl ?? chromium;
  const browser = await chromiumImpl.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: ARTICLE_CONTENT_02_DESKTOP_USER_AGENT,
    locale: 'en-US',
    viewport: { width: 1440, height: 900 },
    extraHTTPHeaders: ARTICLE_CONTENT_02_DEFAULT_HEADERS
  });

  return {
    browser,
    context,
    close: async () => {
      await context.close();
      await browser.close();
    }
  };
};

const closePageForAbort = async (page: Pick<Page, 'close'>): Promise<void> => {
  try {
    await page.close();
  } catch {
    // Ignore cleanup failures during cancellation.
  }
};

export const navigateGoogleUrl = async (
  context: Pick<BrowserContext, 'newPage'>,
  url: string,
  signal?: AbortSignal,
  dependencies: NavigateGoogleUrlDependencies = {}
): Promise<GoogleNavigationResult> => {
  const retryCount = dependencies.retryCount ?? ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_RETRY_COUNT;
  const timeoutMs = dependencies.timeoutMs ?? ARTICLE_CONTENT_02_GOOGLE_NAVIGATION_TIMEOUT_MS;
  const postLoadWaitMs =
    dependencies.postLoadWaitMs ?? ARTICLE_CONTENT_02_GOOGLE_POST_LOAD_WAIT_MS;

  const page = await context.newPage();
  let abortHandler: (() => void) | null = null;

  if (signal) {
    abortHandler = () => {
      void closePageForAbort(page);
    };
    signal.addEventListener('abort', abortHandler, { once: true });
  }

  try {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryCount; attempt += 1) {
      try {
        if (signal?.aborted) {
          throw new Error('Google navigation aborted');
        }

        const response = (await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: timeoutMs
        })) as Response | null;

        await page.waitForTimeout(postLoadWaitMs);

        return {
          finalUrl: page.url(),
          statusCode: response?.status() ?? null,
          html: await page.content()
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.warn('Google navigation attempt failed', {
          url,
          attempt,
          retryCount,
          error: lastError.message
        });

        if (attempt < retryCount) {
          await page.waitForTimeout(1000 * attempt);
        }
      }
    }

    throw lastError ?? new Error(`Google navigation failed for ${url}`);
  } finally {
    if (abortHandler) {
      signal?.removeEventListener('abort', abortHandler);
    }

    try {
      await page.close();
    } catch {
      // Ignore page cleanup failures after navigation completes.
    }
  }
};

export default {
  createGoogleNavigationSession,
  navigateGoogleUrl
};
