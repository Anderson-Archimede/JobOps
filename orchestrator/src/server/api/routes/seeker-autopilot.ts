/**
 * API routes for Application Autopilot.
 * Semi-automated job applications with mandatory human validation.
 */

import { Router } from "express";
import { z } from "zod";
import type { AuthRequest } from "../../middleware/authenticateJWT";
import {
  getAutopilotQueue,
  prepareApplication,
  submitApplication,
  rejectApplication,
  getAutopilotHistory,
  getPendingReviewApplications,
  getAutopilotStats,
} from "../../services/autopilotAgent";

export const seekerAutopilotRouter = Router();

/**
 * GET /api/seeker/autopilot/queue
 * Get list of jobs eligible for autopilot (score >= threshold)
 */
seekerAutopilotRouter.get("/autopilot/queue", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const queue = await getAutopilotQueue(userId);

    return res.json({
      ok: true,
      data: queue,
    });
  } catch (err) {
    console.error("[autopilot] Failed to get queue:", err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to get autopilot queue" },
    });
  }
});

/**
 * GET /api/seeker/autopilot/pending
 * Get applications pending user review
 */
seekerAutopilotRouter.get("/autopilot/pending", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const pending = await getPendingReviewApplications(userId);

    return res.json({
      ok: true,
      data: pending,
    });
  } catch (err) {
    console.error("[autopilot] Failed to get pending applications:", err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to get pending applications" },
    });
  }
});

/**
 * GET /api/seeker/autopilot/history
 * Get autopilot submission history
 */
seekerAutopilotRouter.get("/autopilot/history", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const history = await getAutopilotHistory(userId);

    return res.json({
      ok: true,
      data: history,
    });
  } catch (err) {
    console.error("[autopilot] Failed to get history:", err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to get autopilot history" },
    });
  }
});

/**
 * GET /api/seeker/autopilot/stats
 * Get autopilot statistics
 */
seekerAutopilotRouter.get("/autopilot/stats", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const stats = await getAutopilotStats(userId);

    return res.json({
      ok: true,
      data: stats,
    });
  } catch (err) {
    console.error("[autopilot] Failed to get stats:", err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to get autopilot stats" },
    });
  }
});

/**
 * POST /api/seeker/autopilot/prepare/:jobId
 * Prepare an application for autopilot
 */
seekerAutopilotRouter.post("/autopilot/prepare/:jobId", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ ok: false, error: { message: "Job ID required" } });
    }

    const result = await prepareApplication(userId, jobId);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error(`[autopilot] Failed to prepare application for ${req.params.jobId}:`, err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to prepare application" },
    });
  }
});

/**
 * POST /api/seeker/autopilot/submit/:jobId
 * Submit an application AFTER explicit user approval
 * IMPORTANT: Requires userApproval === true in body
 */
seekerAutopilotRouter.post("/autopilot/submit/:jobId", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ ok: false, error: { message: "Job ID required" } });
    }

    const bodySchema = z.object({
      userApproval: z.literal(true, {
        errorMap: () => ({ message: "Explicit user approval (userApproval: true) is required" }),
      }),
    });

    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: { message: parsed.error.errors[0]?.message || "User approval required" },
      });
    }

    const result = await submitApplication(userId, jobId, parsed.data.userApproval);

    return res.json({
      ok: true,
      data: result,
    });
  } catch (err) {
    console.error(`[autopilot] Failed to submit application for ${req.params.jobId}:`, err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to submit application" },
    });
  }
});

/**
 * POST /api/seeker/autopilot/reject/:jobId
 * Reject an application (user declines to submit)
 */
seekerAutopilotRouter.post("/autopilot/reject/:jobId", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const { jobId } = req.params;
    if (!jobId) {
      return res.status(400).json({ ok: false, error: { message: "Job ID required" } });
    }

    await rejectApplication(userId, jobId);

    return res.json({
      ok: true,
      data: { message: "Application rejected" },
    });
  } catch (err) {
    console.error(`[autopilot] Failed to reject application for ${req.params.jobId}:`, err);
    return res.status(500).json({
      ok: false,
      error: { message: err instanceof Error ? err.message : "Failed to reject application" },
    });
  }
});
