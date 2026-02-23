import express from 'express';
import { NewsArticleAggregatorSource } from 'newsnexus10db';
import logger from '../../modules/logger';

const { makeNewsDataIoRequest, storeNewsDataIoArticles } = require('../../modules/newsOrgs/requestsNewsDataIo');

const router = express.Router();

router.post('/get-articles', async (req, res) => {
  const {
    startDate,
    endDate,
    includeWebsiteDomainObjArray,
    excludeWebsiteDomainObjArray,
    keywordsAnd,
    keywordsOr,
    keywordsNot,
  } = req.body;

  const newsApiSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: 'NewsData.IO' },
    raw: true,
  });

  const { requestResponseData, newsApiRequest } = await makeNewsDataIoRequest(
    newsApiSourceObj,
    startDate,
    endDate,
    includeWebsiteDomainObjArray,
    excludeWebsiteDomainObjArray,
    keywordsAnd,
    keywordsOr,
    keywordsNot
  );

  if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === 'true') {
    if (requestResponseData.status === 'success') {
      logger.info('- articles count: ', requestResponseData.results.length);
      await storeNewsDataIoArticles(requestResponseData, newsApiRequest, null);
    } else {
      logger.info('[NewsData.IO] no results element in the response');
      return res.status(400).json({
        status: requestResponseData?.status || 'error',
        result: false,
        message: requestResponseData?.message || 'Failed to fetch articles',
      });
    }
  }

  res.json({
    result: true,
    requestResponseData,
    newsApiRequest,
  });
});

export = router;
