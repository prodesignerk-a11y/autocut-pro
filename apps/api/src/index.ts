import 'dotenv/config';
import { httpServer } from './app';
import { logger } from './lib/logger';
import prisma from './lib/prisma';
import { redis } from './lib/redis';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function bootstrap() {
  try {
    // Test DB connection
    await prisma.$connect();
    logger.info('Database connected');

    // Ensure ADMIN_EMAIL user has admin role
    if (process.env.ADMIN_EMAIL) {
      await prisma.user.updateMany({
        where: { email: process.env.ADMIN_EMAIL, role: { not: 'admin' } },
        data: { role: 'admin' },
      });
    }

    // Start server
    const server = httpServer.listen(PORT, () => {
      logger.info(`AutoCut Pro API running on port ${PORT}`, {
        env: process.env.NODE_ENV || 'development',
        port: PORT,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await prisma.$disconnect();
          logger.info('Database disconnected');
        } catch (err) {
          logger.error('Error disconnecting database', { error: err });
        }

        try {
          await redis.quit();
          logger.info('Redis disconnected');
        } catch (err) {
          logger.error('Error disconnecting Redis', { error: err });
        }

        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message, stack: err.stack });
      shutdown('UNCAUGHT_EXCEPTION');
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled rejection', { reason });
      shutdown('UNHANDLED_REJECTION');
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

bootstrap();
