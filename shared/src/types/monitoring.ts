/**
 * Monitoring & Logs Types
 */

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  metadata?: Record<string, any>;
}

export interface LogsQuery {
  level?: LogLevel;
  service?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
}

export interface LogsResponse {
  logs: LogEntry[];
  nextCursor?: string;
  total: number;
}

export interface QueueMetrics {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface LLMMetrics {
  provider: string;
  avgLatencyMs: number;
  totalCalls: number;
  errorRate: number;
  last7Days: Array<{ date: string; avgLatency: number; calls: number }>;
}

export interface AgentMetrics {
  agentId: string;
  agentName: string;
  errorRate: number;
  totalRuns: number;
  failedRuns: number;
  last24h: Array<{ hour: number; errors: number; runs: number }>;
}

export interface SystemMetrics {
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    percentage: number;
  };
  uptime: number; // seconds
  nodeVersion: string;
}

export interface DBMetrics {
  connected: boolean;
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
}

export interface Incident {
  id: string;
  timestamp: string;
  severity: "critical" | "warning" | "info";
  source: string;
  message: string;
  resolved: boolean;
}

export interface MonitoringMetrics {
  queues: QueueMetrics[];
  llm: LLMMetrics[];
  agents: AgentMetrics[];
  system: SystemMetrics;
  database: DBMetrics;
  incidents: Incident[];
  timestamp: string;
}
