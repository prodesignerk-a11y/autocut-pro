import { PrismaClient } from '@autocut/database';
import { JobStatus, WorkerLogEntry } from '@autocut/shared';
import { workerLogger as logger } from '../logger';

const prisma = new PrismaClient();

export async function updateJobProgress(
  jobDbId: string,
  progress: number,
  step: string,
  message?: string
): Promise<void> {
  try {
    await prisma.processingJob.update({
      where: { id: jobDbId },
      data: {
        progress,
        currentStep: step,
        updatedAt: new Date(),
      },
    });

    if (message) {
      await logWorkerEvent(jobDbId, 'info', message, { step, progress });
    }
  } catch (err) {
    logger.error('Failed to update job progress', {
      jobDbId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function updateJobStatus(
  jobDbId: string,
  status: JobStatus,
  options?: {
    errorMessage?: string;
    startedAt?: Date;
    completedAt?: Date;
    progress?: number;
    currentStep?: string;
  }
): Promise<void> {
  try {
    await prisma.processingJob.update({
      where: { id: jobDbId },
      data: {
        status,
        ...(options?.errorMessage !== undefined && { errorMessage: options.errorMessage }),
        ...(options?.startedAt && { startedAt: options.startedAt }),
        ...(options?.completedAt && { completedAt: options.completedAt }),
        ...(options?.progress !== undefined && { progress: options.progress }),
        ...(options?.currentStep !== undefined && { currentStep: options.currentStep }),
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('Failed to update job status', {
      jobDbId,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function updateVideoProjectStatus(
  videoProjectId: string,
  status: JobStatus,
  options?: {
    errorMessage?: string;
    finalDuration?: number;
    removedDuration?: number;
    reductionPercent?: number;
    originalDuration?: number;
  }
): Promise<void> {
  try {
    await prisma.videoProject.update({
      where: { id: videoProjectId },
      data: {
        status,
        ...(options?.errorMessage !== undefined && { errorMessage: options.errorMessage }),
        ...(options?.finalDuration !== undefined && { finalDuration: options.finalDuration }),
        ...(options?.removedDuration !== undefined && { removedDuration: options.removedDuration }),
        ...(options?.reductionPercent !== undefined && { reductionPercent: options.reductionPercent }),
        ...(options?.originalDuration !== undefined && { originalDuration: options.originalDuration }),
        updatedAt: new Date(),
      },
    });
  } catch (err) {
    logger.error('Failed to update video project status', {
      videoProjectId,
      status,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function logWorkerEvent(
  jobDbId: string,
  level: WorkerLogEntry['level'],
  message: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const entry: WorkerLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata }),
    };

    // Use raw query to append to JSON array
    await prisma.$executeRaw`
      UPDATE processing_jobs
      SET worker_logs = worker_logs || ${JSON.stringify([entry])}::jsonb,
          updated_at = NOW()
      WHERE id = ${jobDbId}
    `;
  } catch (err) {
    logger.error('Failed to log worker event', {
      jobDbId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function getJobByVideoProjectId(videoProjectId: string) {
  return prisma.processingJob.findFirst({
    where: { videoProjectId },
    orderBy: { createdAt: 'desc' },
  });
}

export { prisma };
