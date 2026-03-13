import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db, schema } from "../../db";
import type { AuthRequest } from "../../middleware/authenticateJWT";
import type {
  UserProfileData,
  UserSkill,
  UserSkillCategory,
  UserSkillLevel,
} from "../types/userProfile";

const { users } = schema;

export const seekerProfileRouter = Router();

const userSkillCategorySchema = z.enum([
  "BI_ANALYTICS",
  "DATA_ENGINEERING",
  "CLOUD",
  "ML_AI",
  "SOFT",
  "DOMAIN",
] satisfies readonly UserSkillCategory[]);

const userSkillLevelSchema = z.enum([
  "NOTIONS",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] satisfies readonly UserSkillLevel[]);

const userSkillSchema: z.ZodType<UserSkill> = z.object({
  name: z.string().trim().min(1).max(200),
  category: userSkillCategorySchema,
  level: userSkillLevelSchema,
  yearsOfExperience: z.number().min(0).max(60).optional(),
  isPrimary: z.boolean(),
});

const updateSkillsBodySchema = z.object({
  skills: z.array(userSkillSchema).max(100),
});

seekerProfileRouter.put(
  "/profile/skills",
  async (req: Request, res: Response) => {
    try {
      const { userId } = (req as AuthRequest).user ?? {};

      if (!userId) {
        return res.status(401).json({
          ok: false,
          error: {
            code: "UNAUTHORIZED",
            message: "User context missing",
          },
          meta: { requestId: res.getHeader("x-request-id") },
        });
      }

      const parsed = updateSkillsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_REQUEST",
            message: "Invalid skills payload",
            details: parsed.error.flatten(),
          },
          meta: { requestId: res.getHeader("x-request-id") },
        });
      }

      const payloadSkills = parsed.data.skills;

      const existing = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { profileData: true },
      });

      const currentProfile =
        (existing?.profileData as UserProfileData | null) ?? null;

      const nextProfile: UserProfileData = {
        skills: payloadSkills,
        targetRoles: currentProfile?.targetRoles ?? [],
        targetLocations: currentProfile?.targetLocations ?? [],
        targetSalaryMin: currentProfile?.targetSalaryMin,
        targetSalaryMax: currentProfile?.targetSalaryMax,
        experienceYears: currentProfile?.experienceYears ?? 0,
        currentTitle: currentProfile?.currentTitle,
      };

      await db
        .update(users)
        .set({ profileData: nextProfile })
        .where(eq(users.id, userId));

      return res.json({
        ok: true,
        data: { skills: nextProfile.skills },
        meta: { requestId: res.getHeader("x-request-id") },
      });
    } catch (error) {
      console.error("Update seeker profile skills error:", error);
      return res.status(500).json({
        ok: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Unknown error",
        },
        meta: { requestId: res.getHeader("x-request-id") },
      });
    }
  },
);

