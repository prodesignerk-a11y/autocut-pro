import { Router, Response } from 'express';
import { authenticate, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { getQueueStats } from '../lib/queue';
import { logger } from '../lib/logger';
import { ApiResponse } from '@autocut/shared';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

// GET /api/admin/jobs
router.get('/jobs', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const status = req.query.status as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.videoProject = { userId };

    const [items, total] = await Promise.all([
      prisma.processingJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          videoProject: {
            select: {
              id: true,
              userId: true,
              originalFileName: true,
              status: true,
              processingMode: true,
              originalSize: true,
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          },
        },
      }),
      prisma.processingJob.count({ where }),
    ]);

    const serialized = items.map((j) => ({
      ...j,
      videoProject: j.videoProject
        ? {
            ...j.videoProject,
            originalSize: j.videoProject.originalSize.toString(),
          }
        : null,
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
    logger.error('Admin list jobs error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list jobs',
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/users
router.get('/users', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { videoProjects: true },
          },
          subscription: {
            include: { plan: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        items: users,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Admin list users error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to list users',
    };
    res.status(500).json(response);
  }
});

// GET /api/admin/stats
router.get('/stats', async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalVideos,
      videosThisMonth,
      completedVideos,
      failedVideos,
      processingVideos,
      queuedVideos,
      timeSavedResult,
      queueStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.videoProject.count(),
      prisma.videoProject.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.videoProject.count({ where: { status: 'completed' } }),
      prisma.videoProject.count({ where: { status: 'failed' } }),
      prisma.videoProject.count({ where: { status: 'processing' } }),
      prisma.videoProject.count({ where: { status: 'queued' } }),
      prisma.videoProject.aggregate({
        where: { status: 'completed' },
        _sum: { removedDuration: true },
      }),
      getQueueStats(),
    ]);

    const storageResult = await prisma.videoProject.aggregate({
      _sum: { originalSize: true },
    });

    const response: ApiResponse = {
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        totalVideos,
        videosThisMonth,
        completedVideos,
        failedVideos,
        processingVideos,
        queuedVideos,
        totalTimeSavedSeconds: timeSavedResult._sum.removedDuration || 0,
        storageUsedBytes: storageResult._sum.originalSize?.toString() || '0',
        queue: queueStats,
      },
    };

    res.json(response);
  } catch (err) {
    logger.error('Admin stats error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to get stats',
    };
    res.status(500).json(response);
  }
});

export default router;
