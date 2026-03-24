import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { ApiResponse } from '@autocut/shared';

const router = Router();

router.use(authenticate);

// GET /api/jobs/:jobId/status
router.get('/:jobId/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = await prisma.processingJob.findFirst({
      where: {
        id: jobId,
        videoProject: { userId },
      },
      include: {
        videoProject: {
          select: {
            id: true,
            status: true,
            originalFileName: true,
            originalDuration: true,
            finalDuration: true,
            removedDuration: true,
            reductionPercent: true,
            errorMessage: true,
          },
        },
      },
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorMessage: job.errorMessage,
        videoProject: job.videoProject,
        updatedAt: job.updatedAt,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Get job status error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get job status',
    };
    res.status(500).json(response);
  }
});

// GET /api/jobs/:jobId/logs
router.get('/:jobId/logs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { jobId } = req.params;
    const userId = req.user!.id;

    const job = await prisma.processingJob.findFirst({
      where: {
        id: jobId,
        videoProject: { userId },
      },
      select: {
        id: true,
        workerLogs: true,
        status: true,
        progress: true,
        currentStep: true,
      },
    });

    if (!job) {
      const response: ApiResponse = {
        success: false,
        error: 'Job not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        jobId: job.id,
        logs: job.workerLogs,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Get job logs error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get job logs',
    };
    res.status(500).json(response);
  }
});

export default router;
