import { Router, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validate';
import prisma from '../lib/prisma';
import { s3 } from '../lib/s3';
import { addVideoJob } from '../lib/queue';
import { logger } from '../lib/logger';
import {
  ApiResponse,
  ProcessingMode,
  JobStatus,
  VideoJobData,
} from '@autocut/shared';

const router = Router();

router.use(authenticate);

// POST /api/uploads/sessions
const createSessionSchema = z.object({
  fileName: z.string().min(1).max(500),
  fileSize: z.number().positive(),
  totalChunks: z.number().int().positive(),
  processingMode: z.nativeEnum(ProcessingMode).optional().default(ProcessingMode.Medium),
  paddingMs: z.number().int().min(0).max(2000).optional().default(200),
  noiseReduction: z.boolean().optional().default(false),
  overlapVoiceDetection: z.boolean().optional().default(false),
});

router.post('/sessions', validate(createSessionSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const body = req.body as z.infer<typeof createSessionSchema>;
    const userId = req.user!.id;

    const maxSizeMb = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '2048');
    if (body.fileSize > maxSizeMb * 1024 * 1024) {
      const response: ApiResponse = {
        success: false,
        error: `File size exceeds maximum of ${maxSizeMb}MB`,
      };
      res.status(400).json(response);
      return;
    }

    const storageKey = s3.generateVideoKey(userId, body.fileName, 'original');
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const session = await prisma.uploadSession.create({
      data: {
        id: sessionId,
        userId,
        fileName: body.fileName,
        fileSize: BigInt(body.fileSize),
        totalChunks: body.totalChunks,
        storageKey,
        expiresAt,
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        sessionId: session.id,
        storageKey: session.storageKey,
        expiresAt: session.expiresAt.toISOString(),
        processingMode: body.processingMode,
        paddingMs: body.paddingMs,
        noiseReduction: body.noiseReduction,
        overlapVoiceDetection: body.overlapVoiceDetection,
      },
    };

    logger.info('Upload session created', { sessionId, userId });
    res.status(201).json(response);
  } catch (err) {
    logger.error('Create upload session error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create upload session',
    };
    res.status(500).json(response);
  }
});

// POST /api/uploads/sessions/:id/presign/:chunk
router.post('/sessions/:id/presign/:chunk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: sessionId, chunk } = req.params;
    const chunkIndex = parseInt(chunk);
    const userId = req.user!.id;

    const session = await prisma.uploadSession.findFirst({
      where: { id: sessionId, userId, completed: false },
    });

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session not found',
      };
      res.status(404).json(response);
      return;
    }

    if (new Date() > session.expiresAt) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session expired',
      };
      res.status(410).json(response);
      return;
    }

    if (chunkIndex < 0 || chunkIndex >= session.totalChunks) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid chunk index',
      };
      res.status(400).json(response);
      return;
    }

    const chunkKey = s3.generateChunkKey(sessionId, chunkIndex);
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

    const presignedUrl = await s3.getSignedUploadUrl(
      chunkKey,
      'application/octet-stream',
      CHUNK_SIZE
    );

    const response: ApiResponse = {
      success: true,
      data: {
        presignedUrl,
        chunkIndex,
        storageKey: chunkKey,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Presign chunk error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to generate presigned URL',
    };
    res.status(500).json(response);
  }
});

// POST /api/uploads/sessions/:id/chunk (mark chunk as uploaded)
router.post('/sessions/:id/chunk', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const { chunkIndex } = req.body as { chunkIndex: number };
    const userId = req.user!.id;

    const session = await prisma.uploadSession.findFirst({
      where: { id: sessionId, userId, completed: false },
    });

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session not found',
      };
      res.status(404).json(response);
      return;
    }

    const updated = await prisma.uploadSession.update({
      where: { id: sessionId },
      data: { uploadedChunks: { increment: 1 } },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        uploadedChunks: updated.uploadedChunks,
        totalChunks: updated.totalChunks,
        progress: Math.round((updated.uploadedChunks / updated.totalChunks) * 100),
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Chunk upload mark error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update chunk status',
    };
    res.status(500).json(response);
  }
});

// POST /api/uploads/sessions/:id/complete
const completeSchema = z.object({
  processingMode: z.nativeEnum(ProcessingMode).default(ProcessingMode.Medium),
  paddingMs: z.number().int().min(0).max(2000).optional().default(200),
  noiseReduction: z.boolean().optional().default(false),
  overlapVoiceDetection: z.boolean().optional().default(false),
});

router.post('/sessions/:id/complete', validate(completeSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const body = req.body as z.infer<typeof completeSchema>;
    const userId = req.user!.id;

    const session = await prisma.uploadSession.findFirst({
      where: { id: sessionId, userId, completed: false },
    });

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session not found',
      };
      res.status(404).json(response);
      return;
    }

    // Create VideoProject
    const outputKey = s3.generateVideoKey(userId, session.fileName, 'output');

    const videoProject = await prisma.videoProject.create({
      data: {
        userId,
        originalFileName: session.fileName,
        originalSize: session.fileSize,
        storageKeyOriginal: session.storageKey,
        storageKeyOutput: outputKey,
        outputFileName: `processed_${session.fileName}`,
        status: 'queued',
        processingMode: body.processingMode,
        paddingMs: body.paddingMs,
        noiseReduction: body.noiseReduction,
        overlapVoiceDetection: body.overlapVoiceDetection,
      },
    });

    // Create ProcessingJob record
    const processingJob = await prisma.processingJob.create({
      data: {
        videoProjectId: videoProject.id,
        status: 'queued',
        progress: 0,
        currentStep: 'Waiting in queue',
      },
    });

    // Mark session as complete
    await prisma.uploadSession.update({
      where: { id: sessionId },
      data: {
        completed: true,
        videoProjectId: videoProject.id,
      },
    });

    // Add to BullMQ
    const jobData: VideoJobData = {
      videoProjectId: videoProject.id,
      userId,
      storageKeyOriginal: session.storageKey,
      storageKeyOutput: outputKey,
      processingMode: body.processingMode,
      paddingMs: body.paddingMs,
      noiseReduction: body.noiseReduction,
      overlapVoiceDetection: body.overlapVoiceDetection,
    };

    await addVideoJob(jobData);

    // Usage log
    await prisma.usageLog.create({
      data: {
        userId,
        videoProjectId: videoProject.id,
        action: 'upload_complete',
        metadata: {
          fileName: session.fileName,
          fileSize: session.fileSize.toString(),
          processingMode: body.processingMode,
        },
      },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        videoProjectId: videoProject.id,
        jobId: processingJob.id,
      },
      message: 'Video queued for processing',
    };

    logger.info('Upload completed, job queued', {
      videoProjectId: videoProject.id,
      jobId: processingJob.id,
    });

    res.status(201).json(response);
  } catch (err) {
    logger.error('Complete upload error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to complete upload',
    };
    res.status(500).json(response);
  }
});

// GET /api/uploads/sessions/:id
router.get('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user!.id;

    const session = await prisma.uploadSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session not found',
      };
      res.status(404).json(response);
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        ...session,
        fileSize: session.fileSize.toString(),
        progress: Math.round((session.uploadedChunks / session.totalChunks) * 100),
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Get session error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get session',
    };
    res.status(500).json(response);
  }
});

// DELETE /api/uploads/sessions/:id
router.delete('/sessions/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const userId = req.user!.id;

    const session = await prisma.uploadSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Upload session not found',
      };
      res.status(404).json(response);
      return;
    }

    // Try to clean up any uploaded chunks from S3
    if (!session.completed) {
      for (let i = 0; i < session.uploadedChunks; i++) {
        const chunkKey = s3.generateChunkKey(sessionId, i);
        try {
          await s3.deleteObject(chunkKey);
        } catch {
          // Best effort cleanup
        }
      }
    }

    await prisma.uploadSession.delete({ where: { id: sessionId } });

    const response: ApiResponse = {
      success: true,
      message: 'Upload session cancelled',
    };

    res.json(response);
  } catch (err) {
    logger.error('Delete session error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to cancel upload',
    };
    res.status(500).json(response);
  }
});

export default router;
