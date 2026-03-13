/**
 * Seeker Interview Preparation API routes
 * Handles interview preparation with AI-generated questions.
 */

import { Router } from "express";
import { z } from "zod";
import { db } from "../../db";
import { jobs, users, interviewPrepSessions, interviews } from "../../db/schema";
import type { InterviewQuestion } from "../../db/schema";
import { eq, and, gte, or, lte, desc } from "drizzle-orm";
import type { AuthenticatedRequest } from "../../middleware/auth";
import { getSetting } from "../../repositories/settings";
import { LlmService } from "../../services/llm/service";

export const seekerInterviewRouter = Router();

const prepareBodySchema = z.object({
  applicationId: z.string().optional(),
  jobDescription: z.string().max(5000).optional(),
  jobTitle: z.string().max(200).optional(),
  company: z.string().max(200).optional(),
  mode: z.enum(["flash", "full", "technical"]),
});

/**
 * GET /api/seeker/interview/applications-with-interview
 * Returns applications with interviews scheduled in the next 7 days
 * or with status 'in_progress' (interview stage).
 */
seekerInterviewRouter.get("/interview/applications-with-interview", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const applicationsWithInterviews = await db
      .select({
        id: jobs.id,
        company: jobs.employer,
        jobTitle: jobs.title,
        status: jobs.status,
        psoScore: jobs.suitabilityScore,
        location: jobs.location,
      })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          or(
            eq(jobs.status, "in_progress"),
            eq(jobs.status, "applied")
          )
        )
      )
      .orderBy(desc(jobs.updatedAt))
      .limit(20);

    const jobIds = applicationsWithInterviews.map((app) => app.id);

    let interviewsByJobId: Record<string, { scheduledAt: number }> = {};
    if (jobIds.length > 0) {
      const upcomingInterviews = await db
        .select({
          applicationId: interviews.applicationId,
          scheduledAt: interviews.scheduledAt,
        })
        .from(interviews)
        .where(
          and(
            gte(interviews.scheduledAt, Math.floor(now.getTime() / 1000)),
            lte(interviews.scheduledAt, Math.floor(sevenDaysFromNow.getTime() / 1000))
          )
        );

      interviewsByJobId = upcomingInterviews.reduce(
        (acc, interview) => {
          acc[interview.applicationId] = { scheduledAt: interview.scheduledAt };
          return acc;
        },
        {} as Record<string, { scheduledAt: number }>
      );
    }

    const result = applicationsWithInterviews.map((app) => {
      const interview = interviewsByJobId[app.id];
      return {
        id: app.id,
        company: app.company,
        jobTitle: app.jobTitle,
        interviewDate: interview ? new Date(interview.scheduledAt * 1000).toISOString() : null,
        status: app.status,
        psoScore: app.psoScore ?? null,
        location: app.location,
      };
    });

    const sorted = result.sort((a, b) => {
      if (a.interviewDate && b.interviewDate) {
        return new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime();
      }
      if (a.interviewDate) return -1;
      if (b.interviewDate) return 1;
      return 0;
    });

    return res.json({ ok: true, data: sorted });
  } catch (error) {
    console.error("[seeker-interview] Error fetching applications:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/seeker/interview/prepare
 * Generates interview preparation questions using AI.
 */
seekerInterviewRouter.post("/interview/prepare", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const parsed = prepareBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    }

    const { applicationId, jobDescription, jobTitle, company, mode } = parsed.data;

    let jobData: {
      title: string;
      company: string;
      description: string | null;
    } | null = null;

    if (applicationId) {
      const job = await db.query.jobs.findFirst({
        where: and(eq(jobs.id, applicationId), eq(jobs.userId, userId)),
        columns: {
          id: true,
          title: true,
          employer: true,
          jobDescription: true,
        },
      });

      if (!job) {
        return res.status(404).json({ error: "Application not found" });
      }

      jobData = {
        title: job.title,
        company: job.employer,
        description: job.jobDescription,
      };
    } else if (jobDescription || jobTitle) {
      jobData = {
        title: jobTitle || "Poste non spécifié",
        company: company || "Entreprise non spécifiée",
        description: jobDescription || null,
      };
    } else {
      return res.status(400).json({ error: "Either applicationId or jobDescription/jobTitle is required" });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        firstName: true,
        lastName: true,
        profileData: true,
      },
    });

    const profileData = user?.profileData;
    const skills = profileData?.skills?.slice(0, 5).map((s) => s.name).join(", ") || "";
    const currentTitle = profileData?.currentTitle || "";

    const modeConfig = {
      flash: {
        count: 8,
        distribution: "2 questions comportementales, 3 questions techniques, 2 questions motivationnelles, 1 question situationnelle",
      },
      full: {
        count: 15,
        distribution: "répartition équilibrée entre comportementales, techniques, motivationnelles et situationnelles",
      },
      technical: {
        count: 12,
        distribution: "12 questions techniques approfondies spécifiques au poste et aux compétences requises",
      },
    };

    const config = modeConfig[mode];

    const systemPrompt = `Tu es un expert RH spécialisé dans la préparation aux entretiens d'embauche.
Tu dois générer des questions d'entretien pertinentes et personnalisées.

IMPORTANT: Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après.
Le JSON doit contenir exactement une clé "questions" qui est un tableau d'objets.

Chaque objet question doit avoir cette structure exacte:
{
  "question": "La question complète",
  "type": "behavioral" | "technical" | "motivational" | "situational",
  "difficulty": 1 | 2 | 3,
  "expectedKeywords": ["mot-clé 1", "mot-clé 2", "mot-clé 3"],
  "starRequired": true | false,
  "tipForCandidate": "Un conseil concis pour bien répondre"
}

Types de questions:
- behavioral: Questions sur le comportement passé (ex: "Parlez-moi d'une situation où...")
- technical: Questions sur les compétences techniques
- motivational: Questions sur la motivation et les aspirations
- situational: Questions hypothétiques (ex: "Que feriez-vous si...")

Difficulté:
- 1: Question de base, réponse attendue directe
- 2: Question intermédiaire, nécessite réflexion
- 3: Question avancée, réponse complexe attendue

starRequired: true si la question attend une réponse structurée STAR (Situation, Tâche, Action, Résultat)`;

    const userPrompt = `Génère ${config.count} questions d'entretien pour ce poste.

**Poste:** ${jobData.title}
**Entreprise:** ${jobData.company}
**Description du poste:** ${jobData.description?.slice(0, 1500) || "Non fournie"}

**Profil du candidat:**
- Titre actuel: ${currentTitle || "Non spécifié"}
- Compétences clés: ${skills || "Non spécifiées"}

**Mode de préparation:** ${mode}
**Distribution attendue:** ${config.distribution}

Génère exactement ${config.count} questions variées et pertinentes pour ce poste.
Les questions doivent être en français et adaptées au contexte professionnel français.`;

    const overrideModel = await getSetting("model");
    const primaryModel =
      overrideModel ||
      process.env.MODEL ||
      process.env.LLM_MODEL ||
      "google/gemini-2.5-flash";

    const fallbackModels = [
      primaryModel,
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
    ];

    const llmService = new LlmService();

    const questionsSchema: import("../../services/llm/types").JsonSchemaDefinition = {
      name: "interview_questions",
      schema: {
        type: "object",
        properties: {
          questions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                type: { type: "string" },
                difficulty: { type: "number" },
                expectedKeywords: { type: "array", items: { type: "string" } },
                starRequired: { type: "boolean" },
                tipForCandidate: { type: "string" },
              },
              required: ["question", "type", "difficulty", "expectedKeywords", "starRequired", "tipForCandidate"],
            },
          },
        },
        required: ["questions"],
        additionalProperties: false,
      },
    };

    let response: import("../../services/llm/types").LlmResponse<{ questions: InterviewQuestion[] }> = { success: false, error: "No models tried" };

    for (const model of fallbackModels) {
      console.log(`[seeker-interview] Trying model: ${model}`);
      response = await llmService.callJson<{ questions: InterviewQuestion[] }>({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        jsonSchema: questionsSchema,
        maxRetries: 1,
      });

      if (response.success) break;
      console.warn(`[seeker-interview] Model ${model} failed:`, response.error);
    }

    if (!response.success) {
      console.error("[seeker-interview] All LLM models failed:", response.error);
      const userMessage =
        response.error === "LLM API key not configured"
          ? "Clé API LLM non configurée. Configurez LLM_API_KEY (ou OPENROUTER_API_KEY) dans les paramètres."
          : response.error;
      return res.status(500).json({ error: userMessage, details: response.error });
    }

    const questions = response.data?.questions || [];

    const [session] = await db
      .insert(interviewPrepSessions)
      .values({
        userId,
        applicationId: applicationId || null,
        mode,
        questions,
        jobTitle: jobData.title,
        company: jobData.company,
      })
      .returning();

    return res.json({
      ok: true,
      data: {
        sessionId: session.id,
        questions,
        jobTitle: jobData.title,
        company: jobData.company,
        mode,
      },
    });
  } catch (error) {
    console.error("[seeker-interview] Error preparing interview:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/seeker/interview/sessions
 * Returns past interview preparation sessions for the user.
 */
seekerInterviewRouter.get("/interview/sessions", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessions = await db
      .select({
        id: interviewPrepSessions.id,
        applicationId: interviewPrepSessions.applicationId,
        mode: interviewPrepSessions.mode,
        jobTitle: interviewPrepSessions.jobTitle,
        company: interviewPrepSessions.company,
        questionsCount: interviewPrepSessions.questions,
        createdAt: interviewPrepSessions.createdAt,
        completedAt: interviewPrepSessions.completedAt,
      })
      .from(interviewPrepSessions)
      .where(eq(interviewPrepSessions.userId, userId))
      .orderBy(desc(interviewPrepSessions.createdAt))
      .limit(10);

    const result = sessions.map((s) => ({
      id: s.id,
      applicationId: s.applicationId,
      mode: s.mode,
      jobTitle: s.jobTitle,
      company: s.company,
      questionsCount: Array.isArray(s.questionsCount) ? s.questionsCount.length : 0,
      createdAt: s.createdAt?.toISOString(),
      completedAt: s.completedAt?.toISOString() || null,
    }));

    return res.json({ ok: true, data: result });
  } catch (error) {
    console.error("[seeker-interview] Error fetching sessions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/seeker/interview/sessions/:id
 * Returns a specific session with its questions.
 */
seekerInterviewRouter.get("/interview/sessions/:id", async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const sessionId = req.params.id;

    const session = await db.query.interviewPrepSessions.findFirst({
      where: and(
        eq(interviewPrepSessions.id, sessionId),
        eq(interviewPrepSessions.userId, userId)
      ),
    });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    return res.json({
      ok: true,
      data: {
        id: session.id,
        applicationId: session.applicationId,
        mode: session.mode,
        jobTitle: session.jobTitle,
        company: session.company,
        questions: session.questions,
        createdAt: session.createdAt?.toISOString(),
        completedAt: session.completedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("[seeker-interview] Error fetching session:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});
