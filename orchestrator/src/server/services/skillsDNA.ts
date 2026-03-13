/**
 * Skills DNA service: extract skills from CVs and compute gap analysis vs job market.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);
import { db } from "../db";
import {
  cvs,
  cvVersions,
  jobs,
  users,
  skillsProfile,
  skillsHistory,
  type ExtractedSkill,
  type SkillGapItem,
  type SkillsCategoryAverages,
  SKILL_CATEGORIES,
  SKILL_LEVELS,
} from "../db/schema";
import { eq, and, desc, gte } from "drizzle-orm";
import type { UserProfileData } from "../types/userProfile";
import { getSetting } from "../repositories/settings";
import { LlmService } from "./llm/service";
import type { JsonSchemaDefinition } from "./llm/types";

function resolveFilePath(filePath: string | null | undefined, fileUrl: string | null | undefined): string | null {
  if (filePath) return filePath;
  if (!fileUrl) return null;
  return path.join(process.cwd(), fileUrl.replace(/^\//, ""));
}

async function pdfFileToText(filePath: string): Promise<string> {
  try {
    const buf = await fs.readFile(filePath);
    // pdf-parse v1.1.1 bug: root index.js loads a test PDF at require-time.
    // Import the inner module directly, using createRequire for ESM compat.
    const pdfParse = _require("pdf-parse/lib/pdf-parse.js") as (
      dataBuffer: Buffer,
      options?: Record<string, unknown>,
    ) => Promise<{ text: string }>;
    const { text } = await pdfParse(buf);
    return text.slice(0, 14000).trim();
  } catch (err) {
    console.warn("[skillsDNA] PDF parse failed for", filePath, err);
    return "";
  }
}

const LEVEL_ORDER: Record<string, number> = {
  NOTIONS: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

function normalizeSkillName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function resumeDataToText(resumeData: unknown): string {
  if (resumeData == null) return "";
  const r = resumeData as Record<string, unknown>;
  const parts: string[] = [];

  const basics = r.basics as Record<string, unknown> | undefined;
  if (basics) {
    if (basics.name) parts.push(String(basics.name));
    if (basics.headline) parts.push(String(basics.headline));
    if (basics.summary) parts.push(String(basics.summary));
  }

  const sections = r.sections as Record<string, unknown> | undefined;
  if (sections && typeof sections === "object") {
    for (const key of Object.keys(sections)) {
      const section = sections[key] as Record<string, unknown> | undefined;
      if (!section) continue;
      if (section.content && typeof section.content === "string") {
        parts.push(section.content.replace(/<[^>]+>/g, " "));
      }
      if (Array.isArray(section.items)) {
        for (const item of section.items) {
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            if (obj.name) parts.push(String(obj.name));
            if (obj.summary) parts.push(String(obj.summary));
            if (obj.content) parts.push(String(obj.content).replace(/<[^>]+>/g, " "));
          }
        }
      }
    }
  }

  const text = parts.filter(Boolean).join("\n");
  return text.slice(0, 12000);
}

const EXTRACT_SKILLS_SCHEMA: JsonSchemaDefinition = {
  name: "extracted_skills",
  schema: {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            category: {
              type: "string",
              enum: [...SKILL_CATEGORIES],
            },
            level: {
              type: "string",
              enum: [...SKILL_LEVELS],
            },
            evidence: { type: "string" },
          },
          required: ["name", "category", "level", "evidence"],
        },
      },
    },
    required: ["skills"],
    additionalProperties: false,
  },
};

const EXTRACT_JOB_SKILLS_SCHEMA: JsonSchemaDefinition = {
  name: "job_skills",
  schema: {
    type: "object",
    properties: {
      skills: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["skills"],
    additionalProperties: false,
  },
};

const RECOMMEND_RESOURCE_SCHEMA: JsonSchemaDefinition = {
  name: "recommended_resource",
  schema: {
    type: "object",
    properties: {
      label: { type: "string" },
      url: { type: "string" },
      estimatedDuration: { type: "string" },
    },
    required: ["label"],
    additionalProperties: false,
  },
};

const AXES = ["DATA_ENGINEERING", "BI_ANALYTICS", "TECHNICAL", "CLOUD", "SOFT", "DOMAIN"] as const;

function computeCategoryAverages(skills: ExtractedSkill[]): SkillsCategoryAverages {
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const axis of AXES) { sum[axis] = 0; count[axis] = 0; }
  for (const s of skills) {
    const cat = AXES.includes(s.category as (typeof AXES)[number]) ? s.category : "DOMAIN";
    sum[cat] = (sum[cat] ?? 0) + (LEVEL_ORDER[s.level] ?? 1);
    count[cat] = (count[cat] ?? 0) + 1;
  }
  return Object.fromEntries(
    AXES.map((axis) => [axis, count[axis] ? Math.round((sum[axis] / count[axis]) * 100) / 100 : 0]),
  ) as unknown as SkillsCategoryAverages;
}

async function saveSkillsSnapshot(userId: string, skills: ExtractedSkill[]): Promise<void> {
  const categoryAverages = computeCategoryAverages(skills);
  await db.insert(skillsHistory).values({ userId, skills, categoryAverages, snapshotAt: new Date() });
}

export async function extractSkillsFromCVs(userId: string): Promise<ExtractedSkill[]> {
  const userCVs = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.userId, userId), eq(cvs.isDeleted, false)));

  const allExtracted: ExtractedSkill[] = [];

  const llm = new LlmService();
  const model =
    (await getSetting("model")) ||
    process.env.MODEL ||
    process.env.LLM_MODEL ||
    "google/gemini-2.5-flash";

  console.info(`[skillsDNA] Found ${userCVs.length} CV(s) for user ${userId}`);

  // ── CVs ──────────────────────────────────────────────────────────────
  for (const cv of userCVs) {
    console.info(`[skillsDNA] Processing CV "${cv.name}" id=${cv.id} filePath=${cv.filePath} fileUrl=${cv.fileUrl} hasResumeData=${Boolean(cv.resumeData)}`);

    let resumeData: unknown = cv.resumeData;
    let cvFilePath: string | null = resolveFilePath(cv.filePath, cv.fileUrl);

    if (!resumeData) {
      const [latestVersion] = await db
        .select()
        .from(cvVersions)
        .where(eq(cvVersions.cvId, cv.id))
        .orderBy(desc(cvVersions.version))
        .limit(1);
      resumeData = latestVersion?.resumeData ?? null;
      if (!cvFilePath) {
        cvFilePath = resolveFilePath(latestVersion?.filePath, latestVersion?.fileUrl);
      }
      console.info(`[skillsDNA]   version fallback: hasResumeData=${Boolean(resumeData)}, filePath=${cvFilePath}`);
    }

    let text = resumeDataToText(resumeData);
    if (!text.trim() && cvFilePath) {
      console.info(`[skillsDNA]   Attempting PDF extraction from: ${cvFilePath}`);
      text = await pdfFileToText(cvFilePath);
      console.info(`[skillsDNA]   PDF text extraction result: ${text.length} chars`);
    }
    if (!text.trim()) {
      console.warn(`[skillsDNA] No text found for CV ${cv.id} (name: ${cv.name})`);
      continue;
    }
    console.info(`[skillsDNA]   Text ready (${text.length} chars), calling LLM...`);

    const systemPrompt = `You extract professional skills from a CV/resume text.
For each skill return: name (normalized, e.g. "Power BI" not "powerbi"), category (one of: TECHNICAL, BI_ANALYTICS, DATA_ENGINEERING, CLOUD, SOFT, DOMAIN), level (NOTIONS, INTERMEDIATE, ADVANCED, EXPERT), and evidence (short snippet from the CV that justifies this level).
Return ONLY a JSON object with a "skills" array.`;

    const response = await llm.callJson<{ skills: ExtractedSkill[] }>({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract all professional skills from this CV:\n\n${text}` },
      ],
      jsonSchema: EXTRACT_SKILLS_SCHEMA,
      maxRetries: 1,
    });

    if (response.success && response.data?.skills?.length) {
      console.info(`[skillsDNA]   LLM extracted ${response.data.skills.length} skills from CV "${cv.name}"`);
      for (const s of response.data.skills) {
        if (SKILL_CATEGORIES.includes(s.category as (typeof SKILL_CATEGORIES)[number]) &&
            SKILL_LEVELS.includes(s.level as (typeof SKILL_LEVELS)[number])) {
          allExtracted.push(s as ExtractedSkill);
        }
      }
    } else {
      console.warn(`[skillsDNA]   LLM call failed or returned empty for CV "${cv.name}":`, response.success ? "empty skills" : (response as { error?: string }).error ?? "unknown error");
    }
  }

  // ── Job applications (tailored content enriches skill picture) ───────
  const appliedJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      tailoredSummary: jobs.tailoredSummary,
      tailoredSkills: jobs.tailoredSkills,
      tailoredHeadline: jobs.tailoredHeadline,
    })
    .from(jobs)
    .where(and(eq(jobs.userId, userId)))
    .orderBy(desc(jobs.createdAt))
    .limit(30);

  for (const job of appliedJobs) {
    const text = [job.tailoredHeadline, job.tailoredSummary, job.tailoredSkills]
      .filter(Boolean)
      .join("\n");
    if (!text.trim()) continue;

    const response = await llm.callJson<{ skills: ExtractedSkill[] }>({
      model,
      messages: [
        {
          role: "system",
          content: `You extract professional skills demonstrated in tailored job application content.
For each skill return: name, category (TECHNICAL|BI_ANALYTICS|DATA_ENGINEERING|CLOUD|SOFT|DOMAIN), level (NOTIONS|INTERMEDIATE|ADVANCED|EXPERT), evidence (short snippet).
Return ONLY a JSON object with a "skills" array.`,
        },
        {
          role: "user",
          content: `Extract skills from this tailored job application (job: ${job.title}):\n\n${text}`,
        },
      ],
      jsonSchema: EXTRACT_SKILLS_SCHEMA,
      maxRetries: 1,
    });

    if (response.success && response.data?.skills?.length) {
      for (const s of response.data.skills) {
        if (
          SKILL_CATEGORIES.includes(s.category as (typeof SKILL_CATEGORIES)[number]) &&
          SKILL_LEVELS.includes(s.level as (typeof SKILL_LEVELS)[number])
        ) {
          allExtracted.push(s as ExtractedSkill);
        }
      }
    }
  }

  if (allExtracted.length === 0) {
    const [userRow] = await db
      .select({ profileData: users.profileData })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const fromProfile = profileSkillsToExtracted(userRow?.profileData as UserProfileData | null);
    allExtracted.push(...fromProfile);
  }

  const byKey = new Map<string, ExtractedSkill>();
  for (const skill of allExtracted) {
    const key = normalizeSkillName(skill.name);
    const existing = byKey.get(key);
    const levelScore = LEVEL_ORDER[skill.level] ?? 0;
    const existingScore = existing ? LEVEL_ORDER[existing.level] ?? 0 : 0;
    if (!existing || levelScore > existingScore) {
      byKey.set(key, skill);
    }
  }

  const merged = Array.from(byKey.values());

  await db
    .insert(skillsProfile)
    .values({
      userId,
      skills: merged,
      lastUpdated: new Date(),
    })
    .onConflictDoUpdate({
      target: [skillsProfile.userId],
      set: {
        skills: merged,
        lastUpdated: new Date(),
      },
    });

  await saveSkillsSnapshot(userId, merged);

  return merged;
}

export async function computeGapAnalysis(userId: string): Promise<SkillGapItem[]> {
  const [profile] = await db
    .select()
    .from(skillsProfile)
    .where(eq(skillsProfile.userId, userId))
    .limit(1);

  const userSkillNames = new Set(
    (profile?.skills ?? []).map((s) => normalizeSkillName(s.name))
  );

  const recentJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      jobDescription: jobs.jobDescription,
      skills: jobs.skills,
    })
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt))
    .limit(50);

  const llm = new LlmService();
  const model =
    (await getSetting("model")) ||
    process.env.MODEL ||
    process.env.LLM_MODEL ||
    "google/gemini-2.5-flash";

  const skillCounts = new Map<string, number>();

  for (const job of recentJobs) {
    const text = [job.title, job.jobDescription, job.skills].filter(Boolean).join("\n");
    if (!text.trim()) continue;

    const response = await llm.callJson<{ skills: string[] }>({
      model,
      messages: [
        {
          role: "system",
          content:
            'Extract the list of professional skills requested in this job description. Return only a JSON object with a "skills" array of skill names (normalized, e.g. "Power BI").',
        },
        { role: "user", content: text.slice(0, 6000) },
      ],
      jsonSchema: EXTRACT_JOB_SKILLS_SCHEMA,
      maxRetries: 1,
    });

    if (response.success && response.data?.skills?.length) {
      const seenInJob = new Set<string>();
      for (const name of response.data.skills) {
        const key = normalizeSkillName(name);
        if (!userSkillNames.has(key) && !seenInJob.has(key)) {
          seenInJob.add(key);
          skillCounts.set(key, (skillCounts.get(key) ?? 0) + 1);
        }
      }
    }
  }

  const totalJobs = recentJobs.length;
  const sorted = Array.from(skillCounts.entries())
    .map(([skillName, count]) => ({
      skillName,
      frequency: count,
      frequencyPercent: totalJobs > 0 ? Math.round((count / totalJobs) * 100) : 0,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5);

  const gapItems: SkillGapItem[] = [];

  for (const item of sorted) {
    const resResponse = await llm.callJson<{
      label: string;
      url?: string;
      estimatedDuration?: string;
    }>({
      model,
      messages: [
        {
          role: "system",
          content:
            'Suggest one learning resource (course, certification, or project) for someone who wants to learn this skill. Return JSON with "label", optional "url", optional "estimatedDuration" (e.g. "2-4 weeks").',
        },
        { role: "user", content: `Skill: ${item.skillName}` },
      ],
      jsonSchema: RECOMMEND_RESOURCE_SCHEMA,
      maxRetries: 1,
    });

    gapItems.push({
      skillName: item.skillName,
      frequency: item.frequency,
      frequencyPercent: item.frequencyPercent,
      recommendedResource: resResponse.success && resResponse.data
        ? {
            label: resResponse.data.label,
            url: resResponse.data.url,
            estimatedDuration: resResponse.data.estimatedDuration,
          }
        : { label: "Ressource à identifier" },
    });
  }

  await db
    .update(skillsProfile)
    .set({
      gapAnalysis: gapItems,
      gapAnalysisAt: new Date(),
    })
    .where(eq(skillsProfile.userId, userId));

  return gapItems;
}

/** Map profileData.skills (UserSkill) to ExtractedSkill; ML_AI → TECHNICAL for radar. */
function profileSkillsToExtracted(profileData: UserProfileData | null | undefined): ExtractedSkill[] {
  if (!profileData?.skills?.length) return [];
  const mapCat = (c: string) => (c === "ML_AI" ? "TECHNICAL" : c);
  return profileData.skills
    .filter(
      (s) =>
        SKILL_CATEGORIES.includes(mapCat(s.category) as (typeof SKILL_CATEGORIES)[number]) &&
        SKILL_LEVELS.includes(s.level as (typeof SKILL_LEVELS)[number]),
    )
    .map((s) => ({
      name: s.name,
      category: mapCat(s.category) as ExtractedSkill["category"],
      level: s.level as ExtractedSkill["level"],
      evidence: s.yearsOfExperience != null ? `${s.yearsOfExperience} an(s)` : "Profil utilisateur",
    }));
}

export async function getSkillsProfile(userId: string): Promise<{
  skills: ExtractedSkill[];
  gapAnalysis: SkillGapItem[];
  lastUpdated: Date | null;
}> {
  const [row] = await db
    .select()
    .from(skillsProfile)
    .where(eq(skillsProfile.userId, userId))
    .limit(1);

  const fromTable = row?.skills ?? [];
  const gapAnalysis = row?.gapAnalysis ?? [];
  const lastUpdated = row?.lastUpdated ?? null;

  if (fromTable.length > 0) {
    return { skills: fromTable, gapAnalysis, lastUpdated };
  }

  const [userRow] = await db
    .select({ profileData: users.profileData })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const fallbackSkills = profileSkillsToExtracted(userRow?.profileData as UserProfileData | null);
  return {
    skills: fallbackSkills,
    gapAnalysis,
    lastUpdated,
  };
}

export interface SkillsHistoryPoint {
  snapshotAt: string;
  categoryAverages: SkillsCategoryAverages;
}

export async function getSkillsHistory(userId: string): Promise<SkillsHistoryPoint[]> {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const rows = await db
    .select({
      snapshotAt: skillsHistory.snapshotAt,
      categoryAverages: skillsHistory.categoryAverages,
    })
    .from(skillsHistory)
    .where(and(eq(skillsHistory.userId, userId), gte(skillsHistory.snapshotAt, sixMonthsAgo)))
    .orderBy(skillsHistory.snapshotAt);

  return rows
    .filter((r) => r.categoryAverages != null)
    .map((r) => ({
      snapshotAt: r.snapshotAt.toISOString(),
      categoryAverages: r.categoryAverages as SkillsCategoryAverages,
    }));
}
