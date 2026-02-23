import {
  Article,
  EntityWhoFoundArticle,
  NewsApiRequest,
  NewsArticleAggregatorSource,
} from 'newsnexus10db';
import { writeResponseDataFromNewsAggregator } from '../common';
import logger from '../logger';
import {
  normalizeExternalJsonResponse,
  normalizeGNewsArticlesPayload,
} from './responseNormalizers';

export async function makeGNewsRequest(
  source: any,
  keywordString: string,
  startDate: string | false = false,
  endDate: string | false = false,
  max = 10
) {
  const token = source.apiKey;
  if (!endDate) {
    endDate = new Date().toISOString().replace('.000', '');
  } else {
    endDate = new Date(endDate).toISOString().replace('.000', '');
  }
  if (!startDate) {
    startDate = new Date(
      new Date().setDate(new Date().getDate() - Number(process.env.COUNT_OF_DAYS_HISTORY_LIMIT))
    )
      .toISOString()
      .replace('.000', '');
  } else {
    startDate = new Date(startDate).toISOString().replace('.000', '');
  }
  const keywordLowerCase = keywordString.toLowerCase();

  const urlGnews = `${source.url}search?q=${encodeURIComponent(
    keywordLowerCase
  )}&from=${startDate}&to=${endDate}&max=${max}&lang=en&token=${token}`;

  const requestResponse = await fetch(urlGnews);
  const rawPayload = await requestResponse.json();
  const normalizedResponse = normalizeExternalJsonResponse(requestResponse.status, rawPayload);
  const requestResponseData = normalizedResponse.payload || {};
  const normalizedArticles = normalizeGNewsArticlesPayload(requestResponseData);

  const newsApiRequestObj = await NewsApiRequest.create({
    newsArticleAggregatorSourceId: source.id,
    andString: keywordString,
    dateStartOfRequest: startDate,
    dateEndOfRequest: new Date().toISOString().split('T')[0],
    countOfArticlesReceivedFromRequest: normalizedArticles.articles.length,
  });

  return { requestResponseData, newsApiRequestObj };
}

export async function storeGNewsArticles(requestResponseData: any, newsApiRequestObj: any) {
  const gNewsSource = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: 'GNews' },
    include: [{ model: EntityWhoFoundArticle }],
  });

  const entityWhoFoundArticleId = (gNewsSource as any)?.EntityWhoFoundArticle?.id;
  try {
    let countOfArticlesSavedToDbFromRequest = 0;
    for (const article of requestResponseData.articles as any[]) {
      const existingArticle = await Article.findOne({
        where: { url: article.url },
      });
      if (existingArticle) {
        continue;
      }

      await Article.create({
        publicationName: article.source.name,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedDate: article.publishedAt,
        entityWhoFoundArticleId: entityWhoFoundArticleId,
        newsApiRequestId: newsApiRequestObj.id,
      });
      countOfArticlesSavedToDbFromRequest += 1;
    }
    await newsApiRequestObj.update({
      countOfArticlesSavedToDbFromRequest,
    });

    if (gNewsSource) {
      writeResponseDataFromNewsAggregator(
        (gNewsSource as any).id,
        newsApiRequestObj,
        requestResponseData,
        false
      );
    }
  } catch (error) {
    logger.error(error);

    if (gNewsSource) {
      writeResponseDataFromNewsAggregator(
        (gNewsSource as any).id,
        newsApiRequestObj,
        requestResponseData,
        true
      );
    }
  }
}

export async function makeGNewsApiRequestDetailed(
  sourceObj: any,
  startDate: string | null,
  endDate: string | null,
  keywordsAnd: string | null,
  keywordsOr: string | null,
  keywordsNot: string | null
) {
  logger.info('- in makeGNewsApiRequestDetailed');

  function splitPreservingQuotes(str: string) {
    return str.match(/"[^"]+"|\S+/g)?.map((s) => s.trim()) || [];
  }

  const andArray = splitPreservingQuotes(keywordsAnd || '');
  const orArray = splitPreservingQuotes(keywordsOr || '');
  const notArray = splitPreservingQuotes(keywordsNot || '');

  const token = sourceObj.apiKey;
  if (!endDate) {
    endDate = new Date().toISOString().split('T')[0];
  }
  if (!startDate) {
    startDate = new Date(new Date().setDate(new Date().getDate() - 29))
      .toISOString()
      .split('T')[0];
  }

  const queryParams: string[] = [];

  const andPart = andArray.length > 0 ? andArray.join(' AND ') : '';
  const orPart = orArray.length > 0 ? `(${orArray.join(' OR ')})` : '';
  const notPart = notArray.length > 0 ? notArray.map((k) => `NOT ${k}`).join(' AND ') : '';

  const fullQuery = [andPart, orPart, notPart].filter(Boolean).join(' AND ');
  if (fullQuery) {
    queryParams.push(`q=${encodeURIComponent(fullQuery)}`);
  }

  if (startDate) {
    const formattedStartDate = new Date(startDate).toISOString().replace('.000', '');
    queryParams.push(`from=${formattedStartDate}`);
  }

  if (endDate) {
    const formattedEndDate = new Date(endDate).toISOString().replace('.000', '');
    queryParams.push(`to=${formattedEndDate}`);
  }
  queryParams.push('max=100');
  queryParams.push('lang=en');
  queryParams.push('country=us');
  queryParams.push(`apikey=${token}`);

  const requestUrl = `${sourceObj.url}search?${queryParams.join('&')}`;
  logger.info(` [in makeGNewsApiRequestDetailed] requestUrl: ${requestUrl}`);

  let status = 'success';
  let requestResponseData: any = null;
  let newsApiRequestObj: any = null;
  if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === 'true') {
    const response = await fetch(requestUrl);
    const rawPayload = await response.json();
    const normalizedResponse = normalizeExternalJsonResponse(response.status, rawPayload);
    requestResponseData = normalizedResponse.payload || {};

    const normalizedArticles = normalizeGNewsArticlesPayload(requestResponseData);
    if (!normalizedResponse.ok || !normalizedArticles.ok) {
      status = 'error';
      writeResponseDataFromNewsAggregator(
        sourceObj.id,
        { id: 'failed', url: requestUrl },
        requestResponseData,
        true
      );
    }
    newsApiRequestObj = await NewsApiRequest.create({
      newsArticleAggregatorSourceId: sourceObj.id,
      dateStartOfRequest: startDate,
      dateEndOfRequest: endDate,
      countOfArticlesReceivedFromRequest: requestResponseData.articles?.length,
      status,
      url: requestUrl,
      andString: keywordsAnd,
      orString: keywordsOr,
      notString: keywordsNot,
    });
  } else {
    newsApiRequestObj = requestUrl;
  }

  return { requestResponseData, newsApiRequestObj };
}
