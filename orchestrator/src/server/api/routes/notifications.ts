import { Router } from "express";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db, schema } from "../../db";
import type { AuthRequest } from "../../middleware/authenticateJWT";

const { jobs } = schema;

export const notificationsRouter = Router();

/**
 * GET /api/notifications/count
 * Get count of unread notifications
 */
notificationsRouter.get("/count", async (req, res) => {
  try {
    // For now, count notifications based on job events:
    // - New jobs in ready stage (last 24h)
    // - Jobs with interviews scheduled
    // - Jobs with stage changes (last 24h)
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({
        error: "Non authentifié",
      });
    }
    
    // Count new ready jobs
    const newReadyJobs = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "ready"),
          gte(jobs.updatedAt, yesterday),
        ),
      );

    // Count interview status jobs
    const interviewJobs = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.status, "in_progress")));

    // Count recent status changes (approximation based on updatedAt)
    const recentUpdates = await db
      .select({ count: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          inArray(jobs.status, ["applied", "in_progress", "processing"]),
          gte(jobs.updatedAt, yesterday),
        ),
      );

    const totalCount = 
      (Number(newReadyJobs[0]?.count) || 0) +
      (Number(interviewJobs[0]?.count) || 0) +
      (Number(recentUpdates[0]?.count) || 0);

    return res.json({
      count: totalCount,
      breakdown: {
        newJobs: Number(newReadyJobs[0]?.count) || 0,
        interviews: Number(interviewJobs[0]?.count) || 0,
        updates: Number(recentUpdates[0]?.count) || 0,
      },
    });
  } catch (error) {
    console.error("Notifications count error:", error);
    return res.status(500).json({
      error: "Failed to fetch notifications count",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /api/notifications
 * Get full notifications list (placeholder for future implementation)
 */
notificationsRouter.get("/", async (req, res) => {
  try {
    // TODO: Implement full notifications system
    return res.json({
      notifications: [],
      totalCount: 0,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(500).json({
      error: "Failed to fetch notifications",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
