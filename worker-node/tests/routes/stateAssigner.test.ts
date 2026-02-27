import express from 'express';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { errorHandler } from '../../src/modules/middleware/errorHandlers';
import { QueueJobStore } from '../../src/modules/queue/jobStore';
import { GlobalQueueEngine, QueueExecutionContext } from '../../src/modules/queue/queueEngine';
import { createStateAssignerRouter } from '../../src/routes/stateAssigner';

const buildApp = (
  queueEngine: GlobalQueueEngine,
  env: NodeJS.ProcessEnv,
  buildJobHandler?: (input: {
    targetArticleThresholdDaysOld: number;
    targetArticleStateReviewCount: number;
    keyOpenAi: string;
  }) => (context: QueueExecutionContext) => Promise<void>
): express.Express => {
  const app = express();
  app.use(express.json());
  app.use(
    '/state-assigner',
    createStateAssignerRouter({
      queueEngine,
      env,
      buildJobHandler: buildJobHandler ?? (() => async () => undefined)
    })
  );
  app.use(errorHandler);
  return app;
};

describe('stateAssigner routes', () => {
  let tempDirPath = '';
  let queueStore: QueueJobStore;
  let queueEngine: GlobalQueueEngine;

  beforeEach(async () => {
    tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'state-assigner-route-'));
    queueStore = new QueueJobStore(path.join(tempDirPath, 'queue-jobs.json'));
    await queueStore.ensureInitialized();

    let counter = 0;
    queueEngine = new GlobalQueueEngine(queueStore, {
      createJobId: () => {
        counter += 1;
        return `job-${counter}`;
      }
    });
  });

  afterEach(async () => {
    await queueEngine.onIdle();
    await fs.rm(tempDirPath, { recursive: true, force: true });
  });

  it('validates request body and enqueues state assigner job', async () => {
    const app = buildApp(queueEngine, {
      KEY_OPEN_AI: 'test-key'
    });

    const response = await request(app).post('/state-assigner/start-job').send({
      targetArticleThresholdDaysOld: 30,
      targetArticleStateReviewCount: 50
    });

    expect(response.status).toBe(202);
    expect(response.body).toEqual({
      jobId: 'job-1',
      status: 'queued',
      endpointName: '/state-assigner/start-job'
    });

    await queueEngine.onIdle();
    const queuedJob = await queueStore.getJobById('job-1');
    expect(queuedJob?.status).toBe('completed');
  });

  it('returns validation error when request body fields are invalid', async () => {
    const app = buildApp(queueEngine, {
      KEY_OPEN_AI: 'test-key'
    });

    const response = await request(app).post('/state-assigner/start-job').send({
      targetArticleThresholdDaysOld: 0
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      status: 400,
      details: [
        {
          field: 'targetArticleThresholdDaysOld',
          message: 'targetArticleThresholdDaysOld must be a positive integer'
        },
        {
          field: 'targetArticleStateReviewCount',
          message: 'targetArticleStateReviewCount must be a positive integer'
        }
      ]
    });
  });
});
