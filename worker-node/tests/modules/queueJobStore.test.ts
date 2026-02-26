import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { QueueJobStore } from '../../src/modules/queue/jobStore';
import { getCheckStatusByJobId, getQueueStatus } from '../../src/modules/queue/queueStatus';
import { QueueJobRecord } from '../../src/modules/queue/types';

const makeJob = (overrides: Partial<QueueJobRecord> = {}): QueueJobRecord => ({
  jobId: overrides.jobId ?? 'job-1',
  endpointName: overrides.endpointName ?? '/semantic-scorer/start-job',
  status: overrides.status ?? 'queued',
  createdAt: overrides.createdAt ?? new Date('2026-01-01T00:00:00.000Z').toISOString(),
  ...(overrides.startedAt ? { startedAt: overrides.startedAt } : {}),
  ...(overrides.endedAt ? { endedAt: overrides.endedAt } : {}),
  ...(overrides.failureReason ? { failureReason: overrides.failureReason } : {})
});

describe('QueueJobStore', () => {
  let tempDirPath = '';
  let storeFilePath = '';
  let store: QueueJobStore;

  beforeEach(async () => {
    tempDirPath = await fs.mkdtemp(path.join(os.tmpdir(), 'queue-store-test-'));
    storeFilePath = path.join(tempDirPath, 'queue-jobs.json');
    store = new QueueJobStore(storeFilePath);
    await store.ensureInitialized();
  });

  afterEach(async () => {
    await fs.rm(tempDirPath, { recursive: true, force: true });
  });

  it('creates, reads, and updates job status transitions', async () => {
    await store.appendJob(makeJob({ status: 'queued' }));

    const runningAt = new Date('2026-01-01T00:01:00.000Z').toISOString();
    await store.updateJob('job-1', (job) => ({
      ...job,
      status: 'running',
      startedAt: runningAt
    }));

    const endedAt = new Date('2026-01-01T00:02:00.000Z').toISOString();
    const completedJob = await store.updateJob('job-1', (job) => ({
      ...job,
      status: 'completed',
      endedAt
    }));

    expect(completedJob).toMatchObject({
      jobId: 'job-1',
      status: 'completed',
      startedAt: runningAt,
      endedAt
    });

    const byId = await store.getJobById('job-1');
    expect(byId?.status).toBe('completed');
  });

  it('serializes concurrent writes and keeps all records', async () => {
    const totalJobs = 50;

    await Promise.all(
      Array.from({ length: totalJobs }, (_value, index) =>
        store.appendJob(
          makeJob({
            jobId: `job-${index + 1}`,
            endpointName: '/request-google-rss/start-job'
          })
        )
      )
    );

    const jobs = await store.getJobs();
    expect(jobs).toHaveLength(totalJobs);
    expect(new Set(jobs.map((job) => job.jobId)).size).toBe(totalJobs);
  });

  it('writes atomically and leaves no temp files behind', async () => {
    await store.appendJob(makeJob({ jobId: 'job-atomic' }));

    const directoryEntries = await fs.readdir(tempDirPath);
    expect(directoryEntries.filter((name) => name.includes('.tmp'))).toEqual([]);

    const fileContents = await fs.readFile(storeFilePath, 'utf8');
    const parsed = JSON.parse(fileContents) as { jobs: Array<{ jobId: string }> };
    expect(parsed.jobs[0]?.jobId).toBe('job-atomic');
  });

  it('provides queue status helpers for queueStatus/checkStatus use cases', async () => {
    await store.appendJob(makeJob({ jobId: 'job-queued', status: 'queued' }));
    await store.appendJob(
      makeJob({
        jobId: 'job-running',
        status: 'running',
        startedAt: new Date('2026-01-01T00:05:00.000Z').toISOString()
      })
    );
    await store.appendJob(
      makeJob({
        jobId: 'job-failed',
        status: 'failed',
        endedAt: new Date('2026-01-01T00:07:00.000Z').toISOString(),
        failureReason: 'example_failure'
      })
    );

    const statusView = await getQueueStatus(store);
    expect(statusView.summary).toEqual({
      totalJobs: 3,
      queued: 1,
      running: 1,
      completed: 0,
      failed: 1,
      canceled: 0
    });
    expect(statusView.runningJob?.jobId).toBe('job-running');
    expect(statusView.queuedJobs.map((job) => job.jobId)).toEqual(['job-queued']);

    const checkStatus = await getCheckStatusByJobId(store, 'job-failed');
    expect(checkStatus?.status).toBe('failed');
  });
});
