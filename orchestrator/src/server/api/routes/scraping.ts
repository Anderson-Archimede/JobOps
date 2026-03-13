import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "../../db";
import type { AuthRequest } from "../../middleware/authenticateJWT";
import { scrapingQueue } from "../../queues";

const { scrapingSessions } = schema;

export const scrapingRouter = Router();

const launchScrapingBodySchema = z.object({
  platforms: z
    .array(
      z.enum([
        "linkedin",
        "hellowork",
        "indeed",
        "glassdoor",
        "france_travail",
        "welcome_jungle",
        "meteojob",
      ]),
    )
    .min(1),
  keywords: z.string().min(2).max(100),
  location: z.string().optional(),
  contractTypes: z
    .array(
      z.enum(["CDI", "CDD", "FREELANCE", "STAGE", "ALTERNANCE"]),
    )
    .optional(),
  maxResults: z.number().min(10).max(200).default(50),
});

scrapingRouter.post(
  "/scraping/launch",
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthRequest).user ?? {};
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "User context missing" },
      });
    }

    const parseResult = launchScrapingBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        ok: false,
        error: { code: "INVALID_BODY", message: "Invalid payload" },
        details: parseResult.error.flatten(),
      });
    }

    const body = parseResult.data;

    const [session] = await db
      .insert(scrapingSessions)
      .values({
        userId,
        status: "pending",
        platforms: body.platforms,
        keywords: body.keywords,
        location: body.location ?? null,
        contractTypes: body.contractTypes ?? [],
        maxResults: body.maxResults,
      })
      .returning();

    await scrapingQueue.add(
      "scrape-job",
      {
        sessionId: session.id,
        userId,
        platforms: body.platforms,
        keywords: body.keywords,
        location: body.location ?? null,
        contractTypes: body.contractTypes ?? [],
        maxResults: body.maxResults,
      },
      {
        jobId: session.id,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );

    return res.json({
      ok: true,
      data: {
        sessionId: session.id,
        status: "launched",
        message: `Scraping lancé sur ${body.platforms.length} plateforme(s)`,
      },
    });
  },
);

scrapingRouter.get(
  "/scraping/sessions",
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthRequest).user ?? {};
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "User context missing" },
      });
    }

    const rows = await db
      .select({
        id: scrapingSessions.id,
        status: scrapingSessions.status,
        platforms: scrapingSessions.platforms,
        keywords: scrapingSessions.keywords,
        jobsFound: scrapingSessions.jobsFound,
        startedAt: scrapingSessions.startedAt,
        completedAt: scrapingSessions.completedAt,
        errors: scrapingSessions.errors,
      })
      .from(scrapingSessions)
      .where(eq(scrapingSessions.userId, userId))
      .orderBy(desc(scrapingSessions.startedAt))
      .limit(10);

    return res.json({
      ok: true,
      data: rows,
    });
  },
);

scrapingRouter.get(
  "/scraping/sessions/:id/progress",
  async (req: Request, res: Response) => {
    const { userId } = (req as AuthRequest).user ?? {};
    if (!userId) {
      return res.status(401).json({
        ok: false,
        error: { code: "UNAUTHORIZED", message: "User context missing" },
      });
    }

    const sessionId = req.params.id;

    const [session] = await db
      .select({
        id: scrapingSessions.id,
        userId: scrapingSessions.userId,
        status: scrapingSessions.status,
        startedAt: scrapingSessions.startedAt,
      })
      .from(scrapingSessions)
      .where(
        and(
          eq(scrapingSessions.id, sessionId),
          eq(scrapingSessions.userId, userId),
        ),
      );

    if (!session) {
      return res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Scraping session not found" },
      });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    res.write(
      `data: ${JSON.stringify({
        type: "connected",
        sessionId,
      })}\n\n`,
    );

    const interval = setInterval(async () => {
      try {
        const job = await scrapingQueue.getJob(sessionId);
        if (!job) {
          return;
        }

        const progress = (job.progress as number | undefined) ?? 0;

        // Derive per-platform progress from job data (best-effort)
        const data = job.data as {
          platforms?: string[];
        };
        const platforms =
          Array.isArray(data?.platforms) && data.platforms.length > 0
            ? data.platforms
            : ["global"];

        res.write(
          `data: ${JSON.stringify({
            type: "progress",
            progress,
            platforms: platforms.map((p) => ({
              platform: p,
              percent: progress,
            })),
          })}\n\n`,
        );

        if (job.finishedOn) {
          const result = (await job.returnvalue) as
            | { data?: { jobsDiscovered?: number }; duration?: number }
            | undefined;
          res.write(
            `data: ${JSON.stringify({
              type: "completed",
              jobsFound: result?.data?.jobsDiscovered ?? 0,
              duration: result?.duration ?? 0,
            })}\n\n`,
          );
          clearInterval(interval);
          res.end();
        }
      } catch (error) {
        res.write(
          `data: ${JSON.stringify({
            type: "error",
            message:
              error instanceof Error ? error.message : "Unknown error",
          })}\n\n`,
        );
        clearInterval(interval);
        res.end();
      }
    }, 1500);

    req.on("close", () => {
      clearInterval(interval);
    });
  },
);

