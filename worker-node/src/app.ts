import express from 'express';
import healthRouter from './routes/health';
import queueInfoRouter from './routes/queueInfo';
import requestGoogleRssRouter from './routes/requestGoogleRss';
import semanticScorerRouter from './routes/semanticScorer';
import { errorHandler, notFoundHandler } from './modules/middleware/errorHandlers';

export const createApp = (): express.Express => {
  const app = express();

  app.use(express.json());

  app.get('/', (_req, res) => {
    res.status(200).json({ service: 'worker-node', status: 'up' });
  });

  app.use('/health', healthRouter);
  app.use('/queue-info', queueInfoRouter);
  app.use('/request-google-rss', requestGoogleRssRouter);
  app.use('/semantic-scorer', semanticScorerRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp();
