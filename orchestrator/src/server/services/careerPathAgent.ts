/**
 * Career Path Agent: generates career progression graphs with D3.js force-directed visualization,
 * gap analysis, and detailed transition scenarios.
 */

import { db } from "../db";
import { users, cvs, skillsProfile, jobs } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { LlmService } from "./llm/service";
import { createClient } from "redis";
import type { JsonSchemaDefinition } from "./llm/types";
import type {
  CareerGraph,
  CareerNode,
  CareerEdge,
  ScenarioDetail,
} from "@shared/types/careerPath";

const CAREER_GRAPH_CACHE_TTL = 24 * 60 * 60; // 24h

let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Generate a demo career graph when LLM is not available or profile is empty.
 */
function getDemoCareerGraph(profile: string): { nodes: CareerNode[]; edges: CareerEdge[] } {
  const isDataRole = profile.toLowerCase().includes("data") || profile.toLowerCase().includes("analyst");
  const isSoftwareRole = profile.toLowerCase().includes("software") || profile.toLowerCase().includes("developer") || profile.toLowerCase().includes("engineer");
  
  if (isDataRole) {
    return {
      nodes: [
        { id: "data-analyst", title: "Data Analyst", level: "Mid", sector: "Tech", avgSalary: 75000, requiredSkills: ["SQL", "Python", "Excel", "Data Visualization"], timeToReach: "current", isCurrentPosition: true, isTarget: false },
        { id: "senior-analyst", title: "Senior Data Analyst", level: "Senior", sector: "Tech", avgSalary: 95000, requiredSkills: ["SQL", "Python", "Tableau", "Statistical Analysis"], timeToReach: "12-18 months", isCurrentPosition: false, isTarget: false },
        { id: "data-engineer", title: "Data Engineer", level: "Mid", sector: "Tech", avgSalary: 110000, requiredSkills: ["Python", "Spark", "Airflow", "AWS", "Data Modeling"], timeToReach: "6-12 months", isCurrentPosition: false, isTarget: false },
        { id: "ml-engineer", title: "ML Engineer", level: "Mid", sector: "Tech", avgSalary: 130000, requiredSkills: ["Python", "TensorFlow", "MLOps", "Feature Engineering"], timeToReach: "12-18 months", isCurrentPosition: false, isTarget: false },
        { id: "lead-de", title: "Lead Data Engineer", level: "Lead", sector: "Tech", avgSalary: 150000, requiredSkills: ["Architecture", "Team Leadership", "Spark", "Kubernetes"], timeToReach: "2-3 years", isCurrentPosition: false, isTarget: false },
        { id: "data-scientist", title: "Senior Data Scientist", level: "Senior", sector: "Tech", avgSalary: 145000, requiredSkills: ["Machine Learning", "Statistics", "Python", "Deep Learning"], timeToReach: "18-36 months", isCurrentPosition: false, isTarget: false },
        { id: "head-data", title: "Head of Data", level: "Principal", sector: "Tech", avgSalary: 200000, requiredSkills: ["Strategy", "Team Building", "ML Systems", "Data Governance"], timeToReach: "3-5 years", isCurrentPosition: false, isTarget: true },
      ],
      edges: [
        { from: "data-analyst", to: "senior-analyst", probability: 0.85, transition: "Develop deeper analytical skills and lead projects" },
        { from: "data-analyst", to: "data-engineer", probability: 0.7, transition: "Learn data pipelines and infrastructure" },
        { from: "data-analyst", to: "ml-engineer", probability: 0.5, transition: "Focus on ML/AI fundamentals" },
        { from: "senior-analyst", to: "data-scientist", probability: 0.65, transition: "Deep dive into statistical modeling and ML" },
        { from: "data-engineer", to: "lead-de", probability: 0.75, transition: "Lead technical projects and mentor juniors" },
        { from: "ml-engineer", to: "data-scientist", probability: 0.8, transition: "Focus on research and advanced modeling" },
        { from: "lead-de", to: "head-data", probability: 0.6, transition: "Develop strategic vision and leadership skills" },
        { from: "data-scientist", to: "head-data", probability: 0.55, transition: "Build cross-functional partnerships" },
      ],
    };
  }

  // Default software engineering path
  return {
    nodes: [
      { id: "software-engineer", title: "Software Engineer", level: "Mid", sector: "Tech", avgSalary: 95000, requiredSkills: ["JavaScript", "React", "Node.js", "Git"], timeToReach: "current", isCurrentPosition: true, isTarget: false },
      { id: "senior-swe", title: "Senior Software Engineer", level: "Senior", sector: "Tech", avgSalary: 130000, requiredSkills: ["System Design", "TypeScript", "AWS", "Mentoring"], timeToReach: "12-18 months", isCurrentPosition: false, isTarget: false },
      { id: "fullstack-lead", title: "Full Stack Lead", level: "Lead", sector: "Tech", avgSalary: 150000, requiredSkills: ["Architecture", "Team Leadership", "DevOps", "Agile"], timeToReach: "6-12 months", isCurrentPosition: false, isTarget: false },
      { id: "tech-lead", title: "Tech Lead", level: "Lead", sector: "Tech", avgSalary: 160000, requiredSkills: ["Technical Strategy", "Code Review", "System Design", "Stakeholder Management"], timeToReach: "18-36 months", isCurrentPosition: false, isTarget: false },
      { id: "staff-engineer", title: "Staff Engineer", level: "Staff", sector: "Tech", avgSalary: 180000, requiredSkills: ["Architecture", "Cross-team Impact", "Technical Vision", "Mentoring"], timeToReach: "2-3 years", isCurrentPosition: false, isTarget: false },
      { id: "em", title: "Engineering Manager", level: "Manager", sector: "Tech", avgSalary: 170000, requiredSkills: ["People Management", "Hiring", "Project Planning", "Performance Management"], timeToReach: "18-36 months", isCurrentPosition: false, isTarget: false },
      { id: "vp-eng", title: "VP of Engineering", level: "VP", sector: "Tech", avgSalary: 250000, requiredSkills: ["Executive Leadership", "Org Design", "Budget Management", "Strategic Planning"], timeToReach: "3-5 years", isCurrentPosition: false, isTarget: true },
    ],
    edges: [
      { from: "software-engineer", to: "senior-swe", probability: 0.85, transition: "Deepen technical expertise and take ownership of larger features" },
      { from: "software-engineer", to: "fullstack-lead", probability: 0.6, transition: "Lead a small team while continuing to code" },
      { from: "senior-swe", to: "tech-lead", probability: 0.75, transition: "Take on technical leadership responsibilities" },
      { from: "senior-swe", to: "staff-engineer", probability: 0.65, transition: "Focus on cross-team technical impact" },
      { from: "fullstack-lead", to: "tech-lead", probability: 0.8, transition: "Scale leadership to larger teams" },
      { from: "tech-lead", to: "staff-engineer", probability: 0.7, transition: "Broaden technical influence across organization" },
      { from: "tech-lead", to: "em", probability: 0.55, transition: "Transition from technical to people leadership" },
      { from: "staff-engineer", to: "vp-eng", probability: 0.45, transition: "Move into executive technical leadership" },
      { from: "em", to: "vp-eng", probability: 0.5, transition: "Scale people leadership to multiple teams" },
    ],
  };
}

function getRedis() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = createClient({ url: redisUrl });
    redisClient.on("error", (err) =>
      console.error("[careerPathAgent] Redis error:", err),
    );
    redisClient.connect().catch((err) =>
      console.error("[careerPathAgent] Redis connect error:", err),
    );
  }
  return redisClient;
}

const CAREER_GRAPH_SCHEMA: JsonSchemaDefinition = {
  name: "career_graph",
  schema: {
    type: "object",
    properties: {
      nodes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            level: { type: "string" },
            sector: { type: "string" },
            avgSalary: { type: "number" },
            requiredSkills: { type: "array", items: { type: "string" } },
            timeToReach: { type: "string" },
            isCurrentPosition: { type: "boolean" },
            isTarget: { type: "boolean" },
          },
          required: [
            "id",
            "title",
            "level",
            "sector",
            "avgSalary",
            "requiredSkills",
            "timeToReach",
            "isCurrentPosition",
            "isTarget",
          ],
        },
      },
      edges: {
        type: "array",
        items: {
          type: "object",
          properties: {
            from: { type: "string" },
            to: { type: "string" },
            probability: { type: "number" },
            transition: { type: "string" },
            keySkillsToAcquire: { type: "array", items: { type: "string" } },
          },
          required: ["from", "to", "probability", "transition"],
        },
      },
    },
    required: ["nodes", "edges"],
    additionalProperties: false,
  },
};

const SCENARIO_DETAIL_SCHEMA: JsonSchemaDefinition = {
  name: "scenario_detail",
  schema: {
    type: "object",
    properties: {
      estimatedDuration: { type: "string" },
      targetSalaryRange: {
        type: "object",
        properties: {
          min: { type: "number" },
          max: { type: "number" },
        },
        required: ["min", "max"],
      },
      gapSkills: {
        type: "array",
        items: {
          type: "object",
          properties: {
            skill: { type: "string" },
            currentLevel: { type: "string" },
            requiredLevel: { type: "string" },
            resources: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["course", "certification", "project", "book"],
                  },
                  url: { type: "string" },
                  estimatedHours: { type: "number" },
                },
                required: ["title", "type"],
              },
            },
          },
          required: ["skill", "requiredLevel", "resources"],
        },
      },
      typicalCompanies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            sector: { type: "string" },
            hiringFrequency: {
              type: "string",
              enum: ["low", "medium", "high"],
            },
          },
          required: ["name", "sector"],
        },
      },
      concreteActions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            action: { type: "string" },
            deadline: { type: "string" },
            priority: { type: "string", enum: ["high", "medium", "low"] },
          },
          required: ["action", "deadline", "priority"],
        },
      },
      transitionNarrative: { type: "string" },
    },
    required: [
      "estimatedDuration",
      "targetSalaryRange",
      "gapSkills",
      "typicalCompanies",
      "concreteActions",
      "transitionNarrative",
    ],
    additionalProperties: false,
  },
};

async function buildUserProfile(userId: string): Promise<string> {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) return "No user profile found.";

  const parts: string[] = [];

  // User info
  if (user.firstName || user.lastName) {
    parts.push(`Name: ${user.firstName} ${user.lastName}`.trim());
  }

  // CV data
  const userCVs = await db
    .select()
    .from(cvs)
    .where(and(eq(cvs.userId, userId), eq(cvs.isActive, true)))
    .orderBy(desc(cvs.updatedAt))
    .limit(5);

  if (userCVs.length > 0) {
    for (const cv of userCVs) {
      if (cv.name) parts.push(`CV: ${cv.name}`);
      if (cv.role) parts.push(`Role: ${cv.role}`);
      if (cv.resumeData && typeof cv.resumeData === "object") {
        const resumeData = cv.resumeData as Record<string, unknown>;
        const basics = resumeData.basics as Record<string, unknown> | undefined;
        if (basics?.headline) parts.push(`Headline: ${basics.headline}`);
        if (basics?.summary) parts.push(`Summary: ${basics.summary}`);
      }
    }
  }

  // Skills DNA
  const skillsData = await db
    .select()
    .from(skillsProfile)
    .where(eq(skillsProfile.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (skillsData?.skills && Array.isArray(skillsData.skills)) {
    const skillNames = skillsData.skills
      .slice(0, 20)
      .map((s: unknown) => {
        const skill = s as Record<string, unknown>;
        return `${skill.name} (${skill.level})`;
      })
      .join(", ");
    parts.push(`Skills: ${skillNames}`);
  }

  // Recent jobs applied to (context for target roles)
  const recentJobs = await db
    .select({ title: jobs.title, employer: jobs.employer })
    .from(jobs)
    .where(and(eq(jobs.userId, userId), eq(jobs.status, "applied")))
    .orderBy(desc(jobs.updatedAt))
    .limit(5);

  if (recentJobs.length > 0) {
    const jobTitles = recentJobs
      .map((j) => `${j.title} at ${j.employer}`)
      .join("; ");
    parts.push(`Recent applications: ${jobTitles}`);
  }

  return parts.join("\n").slice(0, 8000);
}

/**
 * Generate career progression graph with LLM.
 * Returns nodes (current, near-term, mid-term, aspirational) and edges with probabilities.
 */
export async function generateCareerGraph(
  userId: string,
): Promise<CareerGraph> {
  const cacheKey = `career-graph:${userId}`;
  const redis = getRedis();

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      console.info("[careerPathAgent] Cache hit for", userId);
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn("[careerPathAgent] Redis cache read failed:", err);
  }

  console.info("[careerPathAgent] Generating career graph for", userId);
  const profile = await buildUserProfile(userId);

  const prompt = `You are a career progression expert analyzing professional profiles.

Given this professional profile:
${profile}

Generate a career progression graph as structured JSON with nodes and edges.

Include the following nodes:
1. Current position (1 node) - based on the user's most recent role/CV
2. Near-term positions (3 nodes) - realistic roles achievable in 6-18 months
3. Mid-term positions (2 nodes) - roles achievable in 18-36 months
4. Aspirational position (1 node) - dream role achievable in 3-5 years

For each node, provide:
- Unique id (e.g., "data-analyst", "senior-data-engineer")
- Title (job title)
- Level (e.g., "Junior", "Mid", "Senior", "Lead", "Principal")
- Sector (e.g., "Tech", "Finance", "Healthcare")
- Average salary (annual, in USD)
- Required skills (list of key technical and soft skills)
- Time to reach (e.g., "current", "6-12 months", "2-3 years")
- isCurrentPosition (boolean)
- isTarget (boolean, true for aspirational)

For each edge (transition between nodes):
- from (node id)
- to (node id)
- probability (0-1, likelihood of successful transition)
- transition (brief description of what this career move entails)
- keySkillsToAcquire (optional, list of skills to learn)

Ensure the graph is realistic and based on typical career progressions in the user's field.`;

  let result: { nodes: CareerNode[]; edges: CareerEdge[] };

  try {
    const llm = new LlmService();
    result = await llm.callStructured<{ nodes: CareerNode[]; edges: CareerEdge[] }>(
      prompt,
      CAREER_GRAPH_SCHEMA,
    );

    if (!result.nodes || result.nodes.length === 0) {
      throw new Error("LLM returned empty career graph");
    }
  } catch (llmErr) {
    console.warn("[careerPathAgent] LLM failed, using demo graph:", llmErr);
    result = getDemoCareerGraph(profile);
  }

  const graph: CareerGraph = {
    nodes: result.nodes,
    edges: result.edges || [],
    generatedAt: new Date().toISOString(),
  };

  try {
    await redis.setEx(cacheKey, CAREER_GRAPH_CACHE_TTL, JSON.stringify(graph));
  } catch (err) {
    console.warn("[careerPathAgent] Redis cache write failed:", err);
  }

  console.info(
    `[careerPathAgent] Generated graph with ${graph.nodes.length} nodes, ${graph.edges.length} edges`,
  );
  return graph;
}

/**
 * Get detailed scenario analysis for a specific transition.
 * Includes gap skills, typical companies, salary range, and concrete actions.
 */
export async function getScenarioDetail(
  fromNodeId: string,
  toNodeId: string,
  userId: string,
): Promise<ScenarioDetail> {
  console.info(
    `[careerPathAgent] Generating scenario detail: ${fromNodeId} → ${toNodeId}`,
  );

  const graph = await generateCareerGraph(userId);
  const fromNode = graph.nodes.find((n) => n.id === fromNodeId);
  const toNode = graph.nodes.find((n) => n.id === toNodeId);
  const edge = graph.edges.find((e) => e.from === fromNodeId && e.to === toNodeId);

  if (!fromNode || !toNode) {
    throw new Error("Invalid transition: node not found in career graph");
  }

  const profile = await buildUserProfile(userId);

  const prompt = `You are a career transition expert providing detailed guidance.

User profile:
${profile}

Career transition:
From: ${fromNode.title} (${fromNode.level})
To: ${toNode.title} (${toNode.level})

Current skills required for origin role: ${fromNode.requiredSkills.join(", ")}
Skills required for target role: ${toNode.requiredSkills.join(", ")}

Provide a detailed transition scenario in structured JSON format with:

1. estimatedDuration: realistic timeframe (e.g., "12-18 months")
2. targetSalaryRange: {min, max} in USD annual
3. gapSkills: array of skills to acquire, each with:
   - skill name
   - currentLevel (if the user has it, otherwise omit)
   - requiredLevel (e.g., "Intermediate", "Advanced")
   - resources: array of learning resources (courses, certifications, projects, books)
     Each resource: {title, type, url (optional), estimatedHours (optional)}
4. typicalCompanies: 5-7 companies that frequently hire for the target role
   Each: {name, sector, hiringFrequency ("low"|"medium"|"high")}
5. concreteActions: 3-5 specific actions to take in the next 30 days
   Each: {action, deadline (e.g., "30 days"), priority ("high"|"medium"|"low")}
6. transitionNarrative: 2-3 paragraph narrative explaining the transition path,
   key challenges, and success factors.

Be specific and actionable. Base recommendations on current industry trends.`;

  const llm = new LlmService();
  const result = await llm.callStructured<Omit<ScenarioDetail, "fromNode" | "toNode" | "probability">>(
    prompt,
    SCENARIO_DETAIL_SCHEMA,
  );

  const scenario: ScenarioDetail = {
    fromNode,
    toNode,
    probability: edge?.probability ?? 0.5,
    estimatedDuration: result.estimatedDuration,
    targetSalaryRange: result.targetSalaryRange,
    gapSkills: result.gapSkills,
    typicalCompanies: result.typicalCompanies,
    concreteActions: result.concreteActions,
    transitionNarrative: result.transitionNarrative,
  };

  return scenario;
}
