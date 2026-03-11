/**
 * Monitoring API Routes
 * System metrics, queue health, LLM performance, agent errors
 */

import { Router } from "express";
import os from "node:os";
import type {
  MonitoringMetrics,
  QueueMetrics,
  SystemMetrics,
  DBMetrics,
  AgentMetrics,
  LLMMetrics,
  Incident,
} from "@shared/types/monitoring";
import { queues } from "../../queues";
import { agentRegistry } from "../../agents/registry";
import { db } from "../../db";
import { logger } from "../../logger";
import { ok, fail, asyncRoute } from "../../infra/http";
import { toAppError } from "../../infra/errors";
import { setupSse, startSseHeartbeat, writeSseData } from "../../infra/sse";

const router = Router();

// Helper: Get queue metrics
async function getQueueMetrics(): Promise<QueueMetrics[]> {
  const queueNames = Object.keys(queues);
  const metrics: QueueMetrics[] = [];

  for (const name of queueNames) {
    const queue = queues[name as keyof typeof queues];
    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      const isPaused = await queue.isPaused();

      metrics.push({
        name,
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused: isPaused,
      });
    } catch (error) {
      logger.error(`Failed to get metrics for queue ${name}`, { error });
      metrics.push({
        name,
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0,
        delayed: 0,
        paused: false,
      });
    }
  }

  return metrics;
}

// Helper: Get system metrics
function getSystemMetrics(): SystemMetrics {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    cpu: {
      usage: Math.round(os.loadavg()[0] * 10) / 10, // 1-minute load average
      cores: os.cpus().length,
    },
    memory: {
      used: usedMemory,
      total: totalMemory,
      percentage: Math.round((usedMemory / totalMemory) * 100 * 10) / 10,
    },
    uptime: Math.floor(process.uptime()),
    nodeVersion: process.version,
  };
}

// Helper: Get database metrics (simplified)
function getDBMetrics(): DBMetrics {
  // Note: PostgreSQL connection pool metrics would require pg-pool
  // For now, return basic status
  return {
    connected: true,
    activeConnections: 1,
    idleConnections: 0,
    totalConnections: 1,
  };
}

// Helper: Get agent metrics (24h error rate)
function getAgentMetrics(): AgentMetrics[] {
  const agents = agentRegistry.getAll();
  const metrics: AgentMetrics[] = [];

  for (const agent of agents) {
    const runs = (agent as any).runs || [];
    const last24h = runs.filter((run: any) => {
      const runTime = new Date(run.startedAt).getTime();
      const now = Date.now();
      return now - runTime < 24 * 60 * 60 * 1000;
    });

    const totalRuns = last24h.length;
    const failedRuns = last24h.filter((r: any) => r.status === "failed").length;
    const errorRate = totalRuns > 0 ? (failedRuns / totalRuns) * 100 : 0;

    // Group by hour for timeline
    const hourlyData: Array<{ hour: number; errors: number; runs: number }> = [];
    for (let i = 0; i < 24; i++) {
      const hourStart = Date.now() - (24 - i) * 60 * 60 * 1000;
      const hourEnd = hourStart + 60 * 60 * 1000;

      const hourRuns = last24h.filter((r: any) => {
        const runTime = new Date(r.startedAt).getTime();
        return runTime >= hourStart && runTime < hourEnd;
      });

      const hourErrors = hourRuns.filter((r: any) => r.status === "failed").length;

      hourlyData.push({
        hour: i,
        errors: hourErrors,
        runs: hourRuns.length,
      });
    }

    metrics.push({
      agentId: agent.id,
      agentName: agent.name,
      errorRate: Math.round(errorRate * 10) / 10,
      totalRuns,
      failedRuns,
      last24h: hourlyData,
    });
  }

  return metrics;
}

// Helper: Get LLM metrics (mock for now)
function getLLMMetrics(): LLMMetrics[] {
  // TODO: Track actual LLM calls with latency
  // For now, return mock data
  return [
    {
      provider: "openai",
      avgLatencyMs: 1200,
      totalCalls: 145,
      errorRate: 2.1,
      last7Days: Array.from({ length: 7 }, (_, i) => ({
        date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        avgLatency: 1000 + Math.random() * 500,
        calls: 15 + Math.floor(Math.random() * 20),
      })),
    },
  ];
}

// Helper: Detect incidents (high error rates, failed queues, etc.)
function detectIncidents(
  queues: QueueMetrics[],
  agents: AgentMetrics[]
): Incident[] {
  const incidents: Incident[] = [];

  // Check queue failures
  for (const queue of queues) {
    const totalJobs = queue.completed + queue.failed;
    if (totalJobs > 0) {
      const failureRate = (queue.failed / totalJobs) * 100;
      if (failureRate > 10) {
        incidents.push({
          id: `queue-${queue.name}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          severity: failureRate > 50 ? "critical" : "warning",
          source: `queue:${queue.name}`,
          message: `High failure rate: ${Math.round(failureRate)}% (${queue.failed}/${totalJobs} jobs)`,
          resolved: false,
        });
      }
    }
  }

  // Check agent error rates
  for (const agent of agents) {
    if (agent.errorRate > 10) {
      incidents.push({
        id: `agent-${agent.agentId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: agent.errorRate > 50 ? "critical" : "warning",
        source: `agent:${agent.agentName}`,
        message: `High error rate: ${agent.errorRate}% (${agent.failedRuns}/${agent.totalRuns} runs)`,
        resolved: false,
      });
    }
  }

  return incidents;
}

// Helper: Gather all metrics
async function gatherMetrics(): Promise<MonitoringMetrics> {
  const [queueMetrics, agentMetrics] = await Promise.all([
    getQueueMetrics(),
    Promise.resolve(getAgentMetrics()),
  ]);

  const systemMetrics = getSystemMetrics();
  const dbMetrics = getDBMetrics();
  const llmMetrics = getLLMMetrics();
  const incidents = detectIncidents(queueMetrics, agentMetrics);

  return {
    queues: queueMetrics,
    llm: llmMetrics,
    agents: agentMetrics,
    system: systemMetrics,
    database: dbMetrics,
    incidents,
    timestamp: new Date().toISOString(),
  };
}

// GET /api/monitoring/metrics
router.get(
  "/metrics",
  asyncRoute(async (_req, res) => {
    try {
      const metrics = await gatherMetrics();
      ok(res, metrics);
    } catch (error) {
      logger.error("Failed to get monitoring metrics", { error });
      fail(res, toAppError(error));
    }
  })
);

// GET /api/monitoring/stream
router.get("/stream", (req, res) => {
  setupSse(res);
  const stopHeartbeat = startSseHeartbeat(res);

  let isClosed = false;

  const sendMetrics = async () => {
    if (isClosed) return;
    try {
      const metrics = await gatherMetrics();
      writeSseData(res, { type: "metrics", data: metrics });
    } catch (error) {
      logger.error("Failed to gather metrics for SSE stream", { error });
    }
  };

  req.on("close", () => {
    isClosed = true;
    stopHeartbeat();
    clearInterval(interval);
  });

  // initial burst
  void sendMetrics();

  // interval
  const interval = setInterval(() => void sendMetrics(), 30_000); // 30s update
});

export { router as monitoringRouter };
