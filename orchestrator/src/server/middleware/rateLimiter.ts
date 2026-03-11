import { Request, Response, NextFunction } from "express";
import { Redis } from "ioredis";

const RATE_LIMIT_WINDOW = 15 * 60; // 15 minutes in seconds
const MAX_ATTEMPTS = 5;

let redisClient: Redis | null = null;

export function initRateLimiter(redis: Redis) {
  redisClient = redis;
}

export async function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (!redisClient) {
    console.warn("Rate limiter not initialized, skipping");
    return next();
  }

  try {
    const email = req.body.email;
    if (!email) {
      return next();
    }

    const key = `rate_limit:login:${email}`;
    const current = await redisClient.incr(key);

    if (current === 1) {
      await redisClient.expire(key, RATE_LIMIT_WINDOW);
    }

    if (current > MAX_ATTEMPTS) {
      const ttl = await redisClient.ttl(key);
      return res.status(429).json({
        error: "Too many login attempts",
        retryAfter: ttl,
        message: `Please try again in ${Math.ceil(ttl / 60)} minutes`,
      });
    }

    next();
  } catch (error) {
    console.error("Rate limiter error:", error);
    next();
  }
}
