/**
 * API routes for the orchestrator.
 */

import { Router } from "express";
import { agentsRouter } from "./routes/agents";
import { analyticsRouter } from "./routes/analytics";
import { authRouter } from "./routes/auth";
import { backupRouter } from "./routes/backup";
import { cvsRouter } from "./routes/cvs";
import { databaseRouter } from "./routes/database";
import { datasetsRouter } from "./routes/datasets";
import { demoRouter } from "./routes/demo";
import { ghostwriterRouter } from "./routes/ghostwriter";
import { healthRouter } from "./routes/health";
import { jobsRouter } from "./routes/jobs";
import { logsRouter } from "./routes/logs";
import { manualJobsRouter } from "./routes/manual-jobs";
import { monitoringRouter } from "./routes/monitoring";
import { notificationsRouter } from "./routes/notifications";
import { onboardingRouter } from "./routes/onboarding";
import { pipelineRouter } from "./routes/pipeline";
import { postApplicationProvidersRouter } from "./routes/post-application-providers";
import { postApplicationReviewRouter } from "./routes/post-application-review";
import { profileRouter } from "./routes/profile";
import { queuesRouter } from "./routes/queues";
import { searchRouter } from "./routes/search";
import { settingsRouter } from "./routes/settings";
import { tracerLinksRouter } from "./routes/tracer-links";
import { visaSponsorsRouter } from "./routes/visa-sponsors";
import { webhookRouter } from "./routes/webhook";
import { authenticateJWT } from "../middleware/authenticateJWT";

export const apiRouter = Router();

// Public routes (no authentication required)
apiRouter.use("/auth", authRouter);
apiRouter.use("/health", healthRouter);

// Protected routes (authentication required)
apiRouter.use("/agents", authenticateJWT, agentsRouter);
apiRouter.use("/analytics", authenticateJWT, analyticsRouter);
apiRouter.use("/cvs", authenticateJWT, cvsRouter);
apiRouter.use("/datasets", authenticateJWT, datasetsRouter);
apiRouter.use("/jobs", authenticateJWT, jobsRouter);
apiRouter.use("/jobs/:id/chat", authenticateJWT, ghostwriterRouter);
apiRouter.use("/demo", authenticateJWT, demoRouter);
apiRouter.use("/logs", authenticateJWT, logsRouter);
apiRouter.use("/monitoring", authenticateJWT, monitoringRouter);
apiRouter.use("/settings", authenticateJWT, settingsRouter);
apiRouter.use("/pipeline", authenticateJWT, pipelineRouter);
apiRouter.use("/post-application", authenticateJWT, postApplicationProvidersRouter);
apiRouter.use("/post-application", authenticateJWT, postApplicationReviewRouter);
apiRouter.use("/manual-jobs", authenticateJWT, manualJobsRouter);
apiRouter.use("/webhook", authenticateJWT, webhookRouter);
apiRouter.use("/profile", authenticateJWT, profileRouter);
apiRouter.use("/database", authenticateJWT, databaseRouter);
apiRouter.use("/visa-sponsors", authenticateJWT, visaSponsorsRouter);
apiRouter.use("/onboarding", authenticateJWT, onboardingRouter);
apiRouter.use("/backups", authenticateJWT, backupRouter);
apiRouter.use("/tracer-links", authenticateJWT, tracerLinksRouter);
apiRouter.use("/queues", authenticateJWT, queuesRouter);
apiRouter.use("/search", authenticateJWT, searchRouter);
apiRouter.use("/notifications", authenticateJWT, notificationsRouter);
