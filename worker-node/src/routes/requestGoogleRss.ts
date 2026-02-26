import { Router } from 'express';
import { AppError } from '../modules/errors/appError';
import { QueueJobHandler } from '../modules/queue/queueEngine';
import { createRequestGoogleRssJobHandler, verifySpreadsheetFileExists } from '../modules/jobs/requestGoogleRssJob';
import { globalQueueEngine } from '../modules/queue/globalQueue';
import { GlobalQueueEngine } from '../modules/queue/queueEngine';

interface RequestGoogleRssRouteDependencies {
  queueEngine: GlobalQueueEngine;
  env: NodeJS.ProcessEnv;
  buildJobHandler: (spreadsheetPath: string) => QueueJobHandler;
}

const resolveSpreadsheetPathFromEnv = (env: NodeJS.ProcessEnv): string => {
  const value = env.PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED;
  if (!value || value.trim() === '') {
    throw AppError.validation([
      {
        field: 'PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED',
        message: 'PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED env var is required'
      }
    ]);
  }

  return value.trim();
};

export const createRequestGoogleRssRouter = (
  dependencies: RequestGoogleRssRouteDependencies = {
    queueEngine: globalQueueEngine,
    env: process.env,
    buildJobHandler: createRequestGoogleRssJobHandler
  }
): Router => {
  const router = Router();
  const { queueEngine, env, buildJobHandler } = dependencies;

  router.post('/start-job', async (_req, res, next) => {
    try {
      const endpointName = '/request-google-rss/start-job';
      const spreadsheetPath = resolveSpreadsheetPathFromEnv(env);
      await verifySpreadsheetFileExists(spreadsheetPath);

      const enqueueResult = await queueEngine.enqueueJob({
        endpointName,
        run: buildJobHandler(spreadsheetPath)
      });

      return res.status(202).json({
        jobId: enqueueResult.jobId,
        status: enqueueResult.status,
        endpointName
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return next(
          new AppError({
            status: 404,
            code: 'NOT_FOUND',
            message: (error as Error).message
          })
        );
      }

      if (error instanceof Error && error.message.includes('Spreadsheet file not found')) {
        return next(
          new AppError({
            status: 404,
            code: 'NOT_FOUND',
            message: error.message
          })
        );
      }

      return next(error);
    }
  });

  return router;
};

export default createRequestGoogleRssRouter();
