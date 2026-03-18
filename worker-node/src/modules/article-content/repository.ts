import { ArticleContent } from '@newsnexus/db-models';
import { ARTICLE_CONTENT_MIN_LENGTH } from './config';
import { ArticleContentCanonicalRow } from './types';

type ArticleContentModel = InstanceType<typeof ArticleContent>;

const normalizeStoredContent = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const getRowPriorityTuple = (row: ArticleContentModel): [number, number, number] => {
  const normalizedLength = normalizeStoredContent(row.content).length;
  const usabilityRank = normalizedLength >= ARTICLE_CONTENT_MIN_LENGTH ? 2 : normalizedLength > 0 ? 1 : 0;

  return [usabilityRank, normalizedLength, row.id];
};

export const selectCanonicalArticleContentRow = (
  rows: ArticleContentModel[]
): ArticleContentModel | null => {
  if (rows.length === 0) {
    return null;
  }

  const sorted = [...rows].sort((left, right) => {
    const [leftUsability, leftLength, leftId] = getRowPriorityTuple(left);
    const [rightUsability, rightLength, rightId] = getRowPriorityTuple(right);

    if (leftUsability !== rightUsability) {
      return rightUsability - leftUsability;
    }

    if (leftLength !== rightLength) {
      return rightLength - leftLength;
    }

    return leftId - rightId;
  });

  return sorted[0] ?? null;
};

export const getCanonicalArticleContentRow = async (
  articleId: number
): Promise<ArticleContentModel | null> => {
  const rows = await ArticleContent.findAll({
    where: { articleId }
  });

  return selectCanonicalArticleContentRow(rows);
};

export const toCanonicalArticleContentRow = (
  row: ArticleContentModel | null
): ArticleContentCanonicalRow | null => {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    articleId: row.articleId,
    content: row.content,
    scrapeStatusCheerio: row.scrapeStatusCheerio,
    scrapeStatusPuppeteer: row.scrapeStatusPuppeteer,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
};

export const hasUsableArticleContent = (content: string | null | undefined): boolean =>
  normalizeStoredContent(content).length >= ARTICLE_CONTENT_MIN_LENGTH;
