import { Router } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { queues } from '../../queues';

export const healthRouter = Router();

/**
 * GET /api/health
 * System health check with detailed service status
 */
healthRouter.get('/', async (req, res) => {
  try {
    const authEnabled = process.env.AUTH_ENABLED !== "false";
    const healthCheck = {
      status: 'healthy' as 'healthy' | 'degraded' | 'down',
      authEnabled,
      services: {
        database: 'healthy' as 'healthy' | 'degraded' | 'down',
        redis: 'healthy' as 'healthy' | 'degraded' | 'down',
        queues: 'healthy' as 'healthy' | 'degraded' | 'down',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      details: {
        activeJobs: 0,
        queuedJobs: 0,
        failedJobs: 0,
      },
    };

    // Check Database
    try {
      await db.execute(sql`SELECT 1`);
      healthCheck.services.database = 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
      healthCheck.services.database = 'down';
      healthCheck.status = 'degraded';
    }

    // Check Redis & Queues
    try {
      const queueNames = Object.keys(queues) as Array<keyof typeof queues>;
      let totalActive = 0;
      let totalWaiting = 0;
      let totalFailed = 0;

      for (const queueName of queueNames) {
        const queue = queues[queueName];
        const [active, waiting, failed] = await Promise.all([
          queue.getActiveCount(),
          queue.getWaitingCount(),
          queue.getFailedCount(),
        ]);

        totalActive += active;
        totalWaiting += waiting;
        totalFailed += failed;
      }

      healthCheck.details.activeJobs = totalActive;
      healthCheck.details.queuedJobs = totalWaiting;
      healthCheck.details.failedJobs = totalFailed;

      // Redis is healthy if we can get queue counts
      healthCheck.services.redis = 'healthy';
      healthCheck.services.queues = 'healthy';

      // Mark as degraded if there are too many failed jobs
      if (totalFailed > 10) {
        healthCheck.services.queues = 'degraded';
        healthCheck.status = 'degraded';
      }
    } catch (error) {
      console.error('Redis/Queue health check failed:', error);
      healthCheck.services.redis = 'down';
      healthCheck.services.queues = 'down';
      healthCheck.status = 'degraded';
    }

    // Overall status: down if any critical service is down
    if (healthCheck.services.database === 'down') {
      healthCheck.status = 'down';
    }

    const statusCode = healthCheck.status === 'down' ? 503 : 200;
    return res.status(statusCode).json(healthCheck);
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({
      status: 'down',
      authEnabled: process.env.AUTH_ENABLED !== "false",
      services: {
        database: 'down',
        redis: 'down',
        queues: 'down',
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/health/ping
 * Simple ping endpoint
 */
healthRouter.get('/ping', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
