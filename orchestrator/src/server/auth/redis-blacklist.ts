import { Redis } from "ioredis";

let redisClient: Redis | null = null;

export function initRedisBlacklist(redisUrl: string) {
  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  return redisClient;
}

export async function blacklistToken(tokenId: string, expiresInSeconds: number): Promise<void> {
  if (!redisClient) throw new Error("Redis blacklist not initialized");
  await redisClient.setex(`blacklist:${tokenId}`, expiresInSeconds, "1");
}

export async function isTokenBlacklisted(tokenId: string): Promise<boolean> {
  if (!redisClient) throw new Error("Redis blacklist not initialized");
  const result = await redisClient.get(`blacklist:${tokenId}`);
  return result === "1";
}

export function getRedisClient(): Redis {
  if (!redisClient) throw new Error("Redis blacklist not initialized");
  return redisClient;
}
