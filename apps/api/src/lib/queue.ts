import { Queue, Job } from 'bullmq';
import { redis } from './redis';
import { VideoJobData } from '@autocut/shared';
import { logger } from './logger';

const QUEUE_NAME = 'video-processing';

export const videoProcessingQueue = new Queue<VideoJobData>(QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      count: 100,
      age: 7 * 24 * 3600, // 7 days
    },
    removeOnFail: {
      count: 50,
      age: 14 * 24 * 3600, // 14 days
    },
  },
});

export async function addVideoJob(data: VideoJobData): Promise<Job<VideoJobData>> {
  const job = await videoProcessingQueue.add('process-video', data, {
    jobId: data.videoProjectId,
  });
  logger.info('Video job added to queue', { jobId: job.id, videoProjectId: data.videoProjectId });
  return job;
}

export async function getJobStatus(jobId: string): Promise<{
  id: string;
  status: string;
  progress: number | object;
  data: VideoJobData | undefined;
  failedReason: string | undefined;
} | null> {
  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();

  return {
    id: job.id!,
    status: state,
    progress: job.progress,
    data: job.data,
    failedReason: job.failedReason,
  };
}

export async function retryJob(jobId: string): Promise<void> {
  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  await job.retry();
  logger.info('Job retry triggered', { jobId });
}

export async function removeJob(jobId: string): Promise<void> {
  const job = await videoProcessingQueue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  await job.remove();
  logger.info('Job removed from queue', { jobId });
}

export async function getQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    videoProcessingQueue.getWaitingCount(),
    videoProcessingQueue.getActiveCount(),
    videoProcessingQueue.getCompletedCount(),
    videoProcessingQueue.getFailedCount(),
    videoProcessingQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}
