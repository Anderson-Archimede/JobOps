/**
 * Winston Logger Configuration
 * Structured logging with JSON format and multiple transports
 */

import winston from "winston";
import path from "node:path";
import fs from "node:fs";

const logsDir = path.join(process.cwd(), "logs");

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output (colorized)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let metaStr = "";
    if (Object.keys(meta).length > 0) {
      metaStr = ` ${JSON.stringify(meta)}`;
    }
    return `[${timestamp}] ${level} ${service ? `[${service}]` : ""}: ${message}${metaStr}`;
  })
);

// JSON format for file output (structured)
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "jobops" },
  transports: [
    // Console transport (development)
    new winston.transports.Console({
      format: consoleFormat,
    }),
    
    // File transport - All logs
    new winston.transports.File({
      filename: path.join(logsDir, "combined.log"),
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
    
    // File transport - Error logs only
    new winston.transports.File({
      filename: path.join(logsDir, "error.log"),
      level: "error",
      format: jsonFormat,
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Add request logger middleware
export function requestLogger(req: any, res: any, next: any) {
  const startTime = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - startTime;
    logger.info("HTTP request completed", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: duration,
      service: "api",
    });
  });
  
  next();
}

// Helper functions for different services
export const createServiceLogger = (serviceName: string) => {
  return {
    info: (message: string, meta?: any) => logger.info(message, { service: serviceName, ...meta }),
    warn: (message: string, meta?: any) => logger.warn(message, { service: serviceName, ...meta }),
    error: (message: string, meta?: any) => logger.error(message, { service: serviceName, ...meta }),
    debug: (message: string, meta?: any) => logger.debug(message, { service: serviceName, ...meta }),
  };
};

// Export log levels for TypeScript
export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: any;
}
