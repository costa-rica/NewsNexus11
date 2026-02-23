import express from 'express';
import { NewsArticleAggregatorSource } from 'newsnexus10db';
import { checkBodyReturnMissing } from '../../modules/common';
import logger from '../../modules/logger';

const {
  makeGNewsRequest,
  makeGNewsApiRequestDetailed,
  storeGNewsArticles,
} = require('../../modules/newsOrgs/requestsGNews');

const router = express.Router();

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

router.post('/request', async (req, res) => {
  try {
    const { startDate, endDate, keywordString } = req.body;

    const { isValid, missingKeys } = checkBodyReturnMissing(req.body, [
      'startDate',
      'endDate',
      'keywordString',
    ]);
    if (!isValid) {
      return res.status(400).json({
        result: false,
        message: `Missing ${missingKeys.join(', ')}`,
      });
    }

    const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
      where: { nameOfOrg: 'GNews' },
      raw: true,
    });

    const { requestResponseData, newsApiRequestObj } = await makeGNewsRequest(
      gNewsSourceObj,
      keywordString,
      startDate,
      endDate
    );

    await storeGNewsArticles(requestResponseData, newsApiRequestObj);

    res.json({
      result: true,
      message: 'Imported articles from GNews.',
    });
  } catch (error) {
    logger.error('Error in /request-gnews:', error);
    res.status(500).json({
      result: false,
      message: 'NewsNexusAPI internal server error',
      error: getErrorMessage(error),
    });
  }
});

router.post('/get-articles', async (req, res) => {
  const { startDate, endDate, keywordsAnd, keywordsOr, keywordsNot } = req.body;
  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: 'GNews' },
    raw: true,
  });
  try {
    const { requestResponseData, newsApiRequestObj } = await makeGNewsApiRequestDetailed(
      gNewsSourceObj,
      startDate,
      endDate,
      keywordsAnd,
      keywordsOr,
      keywordsNot
    );

    if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === 'true') {
      if (requestResponseData.articles) {
        logger.info('- articles count: ', requestResponseData.articles.length);
        await storeGNewsArticles(requestResponseData, newsApiRequestObj);
      } else {
        logger.info('No articles element in response');
        return res.status(400).json({
          status: requestResponseData?.status || 'error',
          result: false,
          message: requestResponseData?.message || 'Failed to fetch articles',
        });
      }
    } else {
      logger.info('ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES is false');
      logger.info(`requestResponseData: ${JSON.stringify(requestResponseData, null, 2)}`);
    }

    res.json({
      result: true,
      requestResponseData,
      newsApiRequestObj,
    });
  } catch (error) {
    logger.error('Error in /request-detailed-gnews:', error);
    res.status(500).json({
      result: false,
      message: 'NewsNexusAPI internal server error',
      error: getErrorMessage(error),
    });
  }
});

export = router;
