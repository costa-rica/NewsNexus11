import express from 'express';
import { DateTime } from 'luxon';
import {
  EntityWhoFoundArticle,
  NewsArticleAggregatorSource,
} from 'newsnexus10db';
import { checkBodyReturnMissing } from '../modules/common';
import { sqlQueryRequestsFromApi } from '../modules/queriesSql';
import { authenticateToken } from '../modules/userAuthentication';
import logger from '../modules/logger';

const router = express.Router();

type RequestRow = {
  newsApiRequestId: number;
  createdAt: string;
  nameOfOrg: string | null;
  dateStartOfRequest: string | null;
  dateEndOfRequest: string | null;
  countOfArticlesReceivedFromRequest: number | null;
  countOfArticlesSavedToDbFromRequest: number | null;
  status: string | null;
  andString: string | null;
  orString: string | null;
  notString: string | null;
  domainName: string | null;
  includedOrExcludedFromRequest: 'included' | 'excluded' | null;
};

router.post('/add-aggregator', authenticateToken, async (req, res) => {
  const { nameOfOrg, url, apiKey, state, isApi, isRss } = req.body;
  const { isValid, missingKeys } = checkBodyReturnMissing(req.body, ['url']);

  logger.info(`body: ${JSON.stringify(req.body)}`);

  if (!isValid) {
    return res.status(400).json({ error: `Missing ${missingKeys.join(', ')}` });
  }

  const existingAggregator = await NewsArticleAggregatorSource.findOne({
    where: { url },
  });
  if (existingAggregator) {
    return res.status(400).json({ error: 'Aggregator already exists' });
  }

  const aggregator = await NewsArticleAggregatorSource.create({
    nameOfOrg,
    url,
    apiKey,
    state,
    isApi,
    isRss,
  } as any);

  await EntityWhoFoundArticle.create({
    newsArticleAggregatorSourceId: aggregator.id,
  });

  return res.json({ message: 'Aggregator added successfully', aggregator });
});

router.post('/requests', authenticateToken, async (req, res) => {
  const { dateLimitOnRequestMade, includeIsFromAutomation } = req.body;

  const rawRows = (await sqlQueryRequestsFromApi({
    dateLimitOnRequestMade,
    includeIsFromAutomation,
  })) as RequestRow[];

  const requestsMap = new Map<number, any>();

  for (const row of rawRows) {
    if (!requestsMap.has(row.newsApiRequestId)) {
      requestsMap.set(row.newsApiRequestId, {
        madeOn: DateTime.fromISO(row.createdAt).toFormat('yyyy-MM-dd'),
        nameOfOrg: row.nameOfOrg,
        keyword: '',
        startDate: row.dateStartOfRequest,
        endDate: row.dateEndOfRequest,
        count: row.countOfArticlesReceivedFromRequest,
        countSaved: row.countOfArticlesSavedToDbFromRequest,
        status: row.status,
        andArray: row.andString,
        orArray: row.orString,
        notArray: row.notString,
        includeSourcesArray: [] as Array<{ name: string }>,
        excludeSourcesArray: [] as Array<{ name: string }>,
      });
    }

    const request = requestsMap.get(row.newsApiRequestId);

    let keywordString = '';
    if (request.andArray) keywordString += `AND ${request.andArray}`;
    if (request.orArray) keywordString += ` OR ${request.orArray}`;
    if (request.notArray) keywordString += ` NOT ${request.notArray}`;
    request.keyword = keywordString;

    if (row.domainName) {
      const domainObj = { name: row.domainName };
      if (row.includedOrExcludedFromRequest === 'included') {
        request.includeSourcesArray.push(domainObj);
      }
      if (row.includedOrExcludedFromRequest === 'excluded') {
        request.excludeSourcesArray.push(domainObj);
      }
    }
  }

  const newsApiRequestsArray = Array.from(requestsMap.values()).map((r: any) => ({
    ...r,
    includeString: r.includeSourcesArray.map((d: { name: string }) => d.name).join(', '),
    excludeString: r.excludeSourcesArray.map((d: { name: string }) => d.name).join(', '),
  }));

  return res.json({ newsApiRequestsArray });
});

router.get('/news-org-apis', authenticateToken, async (_req, res) => {
  const aggregatorsDbObjArray = await NewsArticleAggregatorSource.findAll({
    where: { isApi: true },
  });
  const newsOrgArray = [];
  for (const aggregator of aggregatorsDbObjArray as any[]) {
    newsOrgArray.push({
      id: aggregator.id,
      nameOfOrg: aggregator.nameOfOrg,
      url: aggregator.url,
    });
  }
  res.json({ newsOrgArray });
});

router.post('/update/:newsArticleAggregatorSourceId', authenticateToken, async (req, res) => {
  const idParam = Array.isArray(req.params.newsArticleAggregatorSourceId)
    ? req.params.newsArticleAggregatorSourceId[0]
    : req.params.newsArticleAggregatorSourceId;
  const { nameOfOrg, url, apiKey, state, isApi, isRss } = req.body;

  logger.info(`Updating news article aggregator source ${idParam}`);

  const newsArticleAggregatorSource = await NewsArticleAggregatorSource.findByPk(idParam);
  if (!newsArticleAggregatorSource) {
    return res.status(404).json({ error: 'News article aggregator source not found' });
  }

  const updatedFields: Record<string, unknown> = {};
  if (nameOfOrg) updatedFields.nameOfOrg = nameOfOrg;
  if (url) updatedFields.url = url;
  if (apiKey) updatedFields.apiKey = apiKey;
  if (state) updatedFields.state = state;
  if (typeof isApi === 'boolean') {
    updatedFields.isApi = isApi;
  }
  if (typeof isRss === 'boolean') {
    updatedFields.isRss = isRss;
  }

  if (Object.keys(updatedFields).length > 0) {
    await newsArticleAggregatorSource.update(updatedFields);
    logger.info(`News article aggregator source ${idParam} updated successfully`);
  } else {
    logger.info(`No updates applied for news article aggregator source ${idParam}`);
  }

  return res.status(200).json({ message: 'Mise à jour réussie.', newsArticleAggregatorSource });
});

router.delete('/:newsArticleAggregatorSourceId', authenticateToken, async (req, res) => {
  const idParam = Array.isArray(req.params.newsArticleAggregatorSourceId)
    ? req.params.newsArticleAggregatorSourceId[0]
    : req.params.newsArticleAggregatorSourceId;

  logger.info(`Deleting news article aggregator source ${idParam}`);

  const newsArticleAggregatorSource = await NewsArticleAggregatorSource.findByPk(idParam);
  if (!newsArticleAggregatorSource) {
    return res.status(404).json({ error: 'News article aggregator source not found' });
  }

  await newsArticleAggregatorSource.destroy();
  logger.info(`News article aggregator source ${idParam} deleted successfully`);

  return res.status(200).json({ message: 'Suppression réussie.' });
});

export = router;
