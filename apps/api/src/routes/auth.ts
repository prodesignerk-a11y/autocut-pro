import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import prisma from '../lib/prisma';
import { logger } from '../lib/logger';
import { ApiResponse, AuthResponse } from '@autocut/shared';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function generateToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

// POST /api/auth/register
const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as z.infer<typeof registerSchema>;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      const response: ApiResponse = {
        success: false,
        error: 'Email already registered',
      };
      res.status(409).json(response);
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: email === process.env.ADMIN_EMAIL ? 'admin' : 'user',
      },
    });

    const token = generateToken(user.id, user.email, user.role);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
          role: user.role as 'user' | 'admin',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens: {
          accessToken: token,
          expiresIn: 7 * 24 * 3600,
        },
      },
      message: 'Registration successful',
    };

    logger.info('User registered', { userId: user.id, email });
    res.status(201).json(response);
  } catch (err) {
    logger.error('Registration error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Registration failed',
    };
    res.status(500).json(response);
  }
});

// POST /api/auth/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      res.status(401).json(response);
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid email or password',
      };
      res.status(401).json(response);
      return;
    }

    const token = generateToken(user.id, user.email, user.role);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          emailVerified: user.emailVerified,
          role: user.role as 'user' | 'admin',
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        tokens: {
          accessToken: token,
          expiresIn: 7 * 24 * 3600,
        },
      },
    };

    logger.info('User logged in', { userId: user.id });
    res.json(response);
  } catch (err) {
    logger.error('Login error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Login failed',
    };
    res.status(500).json(response);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  // JWT-based auth — just acknowledge on client side
  const response: ApiResponse = {
    success: true,
    message: 'Logged out successfully',
  };
  res.json(response);
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const { password: _pw, ...safeUser } = user;

    const response: ApiResponse = {
      success: true,
      data: safeUser,
    };
    res.json(response);
  } catch (err) {
    logger.error('Get me error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch user',
    };
    res.status(500).json(response);
  }
});

// POST /api/auth/refresh-token
const refreshSchema = z.object({
  token: z.string(),
});

router.post('/refresh-token', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { token } = req.body as z.infer<typeof refreshSchema>;

    let decoded: { userId: string; email: string; role: string };
    try {
      decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        role: string;
      };
    } catch {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid or expired token',
      };
      res.status(401).json(response);
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found',
      };
      res.status(404).json(response);
      return;
    }

    const newToken = generateToken(user.id, user.email, user.role);

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken: newToken,
        expiresIn: 7 * 24 * 3600,
      },
    };
    res.json(response);
  } catch (err) {
    logger.error('Refresh token error', { error: err });
    const response: ApiResponse = {
      success: false,
      error: 'Token refresh failed',
    };
    res.status(500).json(response);
  }
});

export default router;
