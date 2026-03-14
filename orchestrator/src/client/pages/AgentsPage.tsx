import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  BarChart3,
  Bot,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Settings,
  Square,
  Terminal,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type AgentStatus = "idle" | "running" | "error" | "disabled";
type LogLevel = "info" | "warn" | "error" | "debug";
type PageTab = "overview" | "logs" | "performance";

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

const STATUS_CONFIG: Record<
  AgentStatus,
  { label: string; color: string; dotColor: string; icon: React.ElementType }
> = {
  idle: {
    label: "En veille",
    color: "text-gray-400 bg-gray-500/10 border-gray-500/20",
    dotColor: "bg-gray-400",
    icon: CheckCircle,
  },
  running: {
    label: "Actif",
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    dotColor: "bg-emerald-400 animate-pulse",
    icon: Activity,
  },
  error: {
    label: "Erreur",
    color: "text-red-400 bg-red-500/10 border-red-500/20",
    dotColor: "bg-red-400",
    icon: XCircle,
  },
  disabled: {
    label: "Désactivé",
    color: "text-muted-foreground bg-muted/30 border-border/50",
    dotColor: "bg-muted-foreground",
    icon: AlertCircle,
  },
};

function formatTimeAgo(date?: string): string {
  if (!date) return "Jamais";
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PageTab>("overview");
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [logFilter, setLogFilter] = useState<LogLevel | "all">("all");
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? null,
    [agents, selectedAgentId],
  );

  const fetchAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/agents");
      const data = await response.json();
      setAgents(data);
    } catch {
      /* noop */
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(
    async (agentId: string) => {
      try {
        const url =
          logFilter === "all"
            ? `/api/agents/${agentId}/logs?limit=100`
            : `/api/agents/${agentId}/logs?limit=100&level=${logFilter}`;
        const response = await fetch(url);
        const data = await response.json();
        setLogs(data.logs || []);
      } catch {
        /* noop */
      }
    },
    [logFilter],
  );

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchAgents();
      if (activeTab === "logs" && selectedAgentId) {
        fetchLogs(selectedAgentId);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isLive, fetchAgents, activeTab, selectedAgentId, fetchLogs]);

  useEffect(() => {
    if (activeTab === "logs" && selectedAgentId) {
      fetchLogs(selectedAgentId);
    }
  }, [activeTab, selectedAgentId, fetchLogs]);

  const runAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/run`, { method: "POST" });
      fetchAgents();
    } catch {
      /* noop */
    }
  };

  const stopAgent = async (agentId: string) => {
    try {
      await fetch(`/api/agents/${agentId}/stop`, { method: "POST" });
      fetchAgents();
    } catch {
      /* noop */
    }
  };

  const toggleAgent = async (agentId: string, enabled: boolean) => {
    try {
      const endpoint = enabled ? "enable" : "disable";
      await fetch(`/api/agents/${agentId}/${endpoint}`, { method: "POST" });
      fetchAgents();
    } catch {
      /* noop */
    }
  };

  const filteredAgents = useMemo(() => {
    if (!searchQuery.trim()) return agents;
    const q = searchQuery.toLowerCase();
    return agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [agents, searchQuery]);

  const globalMetrics = useMemo(() => {
    const total = agents.length;
    const active = agents.filter((a) => a.status === "running").length;
    const errors = agents.filter((a) => a.status === "error").length;
    const totalRuns = agents.reduce((s, a) => s + a.metrics.totalRuns, 0);
    const totalSuccess = agents.reduce(
      (s, a) => s + a.metrics.successfulRuns,
      0,
    );
    const totalFailed = agents.reduce((s, a) => s + a.metrics.failedRuns, 0);
    const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;
    const avgJph =
      agents.length > 0
        ? agents.reduce((s, a) => s + (a.metrics.jobsPerHour ?? 0), 0) /
          agents.length
        : 0;
    return {
      total,
      active,
      errors,
      totalRuns,
      totalSuccess,
      totalFailed,
      successRate,
      avgJph,
    };
  }, [agents]);

  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#E94560]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E94560]/20 to-[#E94560]/5 border border-[#E94560]/20">
              <Bot className="h-5 w-5 text-[#E94560]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Agents IA</h1>
              <p className="text-xs text-muted-foreground">
                Orchestration et monitoring des agents automatiques
              </p>
            </div>
            {isLive && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <Activity className="mr-1 h-3 w-3" />
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsLive(!isLive)}
              className="h-8 text-xs gap-1.5"
            >
              {isLive ? "Pause" : "Reprendre"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchAgents}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6 mt-4">
          {[
            {
              label: "Agents",
              value: globalMetrics.total,
              icon: Bot,
              color: "text-[#E94560]",
            },
            {
              label: "Actifs",
              value: globalMetrics.active,
              icon: Zap,
              color: "text-emerald-400",
            },
            {
              label: "Erreurs",
              value: globalMetrics.errors,
              icon: AlertCircle,
              color: "text-red-400",
            },
            {
              label: "Exécutions",
              value: globalMetrics.totalRuns,
              icon: Play,
              color: "text-blue-400",
            },
            {
              label: "Taux réussite",
              value: `${globalMetrics.successRate.toFixed(0)}%`,
              icon: TrendingUp,
              color: "text-emerald-400",
            },
            {
              label: "Moy. jobs/h",
              value: globalMetrics.avgJph.toFixed(1),
              icon: BarChart3,
              color: "text-purple-400",
            },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-2">
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              <div>
                <div className="text-sm font-bold tabular-nums">
                  {kpi.value}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {kpi.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            {(
              [
                { id: "overview", label: "Vue d'ensemble", icon: Bot },
                { id: "logs", label: "Journal", icon: Terminal },
                { id: "performance", label: "Performance", icon: BarChart3 },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-[#E94560]/10 text-[#E94560] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" && (
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Rechercher un agent..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              />
            </div>
          )}

          {activeTab === "logs" && (
            <Select
              value={selectedAgentId ?? ""}
              onValueChange={(v) => setSelectedAgentId(v)}
            >
              <SelectTrigger className="h-8 w-[180px] rounded-lg border border-border/50 bg-background text-foreground text-xs">
                <SelectValue placeholder="Sélectionner un agent" />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-border">
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {activeTab === "logs" && (
            <Select
              value={logFilter}
              onValueChange={(v) => setLogFilter(v as LogLevel | "all")}
            >
              <SelectTrigger className="h-8 w-[130px] rounded-lg border border-border/50 bg-background text-foreground text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background text-foreground border-border">
                <SelectItem value="all">Tous les niveaux</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAgents.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Bot className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">Aucun agent trouvé</p>
              </div>
            )}
            {filteredAgents.map((agent) => {
              const statusCfg = STATUS_CONFIG[agent.status];
              const successRate =
                agent.metrics.totalRuns > 0
                  ? (agent.metrics.successfulRuns / agent.metrics.totalRuns) *
                    100
                  : 0;

              return (
                <div
                  key={agent.id}
                  className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border/70 transition-all overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                            agent.status === "running"
                              ? "bg-emerald-500/10 border-emerald-500/20"
                              : agent.status === "error"
                                ? "bg-red-500/10 border-red-500/20"
                                : "bg-muted/30 border-border/50",
                          )}
                        >
                          <Bot
                            className={cn(
                              "h-5 w-5",
                              agent.status === "running"
                                ? "text-emerald-400"
                                : agent.status === "error"
                                  ? "text-red-400"
                                  : "text-muted-foreground",
                            )}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm">
                            {agent.name}
                          </h3>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "shrink-0 text-[10px] border",
                          statusCfg.color,
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full mr-1",
                            statusCfg.dotColor,
                          )}
                        />
                        {statusCfg.label}
                      </Badge>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-4 gap-1 bg-muted/20 border-y border-border/30 px-4 py-2.5">
                    {[
                      {
                        label: "Exécutions",
                        val: agent.metrics.totalRuns,
                        color: "",
                      },
                      {
                        label: "Réussies",
                        val: agent.metrics.successfulRuns,
                        color: "text-emerald-400",
                      },
                      {
                        label: "Échouées",
                        val: agent.metrics.failedRuns,
                        color:
                          agent.metrics.failedRuns > 0 ? "text-red-400" : "",
                      },
                      {
                        label: "Jobs/h",
                        val: Math.round(agent.metrics.jobsPerHour ?? 0),
                        color: "text-blue-400",
                      },
                    ].map((m) => (
                      <div key={m.label} className="text-center">
                        <div
                          className={cn(
                            "text-sm font-bold tabular-nums",
                            m.color,
                          )}
                        >
                          {m.val}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          {m.label}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  <div className="px-4 pt-2.5">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                      <span>Taux de réussite</span>
                      <span className="font-medium tabular-nums">
                        {successRate.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${Math.max(successRate, agent.metrics.totalRuns > 0 ? 2 : 0)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Last run + actions */}
                  <div className="px-4 pt-2.5 pb-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      Dernière exécution :{" "}
                      {formatTimeAgo(agent.metrics.lastRunAt)}
                    </div>

                    <div className="flex items-center gap-2">
                      {agent.status === "running" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => stopAgent(agent.id)}
                          className="flex-1 h-8 text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          <Square className="h-3 w-3" />
                          Arrêter
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => runAgent(agent.id)}
                          disabled={agent.status === "disabled"}
                          className="flex-1 h-8 text-xs gap-1.5 bg-[#E94560] hover:bg-[#D63B54] text-white"
                        >
                          <Play className="h-3 w-3" />
                          Exécuter
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedAgentId(agent.id);
                          setConfigModalOpen(true);
                        }}
                        title="Configuration"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setSelectedAgentId(agent.id);
                          setActiveTab("logs");
                        }}
                        title="Logs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Toggle */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border/30 bg-muted/10">
                    <Label
                      htmlFor={`enable-${agent.id}`}
                      className="text-xs text-muted-foreground"
                    >
                      Activé
                    </Label>
                    <Switch
                      id={`enable-${agent.id}`}
                      checked={agent.config.enabled as boolean}
                      onCheckedChange={(checked) =>
                        toggleAgent(agent.id, checked)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── LOGS TAB ─── */}
        {activeTab === "logs" && (
          <div className="space-y-4">
            {!selectedAgentId ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Terminal className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">
                  Sélectionnez un agent pour voir ses logs
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    Journal de {selectedAgent?.name}
                  </h2>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1"
                    onClick={() => fetchLogs(selectedAgentId)}
                  >
                    <RefreshCw className="h-3 w-3" />
                    Rafraîchir
                  </Button>
                </div>

                <div className="rounded-xl border border-border/50 bg-black/40 overflow-hidden">
                  <div className="max-h-[60vh] overflow-y-auto p-4 font-mono text-xs space-y-0.5">
                    {filteredLogs.length === 0 ? (
                      <div className="text-center text-muted-foreground py-12">
                        <Terminal className="h-8 w-8 opacity-30 mx-auto mb-2" />
                        <p>Aucun log disponible</p>
                      </div>
                    ) : (
                      filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className={cn(
                            "flex gap-3 py-1 px-2 rounded hover:bg-white/5 transition-colors",
                            log.level === "error" && "bg-red-500/5",
                            log.level === "warn" && "bg-amber-500/5",
                          )}
                        >
                          <span className="text-muted-foreground shrink-0 tabular-nums">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 w-14 text-right",
                              log.level === "info" && "text-blue-400",
                              log.level === "warn" && "text-amber-400",
                              log.level === "error" && "text-red-400",
                              log.level === "debug" && "text-gray-500",
                            )}
                          >
                            [{log.level.toUpperCase()}]
                          </span>
                          <span className="text-foreground/90 break-all">
                            {log.message}
                          </span>
                          {log.metadata && (
                            <span className="text-muted-foreground/50 shrink-0 truncate max-w-[200px]">
                              {JSON.stringify(log.metadata)}
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── PERFORMANCE TAB ─── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#E94560]/80" />
              Performance des agents
            </h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: "Exécutions totales",
                  value: globalMetrics.totalRuns,
                  gradient:
                    "from-blue-500/20 to-blue-600/5 border-blue-500/20",
                  icon: Play,
                  iconColor: "text-blue-400",
                },
                {
                  label: "Taux de réussite",
                  value: `${globalMetrics.successRate.toFixed(0)}%`,
                  gradient:
                    "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
                  icon: TrendingUp,
                  iconColor: "text-emerald-400",
                },
                {
                  label: "Échecs",
                  value: globalMetrics.totalFailed,
                  gradient: "from-red-500/20 to-red-600/5 border-red-500/20",
                  icon: XCircle,
                  iconColor: "text-red-400",
                },
                {
                  label: "Moy. jobs/h",
                  value: globalMetrics.avgJph.toFixed(1),
                  gradient:
                    "from-purple-500/20 to-purple-600/5 border-purple-500/20",
                  icon: BarChart3,
                  iconColor: "text-purple-400",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className={cn(
                    "rounded-xl border bg-gradient-to-br p-4 space-y-2",
                    card.gradient,
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {card.label}
                    </span>
                    <card.icon className={cn("h-4 w-4", card.iconColor)} />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Per-agent bars */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold">
                Détail par agent
              </h3>
              <div className="space-y-3">
                {agents.map((agent) => {
                  const maxRuns = Math.max(
                    ...agents.map((a) => a.metrics.totalRuns),
                    1,
                  );
                  const pct =
                    (agent.metrics.totalRuns / maxRuns) * 100;
                  const successPct =
                    agent.metrics.totalRuns > 0
                      ? (agent.metrics.successfulRuns /
                          agent.metrics.totalRuns) *
                        100
                      : 0;

                  return (
                    <div key={agent.id} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              STATUS_CONFIG[agent.status].dotColor,
                            )}
                          />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="tabular-nums">
                            {agent.metrics.totalRuns} runs
                          </span>
                          <span className="tabular-nums text-emerald-400">
                            {successPct.toFixed(0)}%
                          </span>
                          <span className="tabular-nums">
                            {Math.round(agent.metrics.jobsPerHour ?? 0)} j/h
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.max(pct, agent.metrics.totalRuns > 0 ? 4 : 0)}%`,
                            background: `linear-gradient(90deg, #10b981 ${successPct}%, #ef4444 ${successPct}%)`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent comparison table */}
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/50 bg-muted/20">
                      <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">
                        Agent
                      </th>
                      <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">
                        Statut
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">
                        Exécutions
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">
                        Réussies
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">
                        Échouées
                      </th>
                      <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">
                        Taux
                      </th>
                      <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground">
                        Jobs/h
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((agent) => {
                      const rate =
                        agent.metrics.totalRuns > 0
                          ? (
                              (agent.metrics.successfulRuns /
                                agent.metrics.totalRuns) *
                              100
                            ).toFixed(0)
                          : "—";
                      const cfg = STATUS_CONFIG[agent.status];
                      return (
                        <tr
                          key={agent.id}
                          className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-2.5 font-medium">
                            {agent.name}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              className={cn(
                                "text-[9px] border",
                                cfg.color,
                              )}
                            >
                              {cfg.label}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {agent.metrics.totalRuns}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-400">
                            {agent.metrics.successfulRuns}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-red-400">
                            {agent.metrics.failedRuns}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums">
                            {rate}
                            {rate !== "—" && "%"}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums">
                            {Math.round(agent.metrics.jobsPerHour ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Config Modal */}
      <Dialog open={configModalOpen} onOpenChange={setConfigModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" />
              Configuration — {selectedAgent?.name}
            </DialogTitle>
            <DialogDescription>
              Paramètres de l'agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAgent && (
              <pre className="rounded-xl bg-muted/30 border border-border/50 p-4 text-xs overflow-auto max-h-96 font-mono">
                {JSON.stringify(selectedAgent.config, null, 2)}
              </pre>
            )}
            <p className="text-xs text-muted-foreground">
              Modification via l'API. Interface d'édition à venir.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
