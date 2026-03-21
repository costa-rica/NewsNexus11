import {
  Article,
  ArticleContents02,
  EntityWhoFoundArticle,
  NewsApiRequest,
  NewsArticleAggregatorSource,
} from "@newsnexus/db-models";
import logger from "../logger";

export const GOOGLE_NEWS_RSS_ORG_NAME = "Google News RSS";
const ARTICLE_CONTENT_MIN_LENGTH = 200;

export type GoogleRssStorageItem = {
  title?: string;
  description?: string;
  link?: string;
  pubDate?: string | Date;
  source?: string;
  content?: string;
};

type EnsureAggregatorSourceAndEntityResult = {
  newsArticleAggregatorSourceId: number;
  entityWhoFoundArticleId: number;
};

export async function ensureAggregatorSourceAndEntity(): Promise<EnsureAggregatorSourceAndEntityResult> {
  let source = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: GOOGLE_NEWS_RSS_ORG_NAME },
  });

  if (!source) {
    source = await NewsArticleAggregatorSource.create({
      nameOfOrg: GOOGLE_NEWS_RSS_ORG_NAME,
      isRss: true,
      isApi: false,
    });
    logger.info(
      `Created NewsArticleAggregatorSource: ${GOOGLE_NEWS_RSS_ORG_NAME}`,
    );
  }

  let entity = await EntityWhoFoundArticle.findOne({
    where: { newsArticleAggregatorSourceId: source.id },
  });

  if (!entity) {
    entity = await EntityWhoFoundArticle.create({
      newsArticleAggregatorSourceId: source.id,
    });
    logger.info(
      `Created EntityWhoFoundArticle for: ${GOOGLE_NEWS_RSS_ORG_NAME}`,
    );
  }

  return {
    newsArticleAggregatorSourceId: source.id,
    entityWhoFoundArticleId: entity.id,
  };
}

type StoreRequestAndArticlesInput = {
  requestUrl: string;
  andString: string | null;
  orString: string | null;
  items: GoogleRssStorageItem[];
  newsArticleAggregatorSourceId: number;
  entityWhoFoundArticleId: number;
};

type StoreRequestAndArticlesResult = {
  newsApiRequestId: number;
  articlesReceived: number;
  articlesSaved: number;
  articleIds: number[];
  articleIdsNeedingScrape: number[];
};

const normalizeWhitespace = (input: string): string => input.replace(/\s+/g, " ").trim();

const stripHtml = (input: string): string => input.replace(/<[^>]*>/g, "").trim();

const normalizeSeedContent = (value?: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = normalizeWhitespace(stripHtml(value));
  return normalized === "" ? null : normalized;
};

const hasUsableContent = (value?: string | null): boolean => {
  const normalized = normalizeSeedContent(value);
  return (normalized?.length ?? 0) >= ARTICLE_CONTENT_MIN_LENGTH;
};

const hasSuccessfulArticleContents02 = async (articleId: number): Promise<boolean> => {
  const rows = await ArticleContents02.findAll({
    where: { articleId },
    order: [["id", "DESC"]],
  });

  return rows.some(
    (row) => row.status === "success" && hasUsableContent(row.content),
  );
};

const getCanonicalArticleContents02Row = async (articleId: number) => {
  const rows = await ArticleContents02.findAll({
    where: { articleId },
    order: [["id", "DESC"]],
  });

  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((left, right) => {
    const leftContentLength = normalizeSeedContent(left.content)?.length ?? 0;
    const rightContentLength = normalizeSeedContent(right.content)?.length ?? 0;
    const leftStatusRank = left.status === "success" ? 2 : leftContentLength > 0 ? 1 : 0;
    const rightStatusRank = right.status === "success" ? 2 : rightContentLength > 0 ? 1 : 0;

    if (leftStatusRank !== rightStatusRank) {
      return rightStatusRank - leftStatusRank;
    }

    if (leftContentLength !== rightContentLength) {
      return rightContentLength - leftContentLength;
    }

    return right.id - left.id;
  });

  return sorted[0] ?? null;
};

const upsertArticleContents02Seed = async (
  articleId: number,
  googleRssUrl: string,
  item: GoogleRssStorageItem,
): Promise<"skip" | "success" | "needs-scrape"> => {
  if (await hasSuccessfulArticleContents02(articleId)) {
    return "skip";
  }

  const normalizedContent = normalizeSeedContent(item.content);
  const seedPayload = {
    url: null,
    googleRssUrl,
    googleFinalUrl: null,
    publisherFinalUrl: null,
    title: item.title ?? null,
    content: normalizedContent,
    status: hasUsableContent(normalizedContent) ? "success" : "fail",
    failureType: normalizedContent ? "short_content" : null,
    details: hasUsableContent(normalizedContent)
      ? "Seeded from Google RSS item content"
      : normalizedContent
        ? "RSS item content too short; triggering Google-to-publisher scrape"
        : "RSS item content missing; triggering Google-to-publisher scrape",
    extractionSource: "none",
    bodySource: normalizedContent ? "rss-feed" : "none",
    googleStatusCode: null,
    publisherStatusCode: null,
  };

  const canonicalRow = await getCanonicalArticleContents02Row(articleId);

  if (canonicalRow && canonicalRow.status !== "success") {
    await canonicalRow.update(seedPayload);
  } else {
    await ArticleContents02.create({
      articleId,
      ...seedPayload,
    });
  }

  return hasUsableContent(normalizedContent) ? "success" : "needs-scrape";
};

export async function storeRequestAndArticles(
  params: StoreRequestAndArticlesInput,
): Promise<StoreRequestAndArticlesResult> {
  const requestDate = new Date().toISOString().split("T")[0];

  const request = await NewsApiRequest.create({
    newsArticleAggregatorSourceId: params.newsArticleAggregatorSourceId,
    dateEndOfRequest: requestDate,
    countOfArticlesReceivedFromRequest: params.items.length,
    status: "success",
    url: params.requestUrl,
    andString: params.andString,
    orString: params.orString,
    notString: null,
    isFromAutomation: false,
  });

  let savedCount = 0;
  const articleIds: number[] = [];
  const articleIdsNeedingScrape: number[] = [];

  for (const item of params.items) {
    if (!item.link) {
      logger.warn("Skipping article without link");
      continue;
    }

    const existing = await Article.findOne({ where: { url: item.link } });
    if (existing) {
      logger.info(`Skipping duplicate article: ${item.link}`);
      continue;
    }

    let publishedDate: string | null = null;
    if (item.pubDate) {
      try {
        const parsedDate = new Date(item.pubDate);
        publishedDate = parsedDate.toISOString();
      } catch (_error) {
        logger.warn(`Failed to parse pubDate: ${item.pubDate}`);
      }
    }

    const article = await Article.create({
      publicationName: item.source || "Unknown",
      title: item.title || "",
      description: item.description || "",
      url: item.link,
      publishedDate,
      entityWhoFoundArticleId: params.entityWhoFoundArticleId,
      newsApiRequestId: request.id,
    });

    savedCount += 1;
    articleIds.push(article.id);

    const seedResult = await upsertArticleContents02Seed(article.id, item.link, item);
    if (seedResult === "needs-scrape") {
      articleIdsNeedingScrape.push(article.id);
    }
  }

  await request.update({
    countOfArticlesSavedToDbFromRequest: savedCount,
  });

  logger.info(
    `Stored ${savedCount} new articles for request ${request.id} (${params.items.length} received).`,
  );

  return {
    newsApiRequestId: request.id,
    articlesReceived: params.items.length,
    articlesSaved: savedCount,
    articleIds,
    articleIdsNeedingScrape,
  };
}
