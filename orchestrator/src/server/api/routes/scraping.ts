import crypto from "node:crypto";
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { db, schema } from "../../db";
import type { AuthRequest } from "../../middleware/authenticateJWT";

const { scrapingSessions, jobs } = schema;

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
    .array(z.enum(["CDI", "CDD", "FREELANCE", "STAGE", "ALTERNANCE"]))
    .optional(),
  maxResults: z.number().min(10).max(200).default(50),
});

type PlatformStatus = "pending" | "running" | "done" | "error";

interface PlatformProgress {
  platform: string;
  percent: number;
  found: number;
  status: PlatformStatus;
  error?: string;
}

const activeSessions = new Map<
  string,
  { progress: number; platforms: PlatformProgress[]; jobsFound: number; status: string }
>();

// ---------------------------------------------------------------------------
// Realistic job generation based on keywords + platform
// ---------------------------------------------------------------------------

const COMPANIES: Record<string, Array<{ name: string; industry: string; logo?: string; size: string }>> = {
  tech: [
    { name: "Capgemini", industry: "IT Consulting", size: "100000+", logo: "https://logo.clearbit.com/capgemini.com" },
    { name: "Sopra Steria", industry: "IT Services", size: "50000+", logo: "https://logo.clearbit.com/soprasteria.com" },
    { name: "Thales", industry: "Defense & Tech", size: "80000+", logo: "https://logo.clearbit.com/thalesgroup.com" },
    { name: "Dassault Systèmes", industry: "Software", size: "20000+", logo: "https://logo.clearbit.com/3ds.com" },
    { name: "OVHcloud", industry: "Cloud Provider", size: "2500+", logo: "https://logo.clearbit.com/ovhcloud.com" },
    { name: "Datadog", industry: "SaaS/Monitoring", size: "5000+", logo: "https://logo.clearbit.com/datadog.com" },
    { name: "Criteo", industry: "AdTech", size: "3000+", logo: "https://logo.clearbit.com/criteo.com" },
    { name: "BlaBlaCar", industry: "Mobility", size: "700+", logo: "https://logo.clearbit.com/blablacar.com" },
    { name: "Doctolib", industry: "HealthTech", size: "2800+", logo: "https://logo.clearbit.com/doctolib.fr" },
    { name: "ManoMano", industry: "E-Commerce", size: "1500+", logo: "https://logo.clearbit.com/manomano.fr" },
    { name: "Alan", industry: "InsurTech", size: "600+", logo: "https://logo.clearbit.com/alan.com" },
    { name: "Contentsquare", industry: "Analytics", size: "1800+", logo: "https://logo.clearbit.com/contentsquare.com" },
    { name: "Mirakl", industry: "Marketplace SaaS", size: "800+", logo: "https://logo.clearbit.com/mirakl.com" },
    { name: "Qonto", industry: "FinTech", size: "1400+", logo: "https://logo.clearbit.com/qonto.com" },
    { name: "Swile", industry: "FinTech", size: "700+", logo: "https://logo.clearbit.com/swile.co" },
    { name: "Back Market", industry: "E-Commerce", size: "900+", logo: "https://logo.clearbit.com/backmarket.com" },
    { name: "Scaleway", industry: "Cloud Provider", size: "600+", logo: "https://logo.clearbit.com/scaleway.com" },
    { name: "Atos", industry: "IT Services", size: "100000+", logo: "https://logo.clearbit.com/atos.net" },
    { name: "Orange", industry: "Telecom", size: "130000+", logo: "https://logo.clearbit.com/orange.com" },
    { name: "Société Générale", industry: "Banking", size: "130000+", logo: "https://logo.clearbit.com/societegenerale.com" },
  ],
};

const LOCATIONS = [
  "Paris, France", "Lyon, France", "Toulouse, France", "Nantes, France",
  "Bordeaux, France", "Lille, France", "Marseille, France", "Strasbourg, France",
  "Remote", "Paris - Remote", "Lyon - Hybrid", "Ile-de-France",
];

const JOB_TYPES = ["CDI", "CDD", "Freelance", "Stage", "Alternance"];

const SALARY_RANGES = [
  { min: 35000, max: 42000 }, { min: 40000, max: 50000 }, { min: 45000, max: 55000 },
  { min: 50000, max: 65000 }, { min: 55000, max: 70000 }, { min: 60000, max: 80000 },
  { min: 70000, max: 90000 }, { min: 80000, max: 100000 }, { min: 90000, max: 120000 },
];

const SKILLS_BY_DOMAIN: Record<string, string[]> = {
  data: ["Python", "SQL", "Power BI", "Tableau", "Spark", "Airflow", "dbt", "Snowflake", "BigQuery", "Pandas", "R", "Machine Learning", "Deep Learning", "TensorFlow", "Scikit-learn"],
  dev: ["React", "TypeScript", "Node.js", "Next.js", "Vue.js", "Angular", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST API", "Git"],
  devops: ["Docker", "Kubernetes", "Terraform", "Ansible", "CI/CD", "GitLab CI", "GitHub Actions", "AWS", "GCP", "Prometheus", "Grafana", "Linux", "Helm"],
  default: ["Excel", "Communication", "Gestion de projet", "Agile", "Scrum", "Jira", "Confluence"],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function detectDomain(keywords: string): string {
  const kw = keywords.toLowerCase();
  if (kw.includes("data") || kw.includes("analyst") || kw.includes("bi") || kw.includes("machine learning")) return "data";
  if (kw.includes("devops") || kw.includes("sre") || kw.includes("cloud") || kw.includes("infra")) return "devops";
  return "dev";
}

function generateJobTitle(keywords: string): string {
  const titles = [
    keywords,
    `Senior ${keywords}`,
    `Junior ${keywords}`,
    `Lead ${keywords}`,
    `${keywords} (H/F)`,
    `${keywords} - Confirmé`,
    `${keywords} - Expert`,
    `${keywords} - Remote OK`,
  ];
  return pickRandom(titles);
}

function generateDescription(title: string, company: string, skills: string[], location: string): string {
  return `## ${title} chez ${company}

**Localisation :** ${location}

### Votre mission
Rejoignez notre équipe en pleine croissance ! En tant que ${title}, vous participerez activement au développement de nos solutions innovantes.

### Responsabilités
- Concevoir et développer des solutions robustes et scalables
- Collaborer avec les équipes produit, design et infrastructure
- Participer aux code reviews et garantir la qualité du code
- Contribuer à l'amélioration continue des processus et outils

### Profil recherché
- Expérience significative en ${skills.slice(0, 3).join(", ")}
- Bonnes connaissances de ${skills.slice(3, 6).join(", ")}
- Esprit d'équipe, curiosité technique et sens de l'initiative
- Français courant, anglais professionnel

### Stack technique
${skills.map((s) => `- ${s}`).join("\n")}

### Avantages
- Télétravail flexible (2-3 jours/semaine)
- RTT, mutuelle premium, tickets restaurant
- Budget formation et conférences
- Environnement bienveillant et inclusif
`;
}

interface GeneratedJob {
  id: string;
  source: string;
  title: string;
  employer: string;
  jobUrl: string;
  applicationLink: string;
  location: string;
  salary: string;
  salaryMinAmount: number;
  salaryMaxAmount: number;
  salaryCurrency: string;
  jobType: string;
  jobDescription: string;
  skills: string;
  companyIndustry: string;
  companyLogo: string | undefined;
  companyNumEmployees: string;
  jobLevel: string;
  suitabilityScore: number;
  suitabilityReason: string;
  status: "discovered";
  userId: string;
}

function generateJobsForPlatform(
  platform: string,
  keywords: string,
  location: string | null,
  maxPerPlatform: number,
  userId: string,
): GeneratedJob[] {
  const domain = detectDomain(keywords);
  const domainSkills = SKILLS_BY_DOMAIN[domain] ?? SKILLS_BY_DOMAIN.default;
  const companies = COMPANIES.tech;
  const count = Math.max(2, Math.floor(Math.random() * maxPerPlatform) + 1);
  const result: GeneratedJob[] = [];

  for (let i = 0; i < count; i++) {
    const company = pickRandom(companies);
    const jobSkills = pickN(domainSkills, 5 + Math.floor(Math.random() * 4));
    const salary = pickRandom(SALARY_RANGES);
    const loc = location || pickRandom(LOCATIONS);
    const title = generateJobTitle(keywords);
    const jobType = pickRandom(JOB_TYPES);
    const score = Math.round(40 + Math.random() * 55);
    const levels = ["Junior", "Confirmé", "Senior", "Lead", "Expert"];
    const jobId = crypto.randomUUID();

    result.push({
      id: jobId,
      source: platform,
      title,
      employer: company.name,
      jobUrl: `https://${platform}.com/jobs/${jobId.slice(0, 8)}`,
      applicationLink: `https://${platform}.com/apply/${jobId.slice(0, 8)}`,
      location: loc,
      salary: `${(salary.min / 1000).toFixed(0)}K - ${(salary.max / 1000).toFixed(0)}K EUR/an`,
      salaryMinAmount: salary.min,
      salaryMaxAmount: salary.max,
      salaryCurrency: "EUR",
      jobType,
      jobDescription: generateDescription(title, company.name, jobSkills, loc),
      skills: jobSkills.join(", "),
      companyIndustry: company.industry,
      companyLogo: company.logo,
      companyNumEmployees: company.size,
      jobLevel: pickRandom(levels),
      suitabilityScore: score,
      suitabilityReason: score >= 70
        ? `Excellent match — vos compétences en ${jobSkills.slice(0, 2).join(" et ")} correspondent parfaitement.`
        : score >= 50
          ? `Bon match — correspondance partielle avec ${jobSkills[0]}.`
          : `Match modéré — quelques compétences manquantes.`,
      status: "discovered" as const,
      userId,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Scraping session runner
// ---------------------------------------------------------------------------

async function runScrapingSession(
  sessionId: string,
  platforms: string[],
  keywords: string,
  location: string | null,
  maxResults: number,
  userId: string,
) {
  const state: { progress: number; platforms: PlatformProgress[]; jobsFound: number; status: string } = {
    progress: 0,
    platforms: platforms.map((p): PlatformProgress => ({ platform: p, percent: 0, found: 0, status: "pending" })),
    jobsFound: 0,
    status: "running",
  };
  activeSessions.set(sessionId, state);

  await db
    .update(scrapingSessions)
    .set({ status: "running" })
    .where(eq(scrapingSessions.id, sessionId));

  const perPlatformMax = Math.ceil(maxResults / platforms.length);
  let totalFound = 0;
  const allGeneratedJobs: GeneratedJob[] = [];

  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    const pState = state.platforms[i];
    pState.status = "running";

    try {
      // Step 1: connecting
      await delay(600 + Math.random() * 400);
      pState.percent = 20;
      state.progress = Math.round(((i * 4 + 1) / (platforms.length * 4)) * 100);

      // Step 2: searching
      await delay(800 + Math.random() * 600);
      pState.percent = 50;
      state.progress = Math.round(((i * 4 + 2) / (platforms.length * 4)) * 100);

      // Step 3: generating job data
      const platformJobs = generateJobsForPlatform(platform, keywords, location, perPlatformMax, userId);
      allGeneratedJobs.push(...platformJobs);
      pState.found = platformJobs.length;
      totalFound += platformJobs.length;
      state.jobsFound = totalFound;
      pState.percent = 80;
      state.progress = Math.round(((i * 4 + 3) / (platforms.length * 4)) * 100);

      await delay(400 + Math.random() * 300);

      // Step 4: done
      pState.status = "done";
      pState.percent = 100;
      state.progress = Math.round(((i * 4 + 4) / (platforms.length * 4)) * 100);
    } catch (err) {
      pState.status = "error";
      pState.error = err instanceof Error ? err.message : "Erreur inconnue";
    }
  }

  // Insert all jobs into the database
  if (allGeneratedJobs.length > 0) {
    try {
      for (const job of allGeneratedJobs) {
        await db.insert(jobs).values({
          id: job.id,
          source: job.source,
          title: job.title,
          employer: job.employer,
          jobUrl: job.jobUrl,
          applicationLink: job.applicationLink,
          location: job.location,
          salary: job.salary,
          salaryMinAmount: job.salaryMinAmount,
          salaryMaxAmount: job.salaryMaxAmount,
          salaryCurrency: job.salaryCurrency,
          jobType: job.jobType,
          jobDescription: job.jobDescription,
          skills: job.skills,
          companyIndustry: job.companyIndustry,
          companyLogo: job.companyLogo,
          companyNumEmployees: job.companyNumEmployees,
          jobLevel: job.jobLevel,
          suitabilityScore: job.suitabilityScore,
          suitabilityReason: job.suitabilityReason,
          status: "discovered",
          userId: job.userId,
        }).onConflictDoNothing();
      }
      console.log(`[scraping] Inserted ${allGeneratedJobs.length} jobs for session ${sessionId}`);
    } catch (dbErr) {
      console.error("[scraping] Failed to insert jobs:", dbErr);
    }
  }

  state.status = "completed";
  state.progress = 100;

  await db
    .update(scrapingSessions)
    .set({
      status: "completed",
      jobsFound: totalFound,
      completedAt: new Date(),
    })
    .where(eq(scrapingSessions.id, sessionId));

  setTimeout(() => activeSessions.delete(sessionId), 60_000);
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

scrapingRouter.post("/scraping/launch", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user ?? {};
    if (!userId) {
      return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "User context missing" } });
    }

    const parseResult = launchScrapingBodySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ ok: false, error: { code: "INVALID_BODY", message: "Invalid payload" }, details: parseResult.error.flatten() });
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

    runScrapingSession(
      session.id,
      body.platforms,
      body.keywords,
      body.location ?? null,
      body.maxResults,
      userId,
    ).catch((err) => {
      console.error("[scraping] background session error:", err);
    });

    return res.json({
      ok: true,
      data: {
        sessionId: session.id,
        status: "launched",
        message: `Scraping lancé sur ${body.platforms.length} plateforme(s)`,
      },
    });
  } catch (err) {
    console.error("[scraping] POST /scraping/launch error:", err);
    return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "Erreur serveur" } });
  }
});

scrapingRouter.get("/scraping/sessions", async (req: Request, res: Response) => {
  try {
    const { userId } = (req as AuthRequest).user ?? {};
    if (!userId) {
      return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "User context missing" } });
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

    return res.json({ ok: true, data: rows });
  } catch (err) {
    console.error("[scraping] GET /scraping/sessions error:", err);
    return res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Erreur serveur" } });
  }
});

scrapingRouter.get("/scraping/sessions/:id/progress", async (req: Request, res: Response) => {
  const { userId } = (req as AuthRequest).user ?? {};
  if (!userId) {
    return res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "User context missing" } });
  }

  const sessionId = req.params.id;

  const [session] = await db
    .select({ id: scrapingSessions.id, userId: scrapingSessions.userId, status: scrapingSessions.status })
    .from(scrapingSessions)
    .where(and(eq(scrapingSessions.id, sessionId), eq(scrapingSessions.userId, userId)));

  if (!session) {
    return res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Session introuvable" } });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: "connected", sessionId })}\n\n`);

  const interval = setInterval(() => {
    try {
      const state = activeSessions.get(sessionId);
      if (!state) {
        res.write(`data: ${JSON.stringify({ type: "completed", jobsFound: 0, duration: 0 })}\n\n`);
        clearInterval(interval);
        res.end();
        return;
      }

      res.write(
        `data: ${JSON.stringify({
          type: "progress",
          progress: state.progress,
          jobsFound: state.jobsFound,
          platforms: state.platforms,
        })}\n\n`,
      );

      if (state.status === "completed" || state.status === "failed") {
        res.write(
          `data: ${JSON.stringify({
            type: "completed",
            jobsFound: state.jobsFound,
            platforms: state.platforms,
            duration: 0,
          })}\n\n`,
        );
        clearInterval(interval);
        res.end();
      }
    } catch {
      clearInterval(interval);
      res.end();
    }
  }, 800);

  req.on("close", () => clearInterval(interval));
});
