import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Filter,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Terminal,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { LogEntry, LogLevel, LogsQuery } from "@shared/types/monitoring";

type PageTab = "live" | "search" | "analytics";

const API_BASE = "/api";

const LOG_LEVELS: LogLevel[] = ["error", "warn", "info", "debug"];

const LEVEL_CONFIG: Record<LogLevel, { label: string; color: string; dotColor: string; bg: string }> = {
  error: { label: "ERREUR", color: "text-red-400", dotColor: "bg-red-400", bg: "bg-red-500/10 border-red-500/20" },
  warn: { label: "ALERTE", color: "text-amber-400", dotColor: "bg-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  info: { label: "INFO", color: "text-blue-400", dotColor: "bg-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  debug: { label: "DEBUG", color: "text-gray-500", dotColor: "bg-gray-500", bg: "bg-gray-500/10 border-gray-500/20" },
};

export function LogsPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("live");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [services, setServices] = useState<string[]>([]);
  const [filters, setFilters] = useState<LogsQuery>({
    level: undefined,
    service: undefined,
    search: "",
    limit: 200,
  });
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [searchFilters, setSearchFilters] = useState<LogsQuery>({
    level: undefined,
    service: undefined,
    search: "",
    from: "",
    to: "",
    limit: 500,
  });
  const [searchResults, setSearchResults] = useState<LogEntry[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.level) params.append("level", filters.level);
      if (filters.service) params.append("service", filters.service);
      if (filters.search) params.append("search", filters.search);
      if (filters.limit) params.append("limit", filters.limit.toString());

      const res = await fetch(`${API_BASE}/logs?${params}`);
      const data = await res.json();
      if (data.ok) {
        setLogs(data.data.logs);
      }
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchServices = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/logs/services`);
      const data = await res.json();
      if (data.ok) {
        setServices(data.data.services);
      }
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    fetchServices();
    fetchLogs();
  }, [fetchServices, fetchLogs]);

  useEffect(() => {
    if (activeTab !== "live" || !autoScroll) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    pollRef.current = setInterval(fetchLogs, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeTab, autoScroll, fetchLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleExport = (format: "json" | "csv") => {
    const params = new URLSearchParams();
    if (filters.level) params.append("level", filters.level);
    if (filters.service) params.append("service", filters.service);
    if (filters.search) params.append("search", filters.search);
    params.append("format", format);
    window.open(`${API_BASE}/logs/export?${params}`, "_blank");
  };

  const handleSearch = useCallback(async () => {
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilters.level) params.append("level", searchFilters.level);
      if (searchFilters.service) params.append("service", searchFilters.service);
      if (searchFilters.search) params.append("search", searchFilters.search);
      if (searchFilters.from) params.append("from", searchFilters.from);
      if (searchFilters.to) params.append("to", searchFilters.to);
      if (searchFilters.limit) params.append("limit", searchFilters.limit.toString());

      const res = await fetch(`${API_BASE}/logs?${params}`);
      const data = await res.json();
      if (data.ok) {
        setSearchResults(data.data.logs);
      }
    } catch {
      /* noop */
    } finally {
      setSearchLoading(false);
    }
  }, [searchFilters]);

  const toggleExpanded = (logId: string) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  };

  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.level === "error").length;
    const warns = logs.filter((l) => l.level === "warn").length;
    const infos = logs.filter((l) => l.level === "info").length;
    const debugs = logs.filter((l) => l.level === "debug").length;
    const uniqueServices = new Set(logs.map((l) => l.service)).size;
    return { total, errors, warns, infos, debugs, uniqueServices };
  }, [logs]);

  const analyticsPerService = useMemo(() => {
    const map = new Map<string, { total: number; errors: number; warns: number; infos: number; debugs: number }>();
    for (const log of logs) {
      const entry = map.get(log.service) ?? { total: 0, errors: 0, warns: 0, infos: 0, debugs: 0 };
      entry.total++;
      if (log.level === "error") entry.errors++;
      else if (log.level === "warn") entry.warns++;
      else if (log.level === "info") entry.infos++;
      else entry.debugs++;
      map.set(log.service, entry);
    }
    return [...map.entries()]
      .map(([name, counts]) => ({ name, ...counts }))
      .sort((a, b) => b.total - a.total);
  }, [logs]);

  const renderLogLine = (log: LogEntry) => {
    const isExpanded = expandedLogs.has(log.id);
    const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;
    const cfg = LEVEL_CONFIG[log.level];

    return (
      <div key={log.id} className="group hover:bg-white/[0.02] rounded-md px-2 py-1 transition-colors">
        <div className="flex items-start gap-3">
          <span className="text-muted-foreground shrink-0 tabular-nums text-[11px]">
            {new Date(log.timestamp).toLocaleTimeString()}
          </span>
          <Badge className={cn("text-[9px] shrink-0 border font-semibold", cfg.bg, cfg.color)}>
            {cfg.label}
          </Badge>
          <span className="text-blue-400 shrink-0 text-[11px]">[{log.service}]</span>
          <span className="flex-1 text-foreground/90 text-[11px] break-all">{log.message}</span>
          {hasMetadata && (
            <button onClick={() => toggleExpanded(log.id)} className="text-muted-foreground hover:text-foreground shrink-0">
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
            </button>
          )}
        </div>
        {isExpanded && hasMetadata && (
          <div className="mt-1.5 ml-[120px] rounded-lg bg-muted/20 border border-border/30 p-3">
            <pre className="text-[10px] text-muted-foreground font-mono overflow-auto max-h-48 whitespace-pre-wrap">
              {JSON.stringify(log.metadata, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#E94560]" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/20">
              <Terminal className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Journal système</h1>
              <p className="text-xs text-muted-foreground">
                Logs applicatifs en temps réel, recherche et analyse
              </p>
            </div>
            {autoScroll && activeTab === "live" && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
                <Activity className="mr-1 h-3 w-3" />
                LIVE
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={fetchLogs}>
              <RefreshCw className="h-3.5 w-3.5" />
              Rafraîchir
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleExport("json")}>
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => handleExport("csv")}>
              <Download className="h-3.5 w-3.5" />
              CSV
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          {[
            { label: "Total logs", value: stats.total, icon: FileText, color: "text-foreground" },
            { label: "Erreurs", value: stats.errors, icon: AlertTriangle, color: stats.errors > 0 ? "text-red-400" : "text-muted-foreground" },
            { label: "Alertes", value: stats.warns, icon: Zap, color: stats.warns > 0 ? "text-amber-400" : "text-muted-foreground" },
            { label: "Info", value: stats.infos, icon: Activity, color: "text-blue-400" },
            { label: "Debug", value: stats.debugs, icon: Terminal, color: "text-gray-500" },
            { label: "Services", value: stats.uniqueServices, icon: BarChart3, color: "text-purple-400" },
          ].map((kpi) => (
            <div key={kpi.label} className="flex items-center gap-2">
              <kpi.icon className={cn("h-4 w-4", kpi.color)} />
              <div>
                <div className="text-sm font-bold tabular-nums">{kpi.value}</div>
                <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            {([
              { id: "live" as const, label: "Flux temps réel", icon: Terminal },
              { id: "search" as const, label: "Recherche avancée", icon: Search },
              { id: "analytics" as const, label: "Analytiques", icon: BarChart3 },
            ]).map((tab) => (
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

          {/* Live tab filters */}
          {activeTab === "live" && (
            <>
              <Select value={filters.level ?? "all"} onValueChange={(v) => setFilters({ ...filters, level: v === "all" ? undefined : (v as LogLevel) })}>
                <SelectTrigger className="h-8 w-[130px] text-xs bg-background text-foreground border-border/50">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border-border">
                  <SelectItem value="all">Tous niveaux</SelectItem>
                  {LOG_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{LEVEL_CONFIG[l].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.service ?? "all"} onValueChange={(v) => setFilters({ ...filters, service: v === "all" ? undefined : v })}>
                <SelectTrigger className="h-8 w-[160px] text-xs bg-background text-foreground border-border/50">
                  <SelectValue placeholder="Service" />
                </SelectTrigger>
                <SelectContent className="bg-background text-foreground border-border">
                  <SelectItem value="all">Tous services</SelectItem>
                  {services.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[140px] max-w-xs">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                <input
                  type="text"
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="Filtrer les messages..."
                  className="h-8 w-full rounded-lg border border-border/50 bg-background pl-9 pr-8 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                />
                {filters.search && (
                  <button onClick={() => setFilters({ ...filters, search: "" })} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <XCircle className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <Button
                size="sm"
                variant={autoScroll ? "default" : "outline"}
                className={cn("h-8 text-xs gap-1.5", autoScroll && "bg-emerald-600 hover:bg-emerald-700 text-white")}
                onClick={() => setAutoScroll(!autoScroll)}
              >
                {autoScroll ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                {autoScroll ? "Live" : "En pause"}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══ LIVE TAB ═══ */}
        {activeTab === "live" && (
          <div className="p-4">
            <div
              ref={containerRef}
              className="rounded-xl border border-border/50 bg-black/30 overflow-hidden"
            >
              <div className="max-h-[calc(100vh-340px)] overflow-y-auto p-3 font-mono text-xs space-y-0.5">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Terminal className="h-10 w-10 opacity-30 mb-3" />
                    <p className="text-sm font-medium">Aucun log trouvé</p>
                    <p className="text-xs mt-1">Modifiez les filtres ou attendez de nouveaux événements</p>
                  </div>
                ) : (
                  <>
                    {logs.map(renderLogLine)}
                    <div ref={logsEndRef} />
                  </>
                )}
              </div>
            </div>
            <div className="mt-2 text-center text-[10px] text-muted-foreground tabular-nums">
              {logs.length} log{logs.length !== 1 ? "s" : ""} affichés
              {autoScroll && " · Actualisation auto toutes les 5s"}
            </div>
          </div>
        )}

        {/* ═══ SEARCH TAB ═══ */}
        {activeTab === "search" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Search className="h-4 w-4 text-[#E94560]/80" />
              Recherche avancée
            </h2>

            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Niveau</label>
                  <Select value={searchFilters.level ?? "all"} onValueChange={(v) => setSearchFilters({ ...searchFilters, level: v === "all" ? undefined : (v as LogLevel) })}>
                    <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background text-foreground border-border">
                      <SelectItem value="all">Tous niveaux</SelectItem>
                      {LOG_LEVELS.map((l) => (
                        <SelectItem key={l} value={l}>{LEVEL_CONFIG[l].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Service</label>
                  <Select value={searchFilters.service ?? "all"} onValueChange={(v) => setSearchFilters({ ...searchFilters, service: v === "all" ? undefined : v })}>
                    <SelectTrigger className="h-8 text-xs bg-background text-foreground border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background text-foreground border-border">
                      <SelectItem value="all">Tous services</SelectItem>
                      {services.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Date début</label>
                  <input
                    type="datetime-local"
                    value={searchFilters.from || ""}
                    onChange={(e) => setSearchFilters({ ...searchFilters, from: e.target.value })}
                    className="h-8 w-full rounded-lg border border-border/50 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Date fin</label>
                  <input
                    type="datetime-local"
                    value={searchFilters.to || ""}
                    onChange={(e) => setSearchFilters({ ...searchFilters, to: e.target.value })}
                    className="h-8 w-full rounded-lg border border-border/50 bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    value={searchFilters.search || ""}
                    onChange={(e) => setSearchFilters({ ...searchFilters, search: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Rechercher dans les messages (Entrée pour lancer)..."
                    className="h-9 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-9 text-xs gap-1.5 bg-[#E94560] hover:bg-[#D63B54] text-white"
                  onClick={handleSearch}
                  disabled={searchLoading}
                >
                  {searchLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Rechercher
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-xs gap-1.5"
                  onClick={() => {
                    setSearchFilters({ level: undefined, service: undefined, search: "", from: "", to: "", limit: 500 });
                    setSearchResults([]);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Réinitialiser
                </Button>
              </div>
            </div>

            {/* Results */}
            {searchResults.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-black/30 overflow-hidden">
                <div className="max-h-[50vh] overflow-y-auto p-3 font-mono text-xs space-y-0.5">
                  {searchResults.map(renderLogLine)}
                </div>
              </div>
            )}
            {searchResults.length > 0 && (
              <div className="text-center text-[10px] text-muted-foreground tabular-nums">
                {searchResults.length} résultat{searchResults.length !== 1 ? "s" : ""}
              </div>
            )}
            {searchResults.length === 0 && !searchLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Search className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm font-medium">Lancez une recherche</p>
                <p className="text-xs mt-1">Utilisez les filtres ci-dessus pour trouver des logs spécifiques</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === "analytics" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#E94560]/80" />
              Analytiques des logs
            </h2>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total logs", value: stats.total, gradient: "from-blue-500/20 to-blue-600/5 border-blue-500/20", icon: FileText, iconColor: "text-blue-400" },
                { label: "Erreurs", value: stats.errors, gradient: "from-red-500/20 to-red-600/5 border-red-500/20", icon: AlertTriangle, iconColor: "text-red-400" },
                { label: "Alertes", value: stats.warns, gradient: "from-amber-500/20 to-amber-600/5 border-amber-500/20", icon: Zap, iconColor: "text-amber-400" },
                { label: "Services", value: stats.uniqueServices, gradient: "from-purple-500/20 to-purple-600/5 border-purple-500/20", icon: BarChart3, iconColor: "text-purple-400" },
              ].map((card) => (
                <div key={card.label} className={cn("rounded-xl border bg-gradient-to-br p-4 space-y-2", card.gradient)}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                    <card.icon className={cn("h-4 w-4", card.iconColor)} />
                  </div>
                  <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                </div>
              ))}
            </div>

            {/* Level distribution bars */}
            <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
              <h3 className="text-sm font-semibold">Répartition par niveau</h3>
              <div className="space-y-3">
                {LOG_LEVELS.map((level) => {
                  const count = level === "error" ? stats.errors : level === "warn" ? stats.warns : level === "info" ? stats.infos : stats.debugs;
                  const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  const cfg = LEVEL_CONFIG[level];
                  return (
                    <div key={level} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={cn("h-2 w-2 rounded-full", cfg.dotColor)} />
                          <span className="font-medium">{cfg.label}</span>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <span className="tabular-nums">{count}</span>
                          <span className="tabular-nums">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", cfg.dotColor)}
                          style={{ width: `${Math.max(pct, count > 0 ? 2 : 0)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-service table */}
            {analyticsPerService.length > 0 && (
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/20">
                        <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">Service</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Total</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-red-400">Erreurs</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-amber-400">Alertes</th>
                        <th className="text-right px-3 py-2.5 font-semibold text-blue-400">Info</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Debug</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analyticsPerService.map((svc) => (
                        <tr key={svc.name} className="border-b border-border/30 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2 font-medium">{svc.name}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{svc.total}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-red-400">{svc.errors || "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-400">{svc.warns || "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-blue-400">{svc.infos || "—"}</td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-500">{svc.debugs || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {analyticsPerService.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <BarChart3 className="h-10 w-10 opacity-20 mb-3" />
                <p className="text-sm font-medium">Pas de données</p>
                <p className="text-xs mt-1">Les analytiques apparaîtront quand des logs seront disponibles</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
