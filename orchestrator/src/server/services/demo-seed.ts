import {
  DEMO_DEFAULT_JOBS,
  DEMO_DEFAULT_PIPELINE_RUNS,
  DEMO_DEFAULT_SETTINGS,
  DEMO_DEFAULT_STAGE_EVENTS,
  type DemoDefaultSettings,
} from "@server/config/demo-defaults";
import { db, schema } from "@server/db/index";
import { eq } from "drizzle-orm";

if (process.env.NODE_ENV === "production") {
  throw new Error("demo-seed interdit en production");
}

type BuiltDemoBaseline = {
  resetAt: Date;
  settings: DemoDefaultSettings;
  pipelineRuns: Array<typeof schema.pipelineRuns.$inferInsert>;
  jobs: Array<Omit<typeof schema.jobs.$inferInsert, "userId">>;
  stageEvents: Array<typeof schema.stageEvents.$inferInsert>;
};

const { interviews, jobs, pipelineRuns, settings, stageEvents, tasks, users } =
  schema;

function toDateFromOffset(now: Date, offsetMinutes: number): Date {
  return new Date(now.getTime() - offsetMinutes * 60 * 1000);
}

function makeDemoLink(
  baseUrl: string,
  jobId: string,
  kind: "job" | "apply",
): string {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return `${trimmed}/${kind}/${jobId}`;
}

export function buildDemoBaseline(now: Date): BuiltDemoBaseline {
  const resetAt = now;

  return {
    resetAt,
    settings: DEMO_DEFAULT_SETTINGS,
    pipelineRuns: DEMO_DEFAULT_PIPELINE_RUNS.map((run) => ({
      id: run.id,
      status: run.status,
      startedAt: toDateFromOffset(now, run.startedOffsetMinutes),
      completedAt: toDateFromOffset(now, run.completedOffsetMinutes),
      jobsDiscovered: run.jobsDiscovered,
      jobsProcessed: run.jobsProcessed,
      errorMessage: run.errorMessage ?? null,
    })),
    jobs: DEMO_DEFAULT_JOBS.map((job) => ({
      id: job.id,
      source: job.source,
      title: job.title,
      employer: job.employer,
      jobUrl: makeDemoLink(job.jobUrl, job.id, "job"),
      applicationLink: makeDemoLink(job.applicationLink, job.id, "apply"),
      location: job.location,
      salary: job.salary,
      deadline: job.deadline,
      jobDescription: job.jobDescription,
      status: job.status,
      suitabilityScore: job.suitabilityScore,
      suitabilityReason: job.suitabilityReason,
      tailoredSummary: job.tailoredSummary ?? null,
      tailoredHeadline: job.tailoredHeadline ?? null,
      tailoredSkills: job.tailoredSkills
        ? JSON.stringify(job.tailoredSkills)
        : null,
      selectedProjectIds: job.selectedProjectIds ?? null,
      pdfPath: job.pdfPath ?? null,
      discoveredAt: toDateFromOffset(now, job.discoveredOffsetMinutes),
      appliedAt:
        job.status === "applied" && typeof job.appliedOffsetMinutes === "number"
          ? toDateFromOffset(now, job.appliedOffsetMinutes)
          : null,
      createdAt: toDateFromOffset(now, job.discoveredOffsetMinutes),
      updatedAt: resetAt,
    })),
    stageEvents: DEMO_DEFAULT_STAGE_EVENTS.map((event) => ({
      id: event.id,
      applicationId: event.applicationId,
      title: event.title,
      fromStage: event.fromStage,
      toStage: event.toStage,
      occurredAt: Math.floor(
        (now.getTime() - event.occurredOffsetMinutes * 60 * 1000) / 1000,
      ),
      metadata: event.metadata,
      outcome: null,
      groupId: null,
    })),
  };
}

export async function applyDemoBaseline(
  baseline: BuiltDemoBaseline,
): Promise<void> {
  const adminUser = await db.query.users.findFirst({
    columns: { id: true },
  });
  if (!adminUser) {
    throw new Error("Seed: aucun user admin trouvé.");
  }
  const seedUserId = adminUser.id;

  const jobsWithUserId = baseline.jobs.map((job) => ({
    ...job,
    userId: seedUserId,
  }));

  await db.transaction(async (tx) => {
    await tx.delete(stageEvents);
    await tx.delete(tasks);
    await tx.delete(interviews);
    await tx.delete(jobs);
    await tx.delete(pipelineRuns);
    await tx.delete(settings);

    const settingRows = Object.entries(baseline.settings).map(
      ([key, value]) => ({
        key,
        value,
        createdAt: baseline.resetAt,
        updatedAt: baseline.resetAt,
      }),
    );
    if (settingRows.length > 0) {
      await tx.insert(settings).values(settingRows);
    }

    if (baseline.pipelineRuns.length > 0) {
      await tx.insert(pipelineRuns).values(baseline.pipelineRuns);
    }
    if (jobsWithUserId.length > 0) {
      await tx.insert(jobs).values(jobsWithUserId);
    }
    if (baseline.stageEvents.length > 0) {
      await tx.insert(stageEvents).values(baseline.stageEvents);
    }
  });
}
