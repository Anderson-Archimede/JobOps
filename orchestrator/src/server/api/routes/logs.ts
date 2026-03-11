/**
 * Logs API Routes
 * Query, filter, and export application logs
 */

import { Router } from "express";
import fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import readline from "node:readline";
import path from "node:path";
import Papa from "papaparse";
import type { LogEntry, LogsQuery, LogsResponse, LogLevel } from "@shared/types/monitoring";
import { logger } from "../../logger";
import { nanoid } from "nanoid";
import { ok, fail, asyncRoute } from "../../infra/http";
import { toAppError, badRequest } from "../../infra/errors";

const router = Router();

const logsDir = path.join(process.cwd(), "logs");
const combinedLogFile = path.join(logsDir, "combined.log");

/// Helper: Parse log file and filter
async function queryLogs(query: LogsQuery): Promise<LogsResponse> {
  try {
    const fileStream = createReadStream(combinedLogFile, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let logs: LogEntry[] = [];
    let index = 0;

    const fromDate = query.from ? new Date(query.from).getTime() : undefined;
    const toDate = query.to ? new Date(query.to).getTime() : undefined;
    const searchLower = query.search?.toLowerCase();

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        const logTime = new Date(parsed.timestamp).getTime();
        
        // time filters
        if (fromDate && logTime < fromDate) continue;
        if (toDate && logTime > toDate) continue;

        // basic level & service filters
        if (query.level && parsed.level !== query.level) continue;
        if (query.service && parsed.service !== query.service) continue;

        const serviceStr = parsed.service || "unknown";
        const messageStr = parsed.message || "";

        // search filter
        if (searchLower) {
          if (!messageStr.toLowerCase().includes(searchLower) && !serviceStr.toLowerCase().includes(searchLower)) {
            continue;
          }
        }

        logs.push({
          id: `log-${index}`,
          timestamp: parsed.timestamp,
          level: parsed.level as LogLevel,
          message: messageStr,
          service: serviceStr,
          metadata: { ...parsed },
        });
      } catch {
        // ignore invalid JSON
      }
      index++;
    }

    // Sort newest first
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const total = logs.length;
    let startIndex = 0;
    if (query.cursor) {
      const cursorIndex = logs.findIndex((log) => log.id === query.cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const limit = query.limit || 100;
    const paginatedLogs = logs.slice(startIndex, startIndex + limit);

    const nextCursor =
      startIndex + limit < total ? paginatedLogs[paginatedLogs.length - 1]?.id : undefined;

    return {
      logs: paginatedLogs,
      nextCursor,
      total,
    };
  } catch (error) {
    logger.error("Failed to query logs", { error });
    return {
      logs: [],
      total: 0,
    };
  }
}

// GET /api/logs
router.get(
  "/",
  asyncRoute(async (req, res) => {
    try {
      const query: LogsQuery = {
        level: req.query.level as LogLevel | undefined,
        service: req.query.service as string | undefined,
        search: req.query.search as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        cursor: req.query.cursor as string | undefined,
      };

      const result = await queryLogs(query);

      ok(res, result);
    } catch (error) {
      logger.error("Failed to fetch logs", { error });
      fail(res, toAppError(error));
    }
  })
);

// GET /api/logs/export
router.get(
  "/export",
  asyncRoute(async (req, res) => {
    try {
      const format = (req.query.format as string) || "json";
      const query: LogsQuery = {
        level: req.query.level as LogLevel | undefined,
        service: req.query.service as string | undefined,
        search: req.query.search as string | undefined,
        from: req.query.from as string | undefined,
        to: req.query.to as string | undefined,
        limit: 10000, // Max export limit
      };

      const result = await queryLogs(query);

      if (format === "csv") {
        const csvData = result.logs.map((log) => ({
          timestamp: log.timestamp,
          level: log.level,
          service: log.service,
          message: log.message,
          metadata: JSON.stringify(log.metadata),
        }));

        const csv = Papa.unparse(csvData);

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="logs-${Date.now()}.csv"`
        );
        res.send(csv);
        return;
      }

      // JSON format (default)
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="logs-${Date.now()}.json"`
      );
      res.json(result.logs);
    } catch (error) {
      logger.error("Failed to export logs", { error });
      fail(res, toAppError(error));
    }
  })
);

// GET /api/logs/services - Get list of available services
router.get(
  "/services",
  asyncRoute(async (_req, res) => {
    try {
      const fileStream = createReadStream(combinedLogFile, { encoding: "utf-8" });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      const services = new Set<string>();

      for await (const line of rl) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.service) {
            services.add(parsed.service);
          }
        } catch {
          // Ignore invalid JSON
        }
      }

      ok(res, { services: Array.from(services).sort() });
    } catch (error) {
      logger.error("Failed to get services", { error });
      ok(res, { services: [] });
    }
  })
);

export { router as logsRouter };
