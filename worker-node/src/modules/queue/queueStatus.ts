import { QueueJobStore } from './jobStore';
import { QueueJobRecord, QueueStatusSummary } from './types';

export interface QueueStatusView {
  summary: QueueStatusSummary;
  runningJob: QueueJobRecord | null;
  queuedJobs: QueueJobRecord[];
}

export const summarizeQueueJobs = (jobs: QueueJobRecord[]): QueueStatusSummary => ({
  totalJobs: jobs.length,
  queued: jobs.filter((job) => job.status === 'queued').length,
  running: jobs.filter((job) => job.status === 'running').length,
  completed: jobs.filter((job) => job.status === 'completed').length,
  failed: jobs.filter((job) => job.status === 'failed').length,
  canceled: jobs.filter((job) => job.status === 'canceled').length
});

export const getCheckStatusByJobId = async (
  store: QueueJobStore,
  jobId: string
): Promise<QueueJobRecord | null> => store.getJobById(jobId);

export const getQueueStatus = async (store: QueueJobStore): Promise<QueueStatusView> => {
  const jobs = await store.getJobs();
  const runningJob = jobs.find((job) => job.status === 'running') ?? null;
  const queuedJobs = jobs.filter((job) => job.status === 'queued');

  return {
    summary: summarizeQueueJobs(jobs),
    runningJob,
    queuedJobs
  };
};
