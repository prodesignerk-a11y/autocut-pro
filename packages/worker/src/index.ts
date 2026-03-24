import 'dotenv/config';
import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { VideoJobData } from '@autocut/shared';
import { processVideo } from './processors/video.processor';
import { workerLogger as logger } from './logger';

const QUEUE_NAME = 'video-processing';
const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '2', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a dedicated Redis connection for the worker
const redisConnection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redisConnection.on('connect', () => logger.info('Worker Redis connected'));
redisConnection.on('error', (err) => logger.error('Worker Redis error', { error: err.message }));

const worker = new Worker<VideoJobData>(
  QUEUE_NAME,
  async (job: Job<VideoJobData>) => {
    logger.info('Processing job', {
      jobId: job.id,
      videoProjectId: job.data.videoProjectId,
      attempt: job.attemptsMade + 1,
    });

    await processVideo(job);
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
    limiter: {
      max: CONCURRENCY,
      duration: 1000,
    },
  }
);

worker.on('completed', (job) => {
  logger.info('Job completed', {
    jobId: job.id,
    videoProjectId: job.data.videoProjectId,
    duration: job.finishedOn && job.processedOn
      ? `${((job.finishedOn - job.processedOn) / 1000).toFixed(1)}s`
      : 'unknown',
  });
});

worker.on('failed', (job, err) => {
  logger.error('Job failed', {
    jobId: job?.id,
    videoProjectId: job?.data?.videoProjectId,
    error: err.message,
    attemptsMade: job?.attemptsMade,
  });
});

worker.on('error', (err) => {
  logger.error('Worker error', { error: err.message, stack: err.stack });
});

worker.on('active', (job) => {
  logger.info('Job started', {
    jobId: job.id,
    videoProjectId: job.data.videoProjectId,
  });
});

worker.on('stalled', (jobId) => {
  logger.warn('Job stalled', { jobId });
});

logger.info('AutoCut Pro Worker started', {
  queue: QUEUE_NAME,
  concurrency: CONCURRENCY,
  redis: REDIS_URL.replace(/:[^:@]+@/, ':***@'), // Mask password
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info(`${signal} received. Shutting down worker gracefully...`);

  try {
    await worker.close();
    logger.info('Worker closed');
  } catch (err) {
    logger.error('Error closing worker', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    await redisConnection.quit();
    logger.info('Redis connection closed');
  } catch (err) {
    logger.error('Error closing Redis', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  shutdown('UNHANDLED_REJECTION');
});
