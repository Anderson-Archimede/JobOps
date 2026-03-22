/**
 * BullMQ Queue Configuration
 * 
 * Manages asynchronous job processing for:
 * - Scraping jobs
 * - Scoring jobs
 * - Tailoring CVs
 * - Export operations
 */

import { Queue, QueueOptions } from 'bullmq';
import type { RedisOptions } from 'ioredis';

// Redis connection configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Redis connection options (compatible with BullMQ's internal ioredis)
const redisConnectionOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,           // Don't block startup if Redis is unavailable
  enableReadyCheck: false,     // Avoid blocking on READONLY checks
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 200, 5000);
    console.warn(`[Redis] Reconnect attempt #${times}, next retry in ${delay}ms`);
    return delay;
  },
  reconnectOnError: (err: Error) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
};

function getRedisOptions(url: string): RedisOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port || "6379", 10),
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      ...redisConnectionOptions,
    };
  } catch {
    // Fallback if URL is invalid (e.g. localhost:6379 without protocol)
    return redisConnectionOptions;
  }
}

// Export redis connection for workers (BullMQ will create its own instance)
export const redisConnection: RedisOptions = getRedisOptions(REDIS_URL);

// Default queue options
const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

/**
 * Queue for scraping jobs from various sources
 */
export const scrapingQueue = new Queue('scraping', defaultQueueOptions);

/**
 * Queue for scoring jobs based on suitability
 */
export const scoringQueue = new Queue('scoring', defaultQueueOptions);

/**
 * Queue for tailoring CVs for specific jobs
 */
export const tailoringQueue = new Queue('tailoring', defaultQueueOptions);

/**
 * Queue for export operations (PDF generation, etc.)
 */
export const exportQueue = new Queue('export', defaultQueueOptions);

// Queue name to queue instance mapping
export const queues = {
  scraping: scrapingQueue,
  scoring: scoringQueue,
  tailoring: tailoringQueue,
  export: exportQueue,
} as const;

export type QueueName = keyof typeof queues;

/**
 * Get queue status for all queues
 */
export async function getAllQueuesStatus() {
  const statuses = await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    })
  );

  return statuses;
}

/**
 * Close all queue connections
 */
export async function closeQueues() {
  await Promise.all([
    scrapingQueue.close(),
    scoringQueue.close(),
    tailoringQueue.close(),
    exportQueue.close(),
  ]);
  console.log('✅ [Queue] All queues closed');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 [Queue] SIGTERM received, closing queues...');
  await closeQueues();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 [Queue] SIGINT received, closing queues...');
  await closeQueues();
  process.exit(0);
});
