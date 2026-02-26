import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { QueueJobStore } from '../../src/modules/queue/jobStore';
import { QueueJobRecord } from '../../src/modules/queue/types';
import { runQueueStartupMaintenance } from '../../src/modules/startup/queueMaintenance';

const makeJob = (overrides: Partial<QueueJobRecord> = {}): QueueJobRecord => ({
  jobId: overrides.jobId ?? 'job-default',
  endpointName: overrides.endpointName ?? '/state-assigner/start-job',
  status: overrides.status ?? 'queued',
  createdAt: overrides.createdAt ?? new Date('2026-01-10T00:00:00.000Z').toISOString(),
  ...(overrides.startedAt ? { startedAt: overrides.startedAt } : {}),
  ...(overrides.endedAt ? { endedAt: overrides.endedAt } : {}),
  ...(overrides.failureReason ? { failureReason: overrides.failureReason } : {})
});

describe('runQueueStartupMaintenance', () => {
  let tempDirPath = '';
  let store: QueueJobStore;

  beforeEach(async () => {
    tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'queue-maintenance-test-'));
    store = new QueueJobStore(path.join(tempDirPath, 'queue-jobs.json'));
    await store.ensureInitialized();
  });

  afterEach(async () => {
    await fs.rm(tempDirPath, { recursive: true, force: true });
  });

  it('repairs stale jobs and prunes records older than retention', async () => {
    await store.appendJob(
      makeJob({
        jobId: 'job-stale-queued',
        status: 'queued',
        createdAt: new Date('2026-01-15T00:00:00.000Z').toISOString()
      })
    );
    await store.appendJob(
      makeJob({
        jobId: 'job-stale-running',
        status: 'running',
        createdAt: new Date('2026-01-16T00:00:00.000Z').toISOString(),
        startedAt: new Date('2026-01-16T00:01:00.000Z').toISOString()
      })
    );
    await store.appendJob(
      makeJob({
        jobId: 'job-old-completed',
        status: 'completed',
        createdAt: new Date('2025-11-01T00:00:00.000Z').toISOString(),
        endedAt: new Date('2025-11-01T00:10:00.000Z').toISOString()
      })
    );
    await store.appendJob(
      makeJob({
        jobId: 'job-recent-completed',
        status: 'completed',
        createdAt: new Date('2026-01-20T00:00:00.000Z').toISOString(),
        endedAt: new Date('2026-01-20T00:05:00.000Z').toISOString()
      })
    );

    const result = await runQueueStartupMaintenance(store, {
      now: new Date('2026-02-01T00:00:00.000Z'),
      retentionDays: 30
    });

    expect(result.repairedJobIds.sort()).toEqual(['job-stale-queued', 'job-stale-running']);
    expect(result.prunedJobIds).toEqual(['job-old-completed']);
    expect(result.totalJobsAfterMaintenance).toBe(3);

    const jobs = await store.getJobs();
    const staleQueued = jobs.find((job) => job.jobId === 'job-stale-queued');
    const staleRunning = jobs.find((job) => job.jobId === 'job-stale-running');
    const oldCompleted = jobs.find((job) => job.jobId === 'job-old-completed');

    expect(staleQueued?.status).toBe('failed');
    expect(staleQueued?.failureReason).toBe('worker_restart');
    expect(staleQueued?.endedAt).toBe('2026-02-01T00:00:00.000Z');

    expect(staleRunning?.status).toBe('failed');
    expect(staleRunning?.failureReason).toBe('worker_restart');
    expect(staleRunning?.endedAt).toBe('2026-02-01T00:00:00.000Z');

    expect(oldCompleted).toBeUndefined();
  });
});
