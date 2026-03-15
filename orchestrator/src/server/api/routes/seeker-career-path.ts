/**
 * Career Path API routes: GET progression graph, GET transition scenario details.
 */

import { Router } from "express";
import type { AuthRequest } from "../../middleware/authenticateJWT";
import {
  generateCareerGraph,
  getScenarioDetail,
} from "../../services/careerPathAgent";

export const seekerCareerPathRouter = Router();

/**
 * GET /api/seeker/career-path
 * Returns career progression graph with nodes and edges for force-directed visualization.
 */
seekerCareerPathRouter.get("/career-path", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const graph = await generateCareerGraph(userId);

    return res.json({
      ok: true,
      data: graph,
    });
  } catch (error) {
    console.error("[seeker-career-path] GET error:", error);
    return res.status(500).json({
      ok: false,
      error: { message: "Failed to generate career graph" },
    });
  }
});

/**
 * GET /api/seeker/career-path/scenario?from=<nodeId>&to=<nodeId>
 * Returns detailed transition scenario with gap analysis, companies, actions.
 */
seekerCareerPathRouter.get("/career-path/scenario", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    const fromNodeId = req.query.from as string | undefined;
    const toNodeId = req.query.to as string | undefined;

    if (!fromNodeId || !toNodeId) {
      return res.status(400).json({
        ok: false,
        error: { message: "Query parameters 'from' and 'to' are required" },
      });
    }

    const scenario = await getScenarioDetail(fromNodeId, toNodeId, userId);

    return res.json({
      ok: true,
      data: scenario,
    });
  } catch (error) {
    console.error("[seeker-career-path] GET scenario error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate scenario";
    return res.status(500).json({
      ok: false,
      error: { message },
    });
  }
});
