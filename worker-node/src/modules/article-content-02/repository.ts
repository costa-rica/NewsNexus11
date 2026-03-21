import { ArticleContents02 } from '@newsnexus/db-models';
import { ARTICLE_CONTENT_MIN_LENGTH } from '../article-content/config';
import {
  ArticleContent02BodySource,
  ArticleContent02ExtractionSource,
  ArticleContent02FailureType,
  ArticleContent02Status,
  ArticleContent02StoredRow,
  CreateArticleContent02Input,
  UpdateArticleContent02Input
} from './types';

type ArticleContents02Model = InstanceType<typeof ArticleContents02>;

const normalizeStoredContent = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const getStatusRank = (row: ArticleContents02Model): number => {
  if (row.status === 'success') {
    return 2;
  }

  return normalizeStoredContent(row.content).length > 0 ? 1 : 0;
};

const getRowPriorityTuple = (row: ArticleContents02Model): [number, number, number] => {
  const normalizedLength = normalizeStoredContent(row.content).length;
  return [getStatusRank(row), normalizedLength, row.id];
};

export const selectCanonicalArticleContent02Row = (
  rows: ArticleContents02Model[]
): ArticleContents02Model | null => {
  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((left, right) => {
    const [leftStatusRank, leftLength, leftId] = getRowPriorityTuple(left);
    const [rightStatusRank, rightLength, rightId] = getRowPriorityTuple(right);

    if (leftStatusRank !== rightStatusRank) {
      return rightStatusRank - leftStatusRank;
    }

    if (leftLength !== rightLength) {
      return rightLength - leftLength;
    }

    return rightId - leftId;
  });

  return sorted[0] ?? null;
};

export const getArticleContent02Rows = async (
  articleId: number
): Promise<ArticleContents02Model[]> =>
  ArticleContents02.findAll({
    where: { articleId },
    order: [['id', 'DESC']]
  });

export const getCanonicalArticleContent02Row = async (
  articleId: number
): Promise<ArticleContents02Model | null> => {
  const rows = await getArticleContent02Rows(articleId);
  return selectCanonicalArticleContent02Row(rows);
};

export const createArticleContent02Row = async (
  input: CreateArticleContent02Input
): Promise<ArticleContents02Model> =>
  ArticleContents02.create({
    articleId: input.articleId,
    url: input.url ?? null,
    googleRssUrl: input.googleRssUrl,
    googleFinalUrl: input.googleFinalUrl ?? null,
    publisherFinalUrl: input.publisherFinalUrl ?? null,
    title: input.title ?? null,
    content: input.content ?? null,
    status: input.status,
    failureType: input.failureType ?? null,
    details: input.details ?? '',
    extractionSource: input.extractionSource ?? 'none',
    bodySource: input.bodySource ?? 'none',
    googleStatusCode: input.googleStatusCode ?? null,
    publisherStatusCode: input.publisherStatusCode ?? null
  });

export const updateArticleContent02Row = async (
  row: ArticleContents02Model,
  input: UpdateArticleContent02Input
): Promise<ArticleContents02Model> =>
  row.update({
    url: input.url ?? row.url,
    googleFinalUrl: input.googleFinalUrl ?? row.googleFinalUrl,
    publisherFinalUrl: input.publisherFinalUrl ?? row.publisherFinalUrl,
    title: input.title ?? row.title,
    content: input.content ?? row.content,
    status: input.status ?? row.status,
    failureType: input.failureType ?? row.failureType,
    details: input.details ?? row.details,
    extractionSource: input.extractionSource ?? row.extractionSource,
    bodySource: input.bodySource ?? row.bodySource,
    googleStatusCode: input.googleStatusCode ?? row.googleStatusCode,
    publisherStatusCode: input.publisherStatusCode ?? row.publisherStatusCode
  });

export const toArticleContent02StoredRow = (
  row: ArticleContents02Model | null
): ArticleContent02StoredRow | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    articleId: row.articleId,
    url: row.url,
    googleRssUrl: row.googleRssUrl,
    googleFinalUrl: row.googleFinalUrl,
    publisherFinalUrl: row.publisherFinalUrl,
    title: row.title,
    content: row.content,
    status: row.status as ArticleContent02Status,
    failureType: row.failureType as ArticleContent02FailureType | null,
    details: row.details,
    extractionSource: row.extractionSource as ArticleContent02ExtractionSource,
    bodySource: row.bodySource as ArticleContent02BodySource,
    googleStatusCode: row.googleStatusCode,
    publisherStatusCode: row.publisherStatusCode,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export const hasUsableArticleContent02 = (content: string | null | undefined): boolean =>
  normalizeStoredContent(content).length >= ARTICLE_CONTENT_MIN_LENGTH;

export const hasSuccessfulArticleContent02 = (
  row: ArticleContents02Model | null
): boolean => {
  if (!row) {
    return false;
  }

  return row.status === 'success' && hasUsableArticleContent02(row.content);
};
