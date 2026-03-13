import { Router, type Request, type Response } from "express";
import { and, count, eq, gte, like, lt, inArray, sql } from "drizzle-orm";
import { endOfWeek, startOfWeek, subWeeks } from "date-fns";

import { db, schema } from "../../db";
import type { AuthRequest } from "../../middleware/authenticateJWT";

const { jobs, interviews, postApplicationIntegrations, users, sseCheckpoints } = schema;

export const seekerDashboardRouter = Router();

type KpiTrend = "up" | "down" | "stable";

interface KpiResult {
  value: number;
  previousValue: number;
  delta: number;
  deltaLabel: string;
  trend: KpiTrend;
}

interface SeekerDashboardKpis {
  activeApplications: KpiResult;
  avgPSOScore: KpiResult;
  responseRate: KpiResult;
  scheduledInterviews: KpiResult;
  computedAt: string;
}

interface MarketPulseSkill {
  name: string;
  tensionScore: number;
  trendDelta: number;
  salaryP50: number;
}

interface MarketPulse {
  skills: MarketPulseSkill[];
}

interface SeekerActivityItem {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface SeekerDashboardPayload {
  kpis: SeekerDashboardKpis;
  marketPulse: MarketPulse;
  momentumScore: number;
  recentActivity: SeekerActivityItem[];
  insightOfDay: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function computeDelta(current: number, previous: number): {
  delta: number;
  trend: KpiTrend;
  deltaLabel: string;
} {
  const raw =
    previous === 0 ? (current > 0 ? 100 : 0) : Math.round(((current - previous) / previous) * 100);

  let trend: KpiTrend = "stable";
  if (raw > 2) trend = "up";
  else if (raw < -2) trend = "down";

  const sign = raw > 0 ? "+" : "";
  const deltaLabel =
    raw === 0 ? "0% vs semaine dernière" : `${sign}${raw}% vs semaine dernière`;

  return { delta: raw, trend, deltaLabel };
}

async function computeSeekerKpis(userId: string): Promise<SeekerDashboardKpis> {
  const now = new Date();
  const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 });
  const startOfLastWeek = subWeeks(startOfThisWeek, 1);
  const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 });
  const endOfLastWeek = subWeeks(endOfThisWeek, 1);

  // Active applications (this week vs last week)
  const [activeThisWeek, activeLastWeek] = await Promise.all([
    db
      .select({ count: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          // exclude skipped/expired
          inArray(jobs.status, [
            "discovered",
            "processing",
            "ready",
            "applied",
            "in_progress",
          ]),
          gte(jobs.createdAt, startOfThisWeek),
          lt(jobs.createdAt, endOfThisWeek),
        ),
      ),
    db
      .select({ count: count() })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          inArray(jobs.status, [
            "discovered",
            "processing",
            "ready",
            "applied",
            "in_progress",
          ]),
          gte(jobs.createdAt, startOfLastWeek),
          lt(jobs.createdAt, endOfLastWeek),
        ),
      ),
  ]);

  const activeCurrent = Number(activeThisWeek[0]?.count) || 0;
  const activePrev = Number(activeLastWeek[0]?.count) || 0;
  const activeDelta = computeDelta(activeCurrent, activePrev);

  const activeApplications: KpiResult = {
    value: activeCurrent,
    previousValue: activePrev,
    delta: activeDelta.delta,
    deltaLabel: activeDelta.deltaLabel,
    trend: activeDelta.trend,
  };

  // Avg PSO (this week vs last week)
  const [avgThisWeek, avgLastWeek] = await Promise.all([
    db
      .select({
        avg: sql<number>`avg(${jobs.suitabilityScore})`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          sql`${jobs.suitabilityScore} IS NOT NULL`,
          gte(jobs.createdAt, startOfThisWeek),
        ),
      ),
    db
      .select({
        avg: sql<number>`avg(${jobs.suitabilityScore})`,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          sql`${jobs.suitabilityScore} IS NOT NULL`,
          gte(jobs.createdAt, startOfLastWeek),
          sql`${jobs.createdAt} < ${startOfThisWeek}`,
        ),
      ),
  ]);

  const avgCurrent = Math.round(Number(avgThisWeek[0]?.avg) || 0);
  const avgPrev = Math.round(Number(avgLastWeek[0]?.avg) || 0);
  const avgDelta = computeDelta(avgCurrent, avgPrev);

  const avgPSOScore: KpiResult = {
    value: avgCurrent,
    previousValue: avgPrev,
    delta: avgDelta.delta,
    deltaLabel: avgDelta.deltaLabel,
    trend: avgDelta.trend,
  };

  // Response rate (this week vs last week)
  const [respThisWeek, respLastWeek] = await Promise.all([
    Promise.all([
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            inArray(jobs.outcome, [
              "interview",
              "offer",
              "offer_accepted",
              "offer_declined",
            ]),
            gte(jobs.createdAt, startOfThisWeek),
            lt(jobs.createdAt, endOfThisWeek),
          ),
        ),
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            gte(jobs.createdAt, startOfThisWeek),
            lt(jobs.createdAt, endOfThisWeek),
          ),
        ),
    ]),
    Promise.all([
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            inArray(jobs.outcome, [
              "interview",
              "offer",
              "offer_accepted",
              "offer_declined",
            ]),
            gte(jobs.createdAt, startOfLastWeek),
            lt(jobs.createdAt, endOfLastWeek),
          ),
        ),
      db
        .select({ count: count() })
        .from(jobs)
        .where(
          and(
            eq(jobs.userId, userId),
            gte(jobs.createdAt, startOfLastWeek),
            lt(jobs.createdAt, endOfLastWeek),
          ),
        ),
    ]),
  ]);

  const [respNumThis, respDenThis] = respThisWeek;
  const [respNumLast, respDenLast] = respLastWeek;

  const numThis = Number(respNumThis[0]?.count) || 0;
  const denThis = Number(respDenThis[0]?.count) || 0;
  const numLast = Number(respNumLast[0]?.count) || 0;
  const denLast = Number(respDenLast[0]?.count) || 0;

  const respCurrent =
    denThis > 0 ? Math.round(((numThis / denThis) * 100) * 10) / 10 : 0;
  const respPrev =
    denLast > 0 ? Math.round(((numLast / denLast) * 100) * 10) / 10 : 0;
  const respDelta = computeDelta(respCurrent, respPrev);

  const responseRate: KpiResult = {
    value: respCurrent,
    previousValue: respPrev,
    delta: respDelta.delta,
    deltaLabel: respDelta.deltaLabel,
    trend: respDelta.trend,
  };

  // Scheduled interviews (this week vs last week)
  const [schedThisWeek, schedLastWeek] = await Promise.all([
    db
      .select({ count: count() })
      .from(interviews)
      .where(
        and(
          gte(interviews.scheduledAt, Math.floor(startOfThisWeek.getTime() / 1000)),
          sql`${interviews.scheduledAt} <= ${Math.floor(endOfThisWeek.getTime() / 1000)}`,
        ),
      ),
    db
      .select({ count: count() })
      .from(interviews)
      .where(
        and(
          gte(interviews.scheduledAt, Math.floor(startOfLastWeek.getTime() / 1000)),
          sql`${interviews.scheduledAt} <= ${Math.floor(endOfLastWeek.getTime() / 1000)}`,
        ),
      ),
  ]);

  const schedCurrent = Number(schedThisWeek[0]?.count) || 0;
  const schedPrev = Number(schedLastWeek[0]?.count) || 0;
  const schedDelta = computeDelta(schedCurrent, schedPrev);

  const scheduledInterviews: KpiResult = {
    value: schedCurrent,
    previousValue: schedPrev,
    delta: schedDelta.delta,
    deltaLabel: schedDelta.deltaLabel,
    trend: schedDelta.trend,
  };

  return {
    activeApplications,
    avgPSOScore,
    responseRate,
    scheduledInterviews,
    computedAt: now.toISOString(),
  };
}

async function buildMarketPulseForUser(userId: string): Promise<MarketPulse> {
  const userRow = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  const profileSkills: string[] =
    (userRow?.profileData as any)?.skills ??
    (userRow?.profileData as any)?.topSkills ??
    [];

  let candidateSkills: string[] = profileSkills;

  if (!candidateSkills.length) {
    const jobRows = await db
      .select({ skills: jobs.skills })
      .from(jobs)
      .where(like(jobs.selectedProjectIds, `%${userId}%`))
      .limit(200);

    const skillCounts = new Map<string, number>();

    for (const row of jobRows) {
      if (!row.skills) continue;
      const parts = row.skills
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const s of parts) {
        skillCounts.set(s, (skillCounts.get(s) ?? 0) + 1);
      }
    }

    candidateSkills = [...skillCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);
  }

  if (!candidateSkills.length) {
    return { skills: [] };
  }

  const jobRows = await db
    .select({
      skills: jobs.skills,
      salaryMinAmount: jobs.salaryMinAmount,
      salaryMaxAmount: jobs.salaryMaxAmount,
    })
    .from(jobs);

  const totalOffers = jobRows.length || 1;

  const stats = new Map<
    string,
    { occurrences: number; salaries: number[] }
  >();

  for (const baseSkill of candidateSkills) {
    stats.set(baseSkill, { occurrences: 0, salaries: [] });
  }

  for (const row of jobRows) {
    if (!row.skills) continue;
    const parts = row.skills
      .toLowerCase()
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);

    for (const baseSkill of candidateSkills) {
      const base = baseSkill.toLowerCase();
      const matches = parts.some((p) => p.includes(base));
      if (!matches) continue;

      const entry = stats.get(baseSkill);
      if (!entry) continue;

      entry.occurrences += 1;

      const min = (row.salaryMinAmount as number | null) ?? 0;
      const max = (row.salaryMaxAmount as number | null) ?? 0;
      if (min > 0 && max > 0) {
        entry.salaries.push((min + max) / 2);
      }
    }
  }

  const skills: MarketPulseSkill[] = [];

  for (const [name, { occurrences, salaries }] of stats.entries()) {
    if (!occurrences) continue;

    const tensionScore = clamp(occurrences / totalOffers, 0, 1);

    const sorted = [...salaries].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const salaryP50 =
      sorted.length === 0
        ? 0
        : sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];

    const trendDelta = tensionScore > 0.7 ? 0.05 : tensionScore < 0.3 ? -0.02 : 0;

    skills.push({
      name,
      tensionScore,
      trendDelta,
      salaryP50,
    });
  }

  return { skills };
}

async function computeMomentumScore(
  userId: string,
  kpis: SeekerDashboardKpis,
): Promise<number> {
  let score = 0;

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyAppsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(
      and(
        eq(jobs.status, "applied"),
        like(jobs.selectedProjectIds, `%${userId}%`),
        gte(jobs.appliedAt, startOfWeek),
      ),
    );
  const weeklyApplications = Number(weeklyAppsResult[0]?.count) || 0;
  if (weeklyApplications >= 3) {
    score += 20;
  }

  const profileCompleted = 0.8;
  if (profileCompleted >= 0.8) {
    score += 20;
  }

  const hasActiveAgent = true;
  if (hasActiveAgent) {
    score += 20;
  }

  if (kpis.avgPSOScore > 65) {
    score += 20;
  }

  const inboxTrackerConnected = await db
    .select({ count: sql<number>`count(*)` })
    .from(postApplicationIntegrations)
    .where(
      and(
        eq(postApplicationIntegrations.status, "connected"),
        eq(postApplicationIntegrations.provider, "gmail"),
      ),
    );
  const hasInboxConnected =
    Number(inboxTrackerConnected[0]?.count) > 0;
  if (hasInboxConnected) {
    score += 20;
  }

  return clamp(score, 0, 100);
}

async function shouldEmitMarketPulseEvent(userId: string): Promise<boolean> {
  const currentCountResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(jobs)
    .where(eq(jobs.userId, userId));

  const currentCount = Number(currentCountResult[0]?.count) || 0;

  const checkpoint = await db.query.sseCheckpoints.findFirst({
    where: eq(sseCheckpoints.userId, userId),
  });

  const now = new Date();

  if (!checkpoint) {
    await db.insert(sseCheckpoints).values({
      userId,
      lastJobCount: currentCount,
      lastCheckedAt: now,
      lastEventSentAt: now,
    });
    return true;
  }

  const hasNewJobs = currentCount > checkpoint.lastJobCount;

  await db
    .update(sseCheckpoints)
    .set({
      lastJobCount: currentCount,
      lastCheckedAt: now,
      ...(hasNewJobs ? { lastEventSentAt: now } : {}),
    })
    .where(eq(sseCheckpoints.userId, userId));

  return hasNewJobs;
}

function buildRecentActivityMock(kpis: SeekerDashboardKpis): SeekerActivityItem[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  return [
    {
      type: "applications",
      description: `${kpis.activeApplications} candidatures actives en suivi`,
      timestamp: iso(new Date(now.getTime() - 15 * 60 * 1000)),
      icon: "Briefcase",
    },
    {
      type: "interviews",
      description: `${kpis.scheduledInterviews} entretiens planifiés cette semaine`,
      timestamp: iso(new Date(now.getTime() - 45 * 60 * 1000)),
      icon: "Calendar",
    },
    {
      type: "score",
      description: `Score PSO moyen à ${kpis.avgPSOScore}/100`,
      timestamp: iso(new Date(now.getTime() - 2 * 60 * 60 * 1000)),
      icon: "Target",
    },
  ];
}

function buildInsightOfDay(marketPulse: MarketPulse, momentumScore: number): string {
  const hottestSkill = [...marketPulse.skills].sort(
    (a, b) => b.tensionScore - a.tensionScore,
  )[0];

  if (!hottestSkill) {
    return "Continuez à maintenir un bon rythme de candidatures et à suivre vos réponses pour maximiser vos chances.";
  }

  if (momentumScore >= 80) {
    return `Votre momentum est excellent. Capitalisez sur la tension forte autour de ${hottestSkill.name} pour cibler des offres premium cette semaine.`;
  }

  if (momentumScore >= 50) {
    return `Bon rythme global. Ajoutez 2–3 candidatures ciblées sur des postes ${hottestSkill.name} où la tension du marché est élevée pour accélérer vos entretiens.`;
  }

  return `Le marché est particulièrement favorable sur ${hottestSkill.name}. Augmentez votre cadence de candidatures cette semaine pour profiter de cette fenêtre.`;
}

seekerDashboardRouter.get(
  "/dashboard",
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

      const kpis = await computeSeekerKpis(userId);
      const marketPulse = await buildMarketPulseForUser(userId);
      const momentumScore = await computeMomentumScore(userId, kpis);
      const recentActivity = buildRecentActivityMock(kpis);
      const insightOfDay = buildInsightOfDay(marketPulse, momentumScore);

      const payload: SeekerDashboardPayload = {
        kpis,
        marketPulse,
        momentumScore,
        recentActivity,
        insightOfDay,
      };

      return res.json({
        ok: true,
        data: payload,
        meta: { requestId: res.getHeader("x-request-id") },
      });
    } catch (error) {
      console.error("Seeker dashboard error:", error);
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

seekerDashboardRouter.get(
  "/market-pulse/live",
  async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const { userId } = (req as AuthRequest).user ?? {};
      if (!userId) {
        sendEvent("error", { message: "User context missing" });
      } else {
        sendEvent("message", {
          type: "connected",
          userId,
          message:
            "Market Pulse SSE connecté — émission conditionnelle active",
        });

        const shouldEmit = await shouldEmitMarketPulseEvent(userId);
        if (shouldEmit) {
          const kpis = await computeSeekerKpis(userId);
          const marketPulse = await buildMarketPulseForUser(userId);
          const momentumScore = await computeMomentumScore(userId, kpis);

          sendEvent("market-pulse", {
            marketPulse,
            momentumScore,
            sentAt: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Seeker market pulse initial send error:", error);
    }

    const intervalMs = 30 * 60 * 1000;
    const intervalId = setInterval(async () => {
      try {
        const { userId } = (req as AuthRequest).user ?? {};
        if (!userId) {
          sendEvent("error", { message: "User context missing" });
          return;
        }

        const shouldEmit = await shouldEmitMarketPulseEvent(userId);
        if (!shouldEmit) {
          return;
        }

        const kpis = await computeSeekerKpis(userId);
        const marketPulse = await buildMarketPulseForUser(userId);
        const momentumScore = await computeMomentumScore(userId, kpis);

        sendEvent("market-pulse", {
          marketPulse,
          momentumScore,
          sentAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Seeker market pulse SSE error:", error);
        sendEvent("error", {
          message:
            error instanceof Error ? error.message : "Unknown error",
        });
      }
    }, intervalMs);

    req.on("close", () => {
      clearInterval(intervalId);
      res.end();
    });
  },
);


