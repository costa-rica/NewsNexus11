import express from 'express';
import { authenticateToken } from '../../modules/userAuthentication';
import { buildQuery, buildRssUrl } from '../../modules/newsOrgs/queryBuilder';
import { fetchRssItems } from '../../modules/newsOrgs/rssFetcher';
import {
  ensureAggregatorSourceAndEntity,
  storeRequestAndArticles,
  type GoogleRssStorageItem,
} from '../../modules/newsOrgs/storageGoogleRss';
import logger from '../../modules/logger';

const router = express.Router();

type MakeRequestBody = {
  and_keywords?: string;
  and_exact_phrases?: string;
  or_keywords?: string;
  or_exact_phrases?: string;
  time_range?: string;
};

type AddToDatabaseBody = {
  articlesArray?: GoogleRssStorageItem[];
  url?: string;
  and_keywords?: string;
  and_exact_phrases?: string;
  or_keywords?: string;
  or_exact_phrases?: string;
  time_range?: string;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.post('/make-request', authenticateToken, async (req, res) => {
  try {
    const {
      and_keywords,
      and_exact_phrases,
      or_keywords,
      or_exact_phrases,
      time_range,
    } = req.body as MakeRequestBody;

    if (!and_keywords && !and_exact_phrases && !or_keywords && !or_exact_phrases) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        message:
          'At least one of and_keywords, and_exact_phrases, or_keywords, or_exact_phrases must be provided',
      });
    }

    const queryResult = buildQuery({
      and_keywords: and_keywords || '',
      and_exact_phrases: and_exact_phrases || '',
      or_keywords: or_keywords || '',
      or_exact_phrases: or_exact_phrases || '',
      time_range: time_range || '',
    });

    const url = buildRssUrl(queryResult.query);
    logger.info(`Fetching Google RSS: ${url}`);

    const result = await fetchRssItems(url);

    if (result.status === 'error') {
      if (result.statusCode === 503) {
        return res.status(503).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Google News returned HTTP 503. Please wait before retrying.',
          statusCode: 503,
        });
      }

      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: `Failed to fetch RSS feed: ${result.error}`,
      });
    }

    res.status(200).json({
      success: true,
      url,
      articlesArray: result.items,
      count: result.items.length,
    });
  } catch (error) {
    logger.error('Error in POST /google-rss/:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: getErrorMessage(error) || 'An unexpected error occurred',
    });
  }
});

router.post('/add-to-database', authenticateToken, async (req, res) => {
  try {
    const {
      articlesArray,
      url,
      and_keywords,
      and_exact_phrases,
      or_keywords,
      or_exact_phrases,
    } = req.body as AddToDatabaseBody;

    if (!articlesArray || !Array.isArray(articlesArray) || articlesArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'articlesArray must be a non-empty array',
      });
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'url is required and must be a string',
      });
    }

    for (const article of articlesArray) {
      if (!article.title || !article.link) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Each article must have at least title and link fields',
        });
      }
      if (!article.description && !article.content) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Each article must have at least one of description or content',
        });
      }
    }

    if (!url.includes('news.google.com/rss')) {
      logger.warn(`Unusual URL format (not Google News RSS): ${url}`);
    }

    const { newsArticleAggregatorSourceId, entityWhoFoundArticleId } =
      await ensureAggregatorSourceAndEntity();

    const andStringParts = [and_keywords, and_exact_phrases].filter(Boolean);
    const orStringParts = [or_keywords, or_exact_phrases].filter(Boolean);

    const andString = andStringParts.length > 0 ? andStringParts.join(', ') : null;
    const orString = orStringParts.length > 0 ? orStringParts.join(', ') : null;

    const storageResult = await storeRequestAndArticles({
      requestUrl: url,
      andString,
      orString,
      items: articlesArray,
      newsArticleAggregatorSourceId,
      entityWhoFoundArticleId,
    });

    const duplicateCount = storageResult.articlesReceived - storageResult.articlesSaved;
    let message = `Successfully saved ${storageResult.articlesSaved} of ${storageResult.articlesReceived} articles to database`;
    if (duplicateCount > 0) {
      message += ` (${duplicateCount} duplicate${duplicateCount > 1 ? 's' : ''} skipped)`;
    }

    res.status(200).json({
      success: true,
      newsApiRequestId: storageResult.newsApiRequestId,
      articlesReceived: storageResult.articlesReceived,
      articlesSaved: storageResult.articlesSaved,
      articleIds: storageResult.articleIds,
      message,
    });
  } catch (error) {
    logger.error('Error in POST /google-rss/add-to-database:', error);
    res.status(500).json({
      success: false,
      error: 'Database error',
      message: `Failed to save articles: ${getErrorMessage(error)}`,
    });
  }
});

export = router;
