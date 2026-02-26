import { QueueJobStore } from '../queue/jobStore';
import { QueueJobRecord } from '../queue/types';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export interface QueueMaintenanceOptions {
  retentionDays?: number;
  now?: Date;
}

export interface QueueMaintenanceResult {
  repairedJobIds: string[];
  prunedJobIds: string[];
  totalJobsAfterMaintenance: number;
}

const isStaleStatus = (status: QueueJobRecord['status']): boolean =>
  status === 'queued' || status === 'running';

const isOlderThanRetention = (createdAtIso: string, cutoffEpochMs: number): boolean => {
  const parsedTime = Date.parse(createdAtIso);
  if (Number.isNaN(parsedTime)) {
    return true;
  }

  return parsedTime < cutoffEpochMs;
};

export const runQueueStartupMaintenance = async (
  store: QueueJobStore,
  options: QueueMaintenanceOptions = {}
): Promise<QueueMaintenanceResult> => {
  const retentionDays = options.retentionDays ?? 30;
  const now = options.now ?? new Date();
  const cutoffEpochMs = now.getTime() - retentionDays * MILLISECONDS_PER_DAY;
  const repairedJobIds: string[] = [];
  const prunedJobIds: string[] = [];

  const updatedJobs = await store.mutateJobs((existingJobs) => {
    const repairedJobs = existingJobs.map((job) => {
      if (!isStaleStatus(job.status)) {
        return job;
      }

      repairedJobIds.push(job.jobId);
      const repairedStatus: QueueJobRecord['status'] = 'failed';
      return {
        ...job,
        status: repairedStatus,
        endedAt: now.toISOString(),
        failureReason: 'worker_restart'
      };
    });

    return repairedJobs.filter((job) => {
      const shouldPrune = isOlderThanRetention(job.createdAt, cutoffEpochMs);
      if (shouldPrune) {
        prunedJobIds.push(job.jobId);
      }
      return !shouldPrune;
    });
  });

  return {
    repairedJobIds,
    prunedJobIds,
    totalJobsAfterMaintenance: updatedJobs.length
  };
};
