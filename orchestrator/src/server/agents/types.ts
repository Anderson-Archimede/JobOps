/**
 * Agent Interface and Types
 */

export type AgentStatus = 'idle' | 'running' | 'error' | 'disabled';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface AgentConfig {
  enabled: boolean;
  schedule?: string; // Cron expression
  [key: string]: unknown; // Agent-specific config
}

export interface AgentLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface AgentRun {
  id: string;
  agentId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  error?: string;
  metrics?: {
    jobsProcessed?: number;
    successCount?: number;
    errorCount?: number;
    duration?: number;
  };
}

export interface AgentMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: Date;
  averageDuration?: number;
  jobsPerHour?: number;
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  config: AgentConfig;
  metrics: AgentMetrics;
  currentRun?: AgentRun;
  lastRun?: AgentRun;
}

export interface IAgent {
  id: string;
  name: string;
  description: string;
  
  // Core methods
  run(): Promise<AgentRun>;
  stop(): Promise<void>;
  getStatus(): AgentStatus;
  getConfig(): AgentConfig;
  updateConfig(config: Partial<AgentConfig>): Promise<void>;
  
  // Monitoring
  getMetrics(): AgentMetrics;
  getLogs(limit?: number, offset?: number, level?: LogLevel): Promise<AgentLog[]>;
  getCurrentRun?(): AgentRun | undefined;
  getLastRun?(): AgentRun | undefined;
  getRuns?(limit?: number): AgentRun[];
  
  // Lifecycle
  enable(): Promise<void>;
  disable(): Promise<void>;
}

export interface AgentRunResult {
  success: boolean;
  runId: string;
  metrics?: {
    jobsProcessed?: number;
    successCount?: number;
    errorCount?: number;
  };
  error?: string;
}
