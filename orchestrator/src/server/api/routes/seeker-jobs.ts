/**
 * Seeker Jobs API routes
 * Handles job listing, filtering, and view tracking for the seeker dashboard.
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { jobs, jobViews } from "../../db/schema";
import { eq, and, gte, desc, sql, notExists } from "drizzle-orm";
import type { AuthenticatedRequest } from "../../middleware/auth";

export const seekerJobsRouter = Router();

const jobsQuerySchema = z.object({
  filter: z.enum(["new", "unseen", "all"]).optional().default("all"),
  sortBy: z.enum(["createdAt", "suitabilityScore", "title"]).optional().default("createdAt"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * GET /api/seeker/jobs
 * Lists jobs with filtering and pagination.
 * Filters:
 *   - new: jobs created in the last 48 hours
 *   - unseen: jobs not yet viewed by this user
 *   - all: all jobs
 */
seekerJobsRouter.get("/jobs", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = jobsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid query parameters", details: parsed.error.flatten() });
    }

    const { filter, sortBy, page, limit } = parsed.data;
    const offset = (page - 1) * limit;

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    let whereConditions = eq(jobs.userId, userId);

    if (filter === "new") {
      whereConditions = and(
        eq(jobs.userId, userId),
        gte(jobs.createdAt, fortyEightHoursAgo)
      )!;
    } else if (filter === "unseen") {
      whereConditions = and(
        eq(jobs.userId, userId),
        notExists(
          db
            .select({ one: sql`1` })
            .from(jobViews)
            .where(
              and(
                eq(jobViews.jobId, jobs.id),
                eq(jobViews.userId, userId)
              )
            )
        )
      )!;
    }

    const orderByColumn = sortBy === "suitabilityScore" 
      ? desc(jobs.suitabilityScore)
      : sortBy === "title"
      ? jobs.title
      : desc(jobs.createdAt);

    const [jobsList, totalCountResult] = await Promise.all([
      db
        .select({
          id: jobs.id,
          title: jobs.title,
          employer: jobs.employer,
          location: jobs.location,
          salary: jobs.salary,
          jobUrl: jobs.jobUrl,
          status: jobs.status,
          suitabilityScore: jobs.suitabilityScore,
          createdAt: jobs.createdAt,
          source: jobs.source,
        })
        .from(jobs)
        .where(whereConditions)
        .orderBy(orderByColumn)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(jobs)
        .where(whereConditions),
    ]);

    const totalCount = totalCountResult[0]?.count ?? 0;
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      jobs: jobsList,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("[seeker-jobs] Error fetching jobs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/seeker/jobs/:id/view
 * Records that the user has viewed a job (upsert).
 */
seekerJobsRouter.post("/jobs/:id/view", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const jobId = req.params.id;

    if (!jobId) {
      return res.status(400).json({ error: "Job ID is required" });
    }

    const existingJob = await db.query.jobs.findFirst({
      where: and(eq(jobs.id, jobId), eq(jobs.userId, userId)),
      columns: { id: true },
    });

    if (!existingJob) {
      return res.status(404).json({ error: "Job not found" });
    }

    await db
      .insert(jobViews)
      .values({
        userId,
        jobId,
      })
      .onConflictDoNothing({
        target: [jobViews.userId, jobViews.jobId],
      });

    return res.json({ success: true, message: "Job view recorded" });
  } catch (error) {
    console.error("[seeker-jobs] Error recording job view:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/seeker/jobs/count-new
 * Returns the count of new jobs (last 48h) not yet viewed by the user.
 */
seekerJobsRouter.get("/jobs/count-new", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          gte(jobs.createdAt, fortyEightHoursAgo),
          notExists(
            db
              .select({ one: sql`1` })
              .from(jobViews)
              .where(
                and(
                  eq(jobViews.jobId, jobs.id),
                  eq(jobViews.userId, userId)
                )
              )
          )
        )
      );

    const count = result[0]?.count ?? 0;

    return res.json({ count });
  } catch (error) {
    console.error("[seeker-jobs] Error counting new jobs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
