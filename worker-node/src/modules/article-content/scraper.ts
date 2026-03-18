import { load } from 'cheerio';
import logger from '../logger';
import {
  ARTICLE_CONTENT_FETCH_REDIRECT,
  ARTICLE_CONTENT_FETCH_TIMEOUT_MS,
  ARTICLE_CONTENT_MIN_LENGTH,
  ARTICLE_CONTENT_USER_AGENT
} from './config';
import { ArticleContentScrapeResult } from './types';

const ARTICLE_SELECTORS = [
  'article',
  '[role="article"]',
  '.article-content',
  '.article-body',
  '.entry-content',
  'main',
  '.post-content',
  '.story-body',
  '.content'
];

const normalizeExtractedText = (value: string): string =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter((line) => line !== '')
    .join('\n\n')
    .trim();

export const scrapeArticleContentWithCheerio = async (
  url: string,
  signal?: AbortSignal
): Promise<ArticleContentScrapeResult> => {
  try {
    logger.info('Scraping article content with Cheerio', {
      method: 'cheerio',
      timeoutMs: ARTICLE_CONTENT_FETCH_TIMEOUT_MS,
      url
    });

    const response = await fetch(url, {
      headers: {
        'User-Agent': ARTICLE_CONTENT_USER_AGENT
      },
      redirect: ARTICLE_CONTENT_FETCH_REDIRECT,
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(ARTICLE_CONTENT_FETCH_TIMEOUT_MS)])
        : AbortSignal.timeout(ARTICLE_CONTENT_FETCH_TIMEOUT_MS)
    });

    if (!response.ok) {
      return {
        success: false,
        method: 'cheerio',
        failureType: 'http_error',
        error: `HTTP ${response.status} while fetching article`
      };
    }

    const html = await response.text();
    const $ = load(html);

    $('script, style, nav, header, footer, aside, .advertisement, .ad').remove();

    let articleElement = null;
    for (const selector of ARTICLE_SELECTORS) {
      const candidate = $(selector);
      if (candidate.length > 0) {
        articleElement = candidate;
        break;
      }
    }

    const container = articleElement && articleElement.length > 0 ? articleElement : $('body');
    const paragraphs: string[] = [];

    container.find('p').each((_, element) => {
      const text = normalizeExtractedText($(element).text());
      if (text !== '') {
        paragraphs.push(text);
      }
    });

    const normalizedContent = normalizeExtractedText(paragraphs.join('\n\n'));

    if (normalizedContent.length < ARTICLE_CONTENT_MIN_LENGTH) {
      return {
        success: false,
        method: 'cheerio',
        failureType: 'short_content',
        error: `Content too short (${normalizedContent.length} chars, minimum ${ARTICLE_CONTENT_MIN_LENGTH})`
      };
    }

    return {
      success: true,
      method: 'cheerio',
      content: normalizedContent,
      contentLength: normalizedContent.length
    };
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);

    logger.warn('Cheerio scrape failed', {
      method: 'cheerio',
      url,
      error: message
    });

    return {
      success: false,
      method: 'cheerio',
      failureType: 'network_error',
      error: message
    };
  }
};

export default scrapeArticleContentWithCheerio;
