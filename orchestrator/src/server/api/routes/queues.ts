/**
 * Queue Status API Routes
 * 
 * Provides monitoring endpoints for BullMQ queues
 */

import { Router, type Request, type Response } from 'express';
import { getAllQueuesStatus, queues } from '../../queues/index.js';

export const queuesRouter = Router();

/**
 * GET /api/queues/status
 * Get status of all queues
 */
queuesRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const statuses = await getAllQueuesStatus();
    
    res.json({
      success: true,
      data: {
        queues: statuses,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to get queue status: ${message}`,
    });
  }
});

/**
 * GET /api/queues/:queueName/status
 * Get status of a specific queue
 */
queuesRouter.get('/:queueName/status', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    
    if (!(queueName in queues)) {
      return res.status(404).json({
        success: false,
        error: `Queue '${queueName}' not found`,
      });
    }

    const queue = queues[queueName as keyof typeof queues];
    
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    res.json({
      success: true,
      data: {
        name: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to get queue status: ${message}`,
    });
  }
});

/**
 * GET /api/queues/:queueName/jobs/:jobId
 * Get details of a specific job
 */
queuesRouter.get('/:queueName/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    
    if (!(queueName in queues)) {
      return res.status(404).json({
        success: false,
        error: `Queue '${queueName}' not found`,
      });
    }

    const queue = queues[queueName as keyof typeof queues];
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: `Job ${jobId} not found in queue ${queueName}`,
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        name: job.name,
        data: job.data,
        progress: job.progress,
        returnvalue: job.returnvalue,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        stacktrace: job.stacktrace,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to get job details: ${message}`,
    });
  }
});

/**
 * GET /api/queues/:queueName/jobs
 * Get jobs from a specific queue
 */
queuesRouter.get('/:queueName/jobs', async (req: Request, res: Response) => {
  try {
    const { queueName } = req.params;
    const { status = 'waiting', start = 0, end = 10 } = req.query;
    
    if (!(queueName in queues)) {
      return res.status(404).json({
        success: false,
        error: `Queue '${queueName}' not found`,
      });
    }

    const queue = queues[queueName as keyof typeof queues];
    let jobs;

    switch (status) {
      case 'waiting':
        jobs = await queue.getWaiting(Number(start), Number(end));
        break;
      case 'active':
        jobs = await queue.getActive(Number(start), Number(end));
        break;
      case 'completed':
        jobs = await queue.getCompleted(Number(start), Number(end));
        break;
      case 'failed':
        jobs = await queue.getFailed(Number(start), Number(end));
        break;
      case 'delayed':
        jobs = await queue.getDelayed(Number(start), Number(end));
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Invalid status: ${status}`,
        });
    }

    res.json({
      success: true,
      data: {
        queueName,
        status,
        jobs: jobs.map((job: any) => ({
          id: job.id,
          name: job.name,
          data: job.data,
          progress: job.progress,
          attemptsMade: job.attemptsMade,
          timestamp: job.timestamp,
          processedOn: job.processedOn,
          finishedOn: job.finishedOn,
        })),
        count: jobs.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to get jobs: ${message}`,
    });
  }
});

/**
 * DELETE /api/queues/:queueName/jobs/:jobId
 * Remove a specific job from queue
 */
queuesRouter.delete('/:queueName/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { queueName, jobId } = req.params;
    
    if (!(queueName in queues)) {
      return res.status(404).json({
        success: false,
        error: `Queue '${queueName}' not found`,
      });
    }

    const queue = queues[queueName as keyof typeof queues];
    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: `Job ${jobId} not found in queue ${queueName}`,
      });
    }

    await job.remove();

    res.json({
      success: true,
      data: {
        message: `Job ${jobId} removed from queue ${queueName}`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      success: false,
      error: `Failed to remove job: ${message}`,
    });
  }
});
