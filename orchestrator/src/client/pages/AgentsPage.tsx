/**
 * Agents Page - Agent Management & Monitoring
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bot,
  Play,
  Square,
  Settings,
  FileText,
  Activity,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// Types
type AgentStatus = 'idle' | 'running' | 'error' | 'disabled';
type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface AgentMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  lastRunAt?: string;
  averageDuration?: number;
  jobsPerHour?: number;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  config: Record<string, unknown>;
  metrics: AgentMetrics;
}

interface AgentLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [logFilter, setLogFilter] = useState<LogLevel | 'all'>('all');
  const [isLive, setIsLive] = useState(true);

  // Fetch agents
  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch('/api/agents');
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch logs
  const fetchLogs = useCallback(async (agentId: string) => {
    try {
      const url = logFilter === 'all'
        ? `/api/agents/${agentId}/logs?limit=100`
        : `/api/agents/${agentId}/logs?limit=100&level=${logFilter}`;
      
      const response = await fetch(url);
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, [logFilter]);

  // Initial fetch
  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      fetchAgents();
      if (logsModalOpen && selectedAgent) {
        fetchLogs(selectedAgent.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isLive, fetchAgents, logsModalOpen, selectedAgent, fetchLogs]);

  // Agent actions
  const runAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/run`, { method: 'POST' });
      fetchAgents();
    } catch (error) {
      console.error('Failed to run agent:', error);
    }
  };

  const stopAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/stop`, { method: 'POST' });
      fetchAgents();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  const toggleAgent = async (agentId: string, enabled: boolean) => {
    try {
      const endpoint = enabled ? 'enable' : 'disable';
      await fetch(`/api/agents/${agentId}/${endpoint}`, { method: 'POST' });
      fetchAgents();
    } catch (error) {
      console.error('Failed to toggle agent:', error);
    }
  };

  const updateConfig = async (agentId: string, config: Record<string, unknown>) => {
    try {
      await fetch(`/api/agents/${agentId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      fetchAgents();
      setConfigModalOpen(false);
    } catch (error) {
      console.error('Failed to update config:', error);
    }
  };

  // Status badge
  const getStatusBadge = (status: AgentStatus) => {
    const variants = {
      idle: { color: 'bg-gray-500/10 text-gray-400', icon: CheckCircle },
      running: { color: 'bg-green-500/10 text-green-400', icon: Activity },
      error: { color: 'bg-red-500/10 text-red-400', icon: XCircle },
      disabled: { color: 'bg-gray-500/10 text-gray-600', icon: AlertCircle },
    };

    const variant = variants[status];
    const Icon = variant.icon;

    return (
      <Badge className={variant.color}>
        <Icon className="mr-1 h-3 w-3" />
        {status.toUpperCase()}
      </Badge>
    );
  };

  // Format time
  const formatTimeAgo = (date?: string) => {
    if (!date) return 'Never';
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  // Log level badge
  const getLogLevelBadge = (level: LogLevel) => {
    const colors = {
      info: 'text-blue-400',
      warn: 'text-yellow-400',
      error: 'text-red-400',
      debug: 'text-gray-400',
    };

    return <span className={colors[level]}>[{level.toUpperCase()}]</span>;
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#E94560]" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Bot className="h-5 w-5 text-[#E94560]" />
            <h1 className="text-lg font-semibold">Agents</h1>
            {isLive && (
              <Badge className="bg-green-500/10 text-green-400 animate-pulse">
                <Activity className="mr-1 h-3 w-3" />
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsLive(!isLive)}
            >
              {isLive ? 'Pause' : 'Resume'} Auto-refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAgents}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="rounded-lg border border-border bg-card p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <h3 className="font-semibold">{agent.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {agent.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(agent.status)}
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-4 border-t border-b border-border py-3">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Runs</div>
                  <div className="text-lg font-bold">{agent.metrics.totalRuns}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Success</div>
                  <div className="text-lg font-bold text-green-400">
                    {agent.metrics.successfulRuns}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Jobs/h</div>
                  <div className="text-lg font-bold">
                    {Math.round(agent.metrics.jobsPerHour || 0)}
                  </div>
                </div>
              </div>

              {/* Last run */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last run: {formatTimeAgo(agent.metrics.lastRunAt)}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {agent.status === 'running' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => stopAgent(agent.id)}
                    className="flex-1"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => runAgent(agent.id)}
                    disabled={agent.status === 'disabled'}
                    className="flex-1 bg-[#E94560] hover:bg-[#E94560]/90"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Run
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAgent(agent);
                    setConfigModalOpen(true);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedAgent(agent);
                    fetchLogs(agent.id);
                    setLogsModalOpen(true);
                  }}
                >
                  <FileText className="h-4 w-4" />
                </Button>
              </div>

              {/* Enable/Disable Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <Label htmlFor={`enable-${agent.id}`} className="text-sm">
                  Enabled
                </Label>
                <Switch
                  id={`enable-${agent.id}`}
                  checked={agent.config.enabled as boolean}
                  onCheckedChange={(checked) => toggleAgent(agent.id, checked)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure {selectedAgent?.name}</DialogTitle>
            <DialogDescription>
              Update agent configuration settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAgent && (
              <pre className="rounded-lg bg-muted p-4 text-sm overflow-auto max-h-96">
                {JSON.stringify(selectedAgent.config, null, 2)}
              </pre>
            )}
            <p className="text-sm text-muted-foreground">
              Configuration UI coming soon. Use API for now.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Logs Modal */}
      <Dialog open={logsModalOpen} onOpenChange={setLogsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle>{selectedAgent?.name} Logs</DialogTitle>
                <DialogDescription>
                  Last 100 log entries
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={logFilter}
                  onChange={(e) => {
                    setLogFilter(e.target.value as LogLevel | 'all');
                    if (selectedAgent) fetchLogs(selectedAgent.id);
                  }}
                  className="rounded border border-border bg-background px-2 py-1 text-sm"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                  <option value="debug">Debug</option>
                </select>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => selectedAgent && fetchLogs(selectedAgent.id)}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto rounded-lg bg-black/50 p-4 font-mono text-xs space-y-1">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No logs available
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-gray-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  {getLogLevelBadge(log.level)}
                  <span className="text-gray-300">{log.message}</span>
                  {log.metadata && (
                    <span className="text-gray-600">
                      {JSON.stringify(log.metadata)}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
