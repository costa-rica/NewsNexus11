import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env';

const app = express();

app.use(
  cors({
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true, service: 'newsnexus10api-ts' });
});

function mountLegacyRouters(): void {
  const legacyRoutersEnabled = env.loadLegacyRouters;
  if (!legacyRoutersEnabled) {
    app.get('/', (_req, res) => {
      res.status(200).json({
        message: 'NewsNexus10API-TS bootstrap running',
        legacyRoutersEnabled: false,
      });
    });
    return;
  }

  // newsnexus10db exports model classes that must be initialized before first query.
  // Keep this lazy so smoke tests with legacy routers disabled avoid DB boot side effects.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { initModels } = require('newsnexus10db');
  initModels();

  const mounts: Array<{ prefix: string; modulePath: string }> = [
    { prefix: '/', modulePath: './routes/index' },
    { prefix: '/users', modulePath: './routes/users' },
    { prefix: '/admin-db', modulePath: './routes/adminDb' },
    { prefix: '/keywords', modulePath: './routes/keywords' },
    { prefix: '/gnews', modulePath: './routes/newsOrgs/gNews' },
    { prefix: '/news-aggregators', modulePath: './routes/newsAggregators' },
    { prefix: '/news-api', modulePath: './routes/newsOrgs/newsApi' },
    { prefix: '/articles', modulePath: './routes/articles' },
    { prefix: '/articles-approveds', modulePath: './routes/articlesApproveds' },
    { prefix: '/states', modulePath: './routes/state' },
    { prefix: '/website-domains', modulePath: './routes/websiteDomains' },
    { prefix: '/reports', modulePath: './routes/reports' },
    { prefix: '/automations', modulePath: './routes/newsOrgs/automations' },
    { prefix: '/artificial-intelligence', modulePath: './routes/artificialIntelligence' },
    { prefix: '/news-data-io', modulePath: './routes/newsOrgs/newsDataIo' },
    { prefix: '/google-rss', modulePath: './routes/newsOrgs/googleRss' },
    { prefix: '/analysis/approved-articles', modulePath: './routes/analysis/approvedArticles' },
    { prefix: '/analysis/deduper', modulePath: './routes/analysis/deduper' },
    { prefix: '/analysis/llm01', modulePath: './routes/analysis/llm01' },
    { prefix: '/analysis/llm02', modulePath: './routes/analysis/llm02' },
    { prefix: '/downloads', modulePath: './routes/downloads' },
    { prefix: '/analysis/llm04', modulePath: './routes/analysis/llm04' },
    { prefix: '/analysis/state-assigner', modulePath: './routes/analysis/state-assigner' },
  ];

  mounts.forEach(({ prefix, modulePath }) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const router = require(modulePath);
      app.use(prefix, router);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to load legacy router "${modulePath}" (${prefix}): ${message}`
      );
    }
  });
}

mountLegacyRouters();

export default app;
