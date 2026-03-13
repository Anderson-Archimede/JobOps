/**
 * Skills DNA API: GET cached profile, POST refresh (extract + gap analysis).
 */

import { Router } from "express";
import type { AuthRequest } from "../../middleware/authenticateJWT";
import {
  getSkillsProfile,
  getSkillsHistory,
  extractSkillsFromCVs,
  computeGapAnalysis,
} from "../../services/skillsDNA";

export const seekerSkillsDNARouter = Router();

/**
 * GET /api/seeker/skills-dna
 * Returns cached skills and gap analysis for the current user.
 */
seekerSkillsDNARouter.get("/skills-dna", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const profile = await getSkillsProfile(userId);

    return res.json({
      ok: true,
      data: {
        skills: profile.skills,
        gapAnalysis: profile.gapAnalysis,
        lastUpdated: profile.lastUpdated?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("[seeker-skills-dna] GET error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/seeker/skills-dna/history
 * Returns up to 6 months of category-level snapshots for the progression chart.
 */
seekerSkillsDNARouter.get("/skills-dna/history", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const history = await getSkillsHistory(userId);
    return res.json({ ok: true, data: history });
  } catch (error) {
    console.error("[seeker-skills-dna] GET history error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/seeker/skills-dna/refresh
 * Runs extraction from CVs and gap analysis, then returns updated data.
 */
seekerSkillsDNARouter.post("/skills-dna/refresh", async (req, res) => {
  try {
    const userId = (req as AuthRequest).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    console.info(`[skills-dna] refresh start for user ${userId}`);
    const skills = await extractSkillsFromCVs(userId);
    console.info(`[skills-dna] extracted ${skills.length} skills for user ${userId}`);
    const gapAnalysis = await computeGapAnalysis(userId);
    console.info(`[skills-dna] gap analysis: ${gapAnalysis.length} gaps`);
    const profile = await getSkillsProfile(userId);

    return res.json({
      ok: true,
      data: {
        skills: profile.skills,
        gapAnalysis: profile.gapAnalysis,
        lastUpdated: profile.lastUpdated?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("[seeker-skills-dna] POST refresh error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
