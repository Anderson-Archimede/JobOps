import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";
import { logger } from "../../infra/logger";

/**
 * Rate limiter for login attempts to prevent brute force.
 * Uses Redis for persistence across server restarts/clusters.
 */
export async function createLoginLimiter() {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  try {
    const client = createClient({ url: redisUrl });
    await client.connect();

    return rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5, // Limit each IP to 5 login attempts per windowMs
      standardHeaders: true,
      legacyHeaders: false,
      store: new RedisStore({
        // @ts-expect-error - Expected by rate-limit-redis
        sendCommand: (...args: string[]) => client.sendCommand(args),
      }),
      message: {
        ok: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many login attempts, please try again after 15 minutes",
        },
      },
      handler: (req, res, next, options) => {
        logger.warn({ ip: req.ip, route: req.path }, "Rate limit exceeded for login");
        res.status(429).json(options.message);
      },
    });
  } catch (error) {
    logger.error({ error }, "Failed to connect to Redis for rate limiting, falling back to in-memory store");
    // Fallback to in-memory if Redis is down
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 10, // Slightly more relaxed for in-memory
      message: {
        ok: false,
        error: {
          code: "TOO_MANY_REQUESTS",
          message: "Too many attempts, please try again later",
        },
      },
    });
  }
}
