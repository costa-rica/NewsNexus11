import { TargetArticleRecord } from '../articleTargeting';

export interface ArticleContentScrapeSuccess {
  success: true;
  method: 'cheerio';
  content: string;
  contentLength: number;
}

export interface ArticleContentScrapeFailure {
  success: false;
  method: 'cheerio';
  error: string;
  failureType: 'http_error' | 'network_error' | 'short_content';
}

export type ArticleContentScrapeResult =
  | ArticleContentScrapeSuccess
  | ArticleContentScrapeFailure;

export interface ArticleContentCandidate extends TargetArticleRecord {}

export interface ArticleContentCanonicalRow {
  id: number;
  articleId: number;
  content: string;
  scrapeStatusCheerio: boolean | null;
  scrapeStatusPuppeteer: boolean | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArticleContentEnrichmentSummary {
  articlesConsidered: number;
  articlesSkipped: number;
  successfulScrapes: number;
  failedScrapes: number;
  updatedRows: number;
  createdRows: number;
}
