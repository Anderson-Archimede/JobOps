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
      return res.json({
        count: 0,
        breakdown: { newJobs: 0, interviews: 0, updates: 0 },
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
 * Get full notifications list built from recent job activity
 */
notificationsRouter.get("/", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.json({ notifications: [], totalCount: 0 });
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentJobs = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        employer: jobs.employer,
        status: jobs.status,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          gte(jobs.updatedAt, yesterday),
        ),
      )
      .orderBy(sql`${jobs.updatedAt} desc`)
      .limit(20);

    const notifications = recentJobs.map((job) => {
      let type: "new_job" | "interview" | "update" | "system" = "update";
      let title = "Mise à jour";
      let message = `${job.title} chez ${job.employer || "Entreprise"}`;

      if (job.status === "ready") {
        type = "new_job";
        title = "Nouveau job prêt";
      } else if (job.status === "in_progress") {
        type = "interview";
        title = "Candidature en cours";
      } else if (job.status === "applied") {
        type = "update";
        title = "Candidature envoyée";
      }

      return {
        id: `job-${job.id}`,
        type,
        title,
        message,
        read: false,
        createdAt: job.updatedAt?.toISOString() || new Date().toISOString(),
        url: `/job/${job.id}`,
      };
    });

    return res.json({
      notifications,
      totalCount: notifications.length,
    });
  } catch (error) {
    console.error("Notifications error:", error);
    return res.status(500).json({
      error: "Failed to fetch notifications",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});
