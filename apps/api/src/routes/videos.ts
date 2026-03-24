import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import prisma from '../lib/prisma';
import { s3 } from '../lib/s3';
import { addVideoJob } from '../lib/queue';
import { logger } from '../lib/logger';
import { ApiResponse, ProcessingMode, VideoJobData } from '@autocut/shared';

const router = Router();

router.use(authenticate);

// GET /api/videos
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const status = req.query.status as string | undefined;

    const where = {
      userId,
      ...(status ? { status: status as any } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.videoProject.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.videoProject.count({ where }),
    ]);

    const serialized = items.map((v) => ({
      ...v,
      originalSize: v.originalSize.toString(),
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        items: serialized,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('List videos error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list videos',
    };
    res.status(500).json(response);
  }
});

// GET /api/videos/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const video = await prisma.videoProject.findFirst({
      where: { id, userId },
      include: {
        jobs: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!video) {
      const response: ApiResponse = {
        success: false,
        error: 'Video not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...video,
        originalSize: video.originalSize.toString(),
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Get video error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get video',
    };
    res.status(500).json(response);
  }
});

// POST /api/videos/:id/reprocess
const reprocessSchema = z.object({
  processingMode: z.nativeEnum(ProcessingMode).optional(),
  paddingMs: z.number().int().min(0).max(2000).optional(),
  noiseReduction: z.boolean().optional(),
  overlapVoiceDetection: z.boolean().optional(),
});

router.post('/:id/reprocess', validate(reprocessSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const body = req.body as z.infer<typeof reprocessSchema>;

    const video = await prisma.videoProject.findFirst({
      where: { id, userId },
    });

    if (!video) {
      const response: ApiResponse = {
        success: false,
        error: 'Video not found',
      };
      res.status(404).json(response);
      return;
    }

    if (video.status === 'processing') {
      const response: ApiResponse = {
        success: false,
        error: 'Video is currently being processed',
      };
      res.status(409).json(response);
      return;
    }

    const updated = await prisma.videoProject.update({
      where: { id },
      data: {
        status: 'queued',
        processingMode: body.processingMode || video.processingMode,
        paddingMs: body.paddingMs ?? video.paddingMs,
        noiseReduction: body.noiseReduction ?? video.noiseReduction,
        overlapVoiceDetection: body.overlapVoiceDetection ?? video.overlapVoiceDetection,
        retryCount: { increment: 1 },
        errorMessage: null,
        finalDuration: null,
        removedDuration: null,
        reductionPercent: null,
      },
    });

    const processingJob = await prisma.processingJob.create({
      data: {
        videoProjectId: id,
        status: 'queued',
        progress: 0,
        currentStep: 'Waiting in queue',
      },
    });

    const jobData: VideoJobData = {
      videoProjectId: id,
      userId,
      storageKeyOriginal: video.storageKeyOriginal,
      storageKeyOutput: video.storageKeyOutput || s3.generateVideoKey(userId, video.originalFileName, 'output'),
      processingMode: updated.processingMode as ProcessingMode,
      paddingMs: updated.paddingMs,
      noiseReduction: updated.noiseReduction,
      overlapVoiceDetection: updated.overlapVoiceDetection,
    };

    await addVideoJob(jobData);

    const response: ApiResponse = {
      success: true,
      data: {
        videoProjectId: id,
        jobId: processingJob.id,
      },
      message: 'Video queued for reprocessing',
    };

    res.json(response);
  } catch (err) {
    logger.error('Reprocess video error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to reprocess video',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/videos/:id
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const video = await prisma.videoProject.findFirst({
      where: { id, userId },
    });

    if (!video) {
      const response: ApiResponse = {
        success: false,
        error: 'Video not found',
      };
      res.status(404).json(response);
      return;
    }

    // Delete S3 assets (best effort)
    try {
      await s3.deleteObject(video.storageKeyOriginal);
    } catch {
      logger.warn('Failed to delete original S3 asset', { key: video.storageKeyOriginal });
    }

    if (video.storageKeyOutput) {
      try {
        await s3.deleteObject(video.storageKeyOutput);
      } catch {
        logger.warn('Failed to delete output S3 asset', { key: video.storageKeyOutput });
      }
    }

    await prisma.videoProject.delete({ where: { id } });

    const response: ApiResponse = {
      success: true,
      message: 'Video deleted',
    };

    res.json(response);
  } catch (err) {
    logger.error('Delete video error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete video',
    };
    res.status(500).json(response);
  }
});

// GET /api/videos/:id/download
router.get('/:id/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const video = await prisma.videoProject.findFirst({
      where: { id, userId },
    });

    if (!video) {
      const response: ApiResponse = {
        success: false,
        error: 'Video not found',
      };
      res.status(404).json(response);
      return;
    }

    if (video.status !== 'completed' || !video.storageKeyOutput) {
      const response: ApiResponse = {
        success: false,
        error: 'Video is not ready for download',
      };
      res.status(409).json(response);
      return;
    }

    const downloadUrl = await s3.getSignedDownloadUrl(video.storageKeyOutput);

    // Log download
    await prisma.usageLog.create({
      data: {
        userId,
        videoProjectId: id,
        action: 'download',
        metadata: { fileName: video.outputFileName },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        downloadUrl,
        fileName: video.outputFileName,
        expiresIn: 3600,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Download video error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate download URL',
    };
    res.status(500).json(response);
  }
});

export default router;
