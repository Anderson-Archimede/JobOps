/**
 * Base Agent Class
 */

import { createId } from '@paralleldrive/cuid2';
import type {
  IAgent,
  AgentStatus,
  AgentConfig,
  AgentRun,
  AgentMetrics,
  AgentLog,
  LogLevel,
  AgentRunResult,
} from './types';

export abstract class BaseAgent implements IAgent {
  public readonly id: string;
  public readonly name: string;
  public readonly description: string;
  
  protected status: AgentStatus = 'idle';
  protected config: AgentConfig;
  protected currentRun?: AgentRun;
  protected lastRun?: AgentRun;
  protected runs: AgentRun[] = [];
  protected logs: AgentLog[] = [];
  protected metrics: AgentMetrics = {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageDuration: 0,
    jobsPerHour: 0,
  };

  constructor(id: string, name: string, description: string, config: AgentConfig = { enabled: true }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.config = config;
  }

  // Abstract method to be implemented by each agent
  protected abstract execute(): Promise<AgentRunResult>;

  // Core methods
  async run(): Promise<AgentRun> {
    if (this.status === 'running') {
      throw new Error(`Agent ${this.name} is already running`);
    }

    if (!this.config.enabled) {
      throw new Error(`Agent ${this.name} is disabled`);
    }

    const run: AgentRun = {
      id: createId(),
      agentId: this.id,
      startedAt: new Date(),
      status: 'running',
    };

    this.currentRun = run;
    this.status = 'running';
    this.runs.unshift(run);
    
    this.addLog('info', `Agent ${this.name} started`);

    try {
      const result = await this.execute();
      
      run.completedAt = new Date();
      run.status = result.success ? 'completed' : 'failed';
      run.metrics = result.metrics;
      run.error = result.error;

      if (result.success) {
        this.metrics.successfulRuns++;
        this.addLog('info', `Agent ${this.name} completed successfully`, result.metrics);
      } else {
        this.metrics.failedRuns++;
        this.status = 'error';
        this.addLog('error', `Agent ${this.name} failed: ${result.error}`);
      }

      this.metrics.totalRuns++;
      this.lastRun = run;
      
      // Calculate average duration
      if (run.completedAt) {
        const duration = run.completedAt.getTime() - run.startedAt.getTime();
        this.metrics.averageDuration = this.metrics.averageDuration
          ? (this.metrics.averageDuration + duration) / 2
          : duration;
      }

      // Calculate jobs per hour
      if (result.metrics?.jobsProcessed) {
        const hours = (Date.now() - run.startedAt.getTime()) / (1000 * 60 * 60);
        this.metrics.jobsPerHour = result.metrics.jobsProcessed / hours;
      }

      this.metrics.lastRunAt = run.completedAt;

      if (this.status === 'running') {
        this.status = 'idle';
      }

      return run;
    } catch (error) {
      run.completedAt = new Date();
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.metrics.failedRuns++;
      this.metrics.totalRuns++;
      this.status = 'error';
      this.lastRun = run;
      
      this.addLog('error', `Agent ${this.name} crashed: ${run.error}`);
      
      throw error;
    } finally {
      this.currentRun = undefined;
      
      // Keep only last 20 runs
      if (this.runs.length > 20) {
        this.runs = this.runs.slice(0, 20);
      }
    }
  }

  async stop(): Promise<void> {
    if (this.status !== 'running' || !this.currentRun) {
      throw new Error(`Agent ${this.name} is not running`);
    }

    this.addLog('warn', `Agent ${this.name} stopping...`);
    
    // Mark current run as stopped
    if (this.currentRun) {
      this.currentRun.status = 'stopped';
      this.currentRun.completedAt = new Date();
    }
    
    this.status = 'idle';
    this.currentRun = undefined;
    
    this.addLog('info', `Agent ${this.name} stopped`);
  }

  getStatus(): AgentStatus {
    return this.status;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  async updateConfig(config: Partial<AgentConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    this.addLog('info', `Agent ${this.name} configuration updated`, config);
  }

  getMetrics(): AgentMetrics {
    return { ...this.metrics };
  }

  async getLogs(limit: number = 100, offset: number = 0, level?: LogLevel): Promise<AgentLog[]> {
    let filteredLogs = this.logs;
    
    if (level) {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }
    
    return filteredLogs.slice(offset, offset + limit);
  }

  async enable(): Promise<void> {
    this.config.enabled = true;
    this.status = 'idle';
    this.addLog('info', `Agent ${this.name} enabled`);
  }

  async disable(): Promise<void> {
    if (this.status === 'running') {
      await this.stop();
    }
    this.config.enabled = false;
    this.status = 'disabled';
    this.addLog('info', `Agent ${this.name} disabled`);
  }

  // Helper methods
  protected addLog(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const log: AgentLog = {
      id: createId(),
      timestamp: new Date(),
      level,
      message,
      metadata,
    };
    
    this.logs.unshift(log);
    
    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }
    
    // Also log to console
    console.log(`[${this.name}] [${level.toUpperCase()}] ${message}`, metadata || '');
  }

  // Public methods for external access
  getRuns(): AgentRun[] {
    return [...this.runs];
  }

  getCurrentRun(): AgentRun | undefined {
    return this.currentRun ? { ...this.currentRun } : undefined;
  }

  getLastRun(): AgentRun | undefined {
    return this.lastRun ? { ...this.lastRun } : undefined;
  }
}
