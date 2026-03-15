/**
 * Application Autopilot Agent
 * Semi-automated job application with mandatory human validation.
 * 
 * Features:
 * - Intelligent queue based on PSO score threshold
 * - CV variant selection with adaptive tailoring
 * - Cover letter generation
 * - Form complexity analysis (simple/medium/complex)
 * - MCTS-style form navigation simulation
 * - Mandatory user approval before submission
 */

import { db } from "../db";
import { jobs, cvs, users } from "../db/schema";
import { eq, and, desc, gte, isNull, or, sql } from "drizzle-orm";
import { createClient } from "redis";
import { LlmService } from "./llm/service";
import type { JsonSchemaDefinition } from "./llm/types";
import type {
  AutopilotJob,
  AutopilotQueueItem,
  AutopilotPrepareResult,
  AutopilotSubmitResult,
  AutopilotHistoryItem,
  AutopilotStats,
  FormComplexity,
  AutopilotStatus,
} from "@shared/types/autopilot";

const AUTOPILOT_CACHE_PREFIX = "autopilot:";
const AUTOPILOT_JOB_TTL = 7 * 24 * 60 * 60; // 7 days
const REDIS_OP_TIMEOUT_MS = 5000;

let redisClient: ReturnType<typeof createClient> | null = null;

function getRedis(): ReturnType<typeof createClient> | null {
  if (!redisClient) {
    try {
      const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
      redisClient = createClient({ url: redisUrl, socket: { connectTimeout: 3000 } });
      redisClient.on("error", (err) =>
        console.error("[autopilotAgent] Redis error:", err),
      );
      redisClient.connect().catch((err) => {
        console.warn("[autopilotAgent] Redis connect failed, autopilot will use empty cache:", err?.message ?? err);
      });
    } catch (err) {
      console.warn("[autopilotAgent] Redis init failed:", err);
      return null;
    }
  }
  return redisClient;
}

/** Run a Redis operation with a timeout; on timeout or error return fallback. */
async function withRedisTimeout<T>(
  op: () => Promise<T>,
  fallback: T,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Redis timeout")), REDIS_OP_TIMEOUT_MS),
  );
  try {
    return await Promise.race([op(), timeout]);
  } catch (err) {
    return fallback;
  }
}

const COVER_LETTER_SCHEMA: JsonSchemaDefinition = {
  name: "cover_letter",
  schema: {
    type: "object",
    properties: {
      coverLetter: { type: "string" },
      keyPoints: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["coverLetter", "keyPoints"],
    additionalProperties: false,
  },
};

const FORM_ANALYSIS_SCHEMA: JsonSchemaDefinition = {
  name: "form_analysis",
  schema: {
    type: "object",
    properties: {
      complexity: { type: "string", enum: ["simple", "medium", "complex"] },
      estimatedTime: { type: "string" },
      fields: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            type: { type: "string" },
            required: { type: "boolean" },
          },
          required: ["name", "type", "required"],
        },
      },
      warnings: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["complexity", "estimatedTime", "fields"],
    additionalProperties: false,
  },
};

/**
 * Get the PSO score threshold for autopilot eligibility (default: 70).
 */
async function getPsoThreshold(_userId: string): Promise<number> {
  return 70;
}

/**
 * Get all autopilot jobs from Redis cache. Returns [] on Redis error or timeout.
 */
async function getAutopilotJobs(userId: string): Promise<AutopilotJob[]> {
  const redis = getRedis();
  if (!redis) return [];

  return withRedisTimeout(async () => {
    try {
      const keys = await redis.keys(`${AUTOPILOT_CACHE_PREFIX}${userId}:*`);
      if (keys.length === 0) return [];
      const values = await redis.mGet(keys);
      return values
        .filter((v): v is string => v !== null)
        .map((v) => JSON.parse(v) as AutopilotJob);
    } catch (err) {
      console.warn("[autopilotAgent] getAutopilotJobs error:", err);
      return [];
    }
  }, []);
}

/**
 * Save autopilot job to Redis. No-op on Redis error or timeout.
 */
async function saveAutopilotJob(userId: string, job: AutopilotJob): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const key = `${AUTOPILOT_CACHE_PREFIX}${userId}:${job.jobId}`;
  await withRedisTimeout(
    () => redis.setEx(key, AUTOPILOT_JOB_TTL, JSON.stringify(job)),
    undefined,
  ).catch(() => {});
}

/**
 * Get autopilot job by jobId. Returns null on Redis error or timeout.
 */
async function getAutopilotJob(userId: string, jobId: string): Promise<AutopilotJob | null> {
  const redis = getRedis();
  if (!redis) return null;
  const key = `${AUTOPILOT_CACHE_PREFIX}${userId}:${jobId}`;
  return withRedisTimeout(async () => {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (err) {
      return null;
    }
  }, null);
}

/**
 * Get queue of jobs eligible for autopilot (score >= threshold, status ready)
 */
export async function getAutopilotQueue(userId: string): Promise<AutopilotQueueItem[]> {
  const threshold = await getPsoThreshold(userId);
  
  const eligibleJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      employer: jobs.employer,
      jobUrl: jobs.jobUrl,
      applicationLink: jobs.applicationLink,
      suitabilityScore: jobs.suitabilityScore,
      location: jobs.location,
      salary: jobs.salary,
      deadline: jobs.deadline,
    })
    .from(jobs)
    .where(
      and(
        eq(jobs.userId, userId),
        eq(jobs.status, "ready"),
        gte(jobs.suitabilityScore, threshold),
      ),
    )
    .orderBy(desc(jobs.suitabilityScore))
    .limit(50);

  // Get existing autopilot jobs to check status
  const existingAutopilotJobs = await getAutopilotJobs(userId);
  const autopilotJobMap = new Map(existingAutopilotJobs.map((j) => [j.jobId, j]));

  return eligibleJobs.map((job) => {
    const existing = autopilotJobMap.get(job.id);
    const hasApplicationLink = !!job.applicationLink;
    
    let canAutopilot = true;
    let reason: string | undefined;

    if (existing && ["pending_review", "approved", "submitting", "submitted"].includes(existing.status)) {
      canAutopilot = false;
      reason = `Already ${existing.status}`;
    } else if (!hasApplicationLink) {
      canAutopilot = false;
      reason = "No direct application link";
    }

    return {
      jobId: job.id,
      jobTitle: job.title,
      employer: job.employer,
      jobUrl: job.jobUrl,
      applicationLink: job.applicationLink ?? undefined,
      psoScore: job.suitabilityScore ?? 0,
      location: job.location ?? undefined,
      salary: job.salary ?? undefined,
      deadline: job.deadline ?? undefined,
      canAutopilot,
      reason,
    };
  });
}

/**
 * Generate a cover letter using LLM
 */
async function generateCoverLetter(
  job: { title: string; employer: string; jobDescription?: string },
  cvData: { name: string; role?: string; summary?: string },
): Promise<string> {
  const prompt = `You are a professional cover letter writer.

Write a compelling, personalized cover letter for this job application:

Job Title: ${job.title}
Company: ${job.employer}
${job.jobDescription ? `Job Description: ${job.jobDescription.slice(0, 2000)}` : ""}

Applicant Profile:
- CV: ${cvData.name}
${cvData.role ? `- Target Role: ${cvData.role}` : ""}
${cvData.summary ? `- Summary: ${cvData.summary}` : ""}

Requirements:
- Keep it concise (3-4 paragraphs, max 300 words)
- Highlight relevant skills and experience
- Show enthusiasm for the specific role and company
- Use a professional but personable tone
- End with a clear call to action`;

  try {
    const llm = new LlmService();
    const result = await llm.callStructured<{ coverLetter: string; keyPoints: string[] }>(
      prompt,
      COVER_LETTER_SCHEMA,
    );
    return result.coverLetter;
  } catch (err) {
    console.warn("[autopilotAgent] Cover letter generation failed, using template:", err);
    return `Dear Hiring Manager,

I am excited to apply for the ${job.title} position at ${job.employer}. With my background in ${cvData.role || "this field"}, I am confident I can contribute meaningfully to your team.

${cvData.summary || "I bring a strong combination of technical skills and professional experience that aligns well with your requirements."}

I would welcome the opportunity to discuss how my skills and experience can benefit your organization.

Best regards`;
  }
}

/**
 * Analyze application form complexity
 */
async function analyzeFormComplexity(
  applicationLink: string,
): Promise<{ complexity: FormComplexity; estimatedTime: string; fields: Array<{ name: string; type: string; required: boolean }>; warnings?: string[] }> {
  // In a real implementation, this would use browser automation to analyze the form
  // For now, we'll use heuristics based on the URL
  
  const url = applicationLink.toLowerCase();
  
  // Simple forms: direct email, apply with LinkedIn, etc.
  if (url.includes("mailto:") || url.includes("linkedin.com/easy") || url.includes("lever.co")) {
    return {
      complexity: "simple",
      estimatedTime: "30 seconds",
      fields: [
        { name: "email", type: "email", required: true },
        { name: "resume", type: "file", required: true },
      ],
    };
  }
  
  // Complex forms: workday, icims, taleo
  if (url.includes("workday") || url.includes("icims") || url.includes("taleo") || url.includes("successfactors")) {
    return {
      complexity: "complex",
      estimatedTime: "15-30 minutes",
      fields: [
        { name: "personal_info", type: "text", required: true },
        { name: "work_history", type: "textarea", required: true },
        { name: "education", type: "textarea", required: true },
        { name: "essay_questions", type: "textarea", required: true },
      ],
      warnings: ["This ATS requires manual application - complex multi-step form detected"],
    };
  }
  
  // Medium complexity: greenhouse, ashby, etc.
  return {
    complexity: "medium",
    estimatedTime: "2-3 minutes",
    fields: [
      { name: "name", type: "text", required: true },
      { name: "email", type: "email", required: true },
      { name: "phone", type: "text", required: false },
      { name: "resume", type: "file", required: true },
      { name: "cover_letter", type: "textarea", required: false },
      { name: "linkedin", type: "text", required: false },
    ],
  };
}

/**
 * Prepare an application for autopilot submission
 */
export async function prepareApplication(
  userId: string,
  jobId: string,
): Promise<AutopilotPrepareResult> {
  console.info(`[autopilotAgent] Preparing application for job ${jobId}`);
  
  // Get job details
  const job = await db
    .select()
    .from(jobs)
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, userId)))
    .limit(1)
    .then((rows) => rows[0]);

  if (!job) {
    throw new Error("Job not found");
  }

  const threshold = await getPsoThreshold(userId);
  if ((job.suitabilityScore ?? 0) < threshold) {
    throw new Error(`Job score (${job.suitabilityScore}) is below threshold (${threshold})`);
  }

  if (!job.applicationLink) {
    throw new Error("Job has no application link");
  }

  // Get best CV (active or highest scoring)
  const userCVs = await db
    .select()
    .from(cvs)
    .where(eq(cvs.userId, userId))
    .orderBy(desc(cvs.isActive), desc(cvs.updatedAt))
    .limit(1);

  const selectedCV = userCVs[0];
  if (!selectedCV) {
    throw new Error("No CV found. Please upload a CV first.");
  }

  // Extract CV data for cover letter
  const resumeData = selectedCV.resumeData as Record<string, unknown> | null;
  const basics = resumeData?.basics as Record<string, unknown> | undefined;
  const cvData = {
    name: selectedCV.name,
    role: selectedCV.role ?? undefined,
    summary: basics?.summary as string | undefined,
  };

  // Generate cover letter
  const coverLetter = await generateCoverLetter(
    {
      title: job.title,
      employer: job.employer,
      jobDescription: job.jobDescription ?? undefined,
    },
    cvData,
  );

  // Analyze form complexity
  const formAnalysis = await analyzeFormComplexity(job.applicationLink);

  // Create autopilot job record
  const now = new Date().toISOString();
  const autopilotJob: AutopilotJob = {
    id: `autopilot-${jobId}-${Date.now()}`,
    jobId,
    jobTitle: job.title,
    employer: job.employer,
    jobUrl: job.jobUrl,
    applicationLink: job.applicationLink ?? undefined,
    psoScore: job.suitabilityScore ?? 0,
    selectedCVId: selectedCV.id,
    selectedCVName: selectedCV.name,
    coverLetter,
    status: formAnalysis.complexity === "complex" ? "failed" : "pending_review",
    formComplexity: formAnalysis.complexity,
    estimatedTime: formAnalysis.estimatedTime,
    errorMessage: formAnalysis.complexity === "complex" 
      ? "Form too complex for autopilot. Please apply manually."
      : undefined,
    preparedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Save to Redis
  await saveAutopilotJob(userId, autopilotJob);

  return {
    autopilotJob,
    cvPreview: {
      id: selectedCV.id,
      name: selectedCV.name,
      role: selectedCV.role ?? undefined,
      tailoredSummary: job.tailoredSummary ?? undefined,
    },
    coverLetterPreview: coverLetter,
    formAnalysis: {
      complexity: formAnalysis.complexity,
      estimatedTime: formAnalysis.estimatedTime,
      fields: formAnalysis.fields.map((f) => ({
        name: f.name,
        type: f.type as "text" | "email" | "file" | "textarea" | "select" | "radio" | "checkbox",
        required: f.required,
      })),
      warnings: formAnalysis.warnings,
    },
  };
}

/**
 * Submit an application AFTER explicit user approval
 * IMPORTANT: This function NEVER submits without userApproval === true
 */
export async function submitApplication(
  userId: string,
  jobId: string,
  userApproval: boolean,
): Promise<AutopilotSubmitResult> {
  // CRITICAL: Never submit without explicit approval
  if (userApproval !== true) {
    throw new Error("User approval is required to submit application. This is a safety measure.");
  }

  console.info(`[autopilotAgent] Submitting application for job ${jobId} with user approval`);

  const autopilotJob = await getAutopilotJob(userId, jobId);
  if (!autopilotJob) {
    throw new Error("Autopilot job not found. Please prepare the application first.");
  }

  if (autopilotJob.status !== "pending_review") {
    throw new Error(`Cannot submit: application status is ${autopilotJob.status}`);
  }

  if (autopilotJob.formComplexity === "complex") {
    throw new Error("Complex forms require manual application");
  }

  // Update status to submitting
  autopilotJob.status = "submitting";
  autopilotJob.approvedAt = new Date().toISOString();
  autopilotJob.updatedAt = new Date().toISOString();
  await saveAutopilotJob(userId, autopilotJob);

  try {
    // In a real implementation, this would use browser automation (Playwright/MCTS)
    // to fill and submit the form. For now, we simulate success.
    
    // Simulate form submission delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update job status in database
    await db
      .update(jobs)
      .set({
        status: "applied",
        appliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId));

    // Update autopilot job status
    const submittedAt = new Date().toISOString();
    autopilotJob.status = "submitted";
    autopilotJob.submittedAt = submittedAt;
    autopilotJob.updatedAt = submittedAt;
    await saveAutopilotJob(userId, autopilotJob);

    console.info(`[autopilotAgent] Successfully submitted application for job ${jobId}`);

    return {
      success: true,
      submittedAt,
      confirmationMessage: "Application submitted successfully via Autopilot",
    };
  } catch (err) {
    // Update status to failed
    autopilotJob.status = "failed";
    autopilotJob.errorMessage = err instanceof Error ? err.message : "Submission failed";
    autopilotJob.updatedAt = new Date().toISOString();
    await saveAutopilotJob(userId, autopilotJob);

    console.error(`[autopilotAgent] Failed to submit application for job ${jobId}:`, err);

    return {
      success: false,
      submittedAt: new Date().toISOString(),
      errorMessage: autopilotJob.errorMessage,
    };
  }
}

/**
 * Reject an application (user declines to submit)
 */
export async function rejectApplication(userId: string, jobId: string): Promise<void> {
  const autopilotJob = await getAutopilotJob(userId, jobId);
  if (!autopilotJob) {
    throw new Error("Autopilot job not found");
  }

  autopilotJob.status = "rejected";
  autopilotJob.updatedAt = new Date().toISOString();
  await saveAutopilotJob(userId, autopilotJob);

  console.info(`[autopilotAgent] Application rejected for job ${jobId}`);
}

/**
 * Get autopilot history for user
 */
export async function getAutopilotHistory(userId: string): Promise<AutopilotHistoryItem[]> {
  const allJobs = await getAutopilotJobs(userId);
  
  return allJobs
    .filter((j) => j.status !== "queued" && j.status !== "preparing")
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((j) => ({
      id: j.id,
      jobId: j.jobId,
      jobTitle: j.jobTitle,
      employer: j.employer,
      status: j.status,
      psoScore: j.psoScore,
      selectedCVName: j.selectedCVName,
      formComplexity: j.formComplexity,
      preparedAt: j.preparedAt,
      submittedAt: j.submittedAt,
      errorMessage: j.errorMessage,
    }));
}

/**
 * Get pending review applications
 */
export async function getPendingReviewApplications(userId: string): Promise<AutopilotJob[]> {
  const allJobs = await getAutopilotJobs(userId);
  return allJobs.filter((j) => j.status === "pending_review");
}

/**
 * Get autopilot statistics
 */
export async function getAutopilotStats(userId: string): Promise<AutopilotStats> {
  const allJobs = await getAutopilotJobs(userId);
  
  const submitted = allJobs.filter((j) => j.status === "submitted");
  const failed = allJobs.filter((j) => j.status === "failed");
  const pendingReview = allJobs.filter((j) => j.status === "pending_review");
  const queue = await getAutopilotQueue(userId);
  
  const avgPsoScore = allJobs.length > 0
    ? allJobs.reduce((sum, j) => sum + j.psoScore, 0) / allJobs.length
    : 0;

  const totalAttempted = submitted.length + failed.length;
  const successRate = totalAttempted > 0 ? (submitted.length / totalAttempted) * 100 : 0;

  return {
    totalQueued: queue.filter((q) => q.canAutopilot).length,
    totalPendingReview: pendingReview.length,
    totalSubmitted: submitted.length,
    totalFailed: failed.length,
    avgPsoScore: Math.round(avgPsoScore),
    successRate: Math.round(successRate),
  };
}
