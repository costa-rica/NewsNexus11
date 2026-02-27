import { Router } from 'express';
import { AppError } from '../modules/errors/appError';
import { QueueJobHandler } from '../modules/queue/queueEngine';
import {
  createSemanticScorerJobHandler,
  verifyKeywordsWorkbookExists,
  verifySemanticScorerDirectoryExists
} from '../modules/jobs/semanticScorerJob';
import { globalQueueEngine } from '../modules/queue/globalQueue';
import { GlobalQueueEngine } from '../modules/queue/queueEngine';

interface SemanticScorerRouteDependencies {
  queueEngine: GlobalQueueEngine;
  env: NodeJS.ProcessEnv;
  buildJobHandler: (semanticScorerDir: string) => QueueJobHandler;
}

const resolveSemanticScorerDirFromEnv = (env: NodeJS.ProcessEnv): string => {
  const value = env.PATH_TO_SEMANTIC_SCORER_DIR;
  if (!value || value.trim() === '') {
    throw AppError.validation([
      {
        field: 'PATH_TO_SEMANTIC_SCORER_DIR',
        message: 'PATH_TO_SEMANTIC_SCORER_DIR env var is required'
      }
    ]);
  }

  return value.trim();
};

export const createSemanticScorerRouter = (
  dependencies: SemanticScorerRouteDependencies = {
    queueEngine: globalQueueEngine,
    env: process.env,
    buildJobHandler: createSemanticScorerJobHandler
  }
): Router => {
  const router = Router();
  const { queueEngine, env, buildJobHandler } = dependencies;

  router.post('/start-job', async (_req, res, next) => {
    try {
      const endpointName = '/semantic-scorer/start-job';
      const semanticScorerDir = resolveSemanticScorerDirFromEnv(env);
      await verifySemanticScorerDirectoryExists(semanticScorerDir);
      await verifyKeywordsWorkbookExists(semanticScorerDir);

      const enqueueResult = await queueEngine.enqueueJob({
        endpointName,
        run: buildJobHandler(semanticScorerDir)
      });

      return res.status(202).json({
        jobId: enqueueResult.jobId,
        status: enqueueResult.status,
        endpointName
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
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

export default createSemanticScorerRouter();
