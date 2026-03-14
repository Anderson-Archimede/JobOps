/**
 * AI Insights Page - AI-Powered Job Market Intelligence
 * Modern analytics dashboard with Market Trends, Strategy, Career, and Predictive tabs
 */

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Lightbulb,
  TrendingUp,
  Target,
  Brain,
  BarChart3,
  Zap,
  RefreshCw,
  Search,
  ChevronRight,
  Sparkles,
  Briefcase,
  Calendar,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Loader2,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PageTab = "overview" | "market" | "strategy" | "career" | "analytics" | "predictive";

interface KpiResult {
  value: number;
  previousValue: number;
  delta: number;
  deltaLabel: string;
  trend: "up" | "down" | "stable";
}

interface SeekerDashboardKpis {
  activeApplications: KpiResult;
  avgPSOScore: KpiResult;
  responseRate: KpiResult;
  scheduledInterviews: KpiResult;
  computedAt: string;
}

interface MarketPulseSkill {
  name: string;
  tensionScore: number;
  trendDelta: number;
  salaryP50: number;
}

interface MarketPulse {
  skills: MarketPulseSkill[];
}

interface SeekerActivityItem {
  type: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface SeekerDashboardPayload {
  kpis: SeekerDashboardKpis;
  marketPulse: MarketPulse;
  momentumScore: number;
  recentActivity: SeekerActivityItem[];
  insightOfDay: string;
}

const TREND_ICONS = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  stable: Minus,
};

const TREND_COLORS = {
  up: "text-emerald-400",
  down: "text-red-400",
  stable: "text-muted-foreground",
};

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

async function fetchSeekerDashboard(): Promise<SeekerDashboardPayload> {
  const res = await fetch("/api/seeker/dashboard");
  const json = await res.json();
  if (!res.ok || !json.ok) {
    throw new Error(json?.error?.message ?? "Failed to load insights");
  }
  return json.data;
}

export const AIInsightsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["ai-insights", "seeker-dashboard"],
    queryFn: fetchSeekerDashboard,
    staleTime: 60_000,
  });

  const kpis = dashboard?.kpis;
  const marketPulse = dashboard?.marketPulse;
  const momentumScore = dashboard?.momentumScore ?? 0;
  const recentActivity = dashboard?.recentActivity ?? [];
  const insightOfDay = dashboard?.insightOfDay ?? "";

  const searchFilteredSkills = useMemo(() => {
    const skills = marketPulse?.skills ?? [];
    if (!searchQuery.trim()) return skills;
    const q = searchQuery.toLowerCase();
    return skills.filter((s) => s.name.toLowerCase().includes(q));
  }, [marketPulse?.skills, searchQuery]);

  const momentumLabel = useMemo(() => {
    if (momentumScore >= 80) return { label: "Excellent", color: "text-emerald-400", bg: "bg-emerald-500/10" };
    if (momentumScore >= 50) return { label: "Bon", color: "text-blue-400", bg: "bg-blue-500/10" };
    if (momentumScore >= 25) return { label: "En progression", color: "text-amber-400", bg: "bg-amber-500/10" };
    return { label: "À améliorer", color: "text-red-400", bg: "bg-red-500/10" };
  }, [momentumScore]);

  const strategyTips = useMemo(() => {
    const tips: string[] = [];
    const respVal = kpis?.responseRate?.value ?? 0;
    if (respVal < 15 && respVal > 0) {
      tips.push("Augmentez la personnalisation de vos lettres de motivation pour améliorer le taux de réponse.");
    }
    if ((kpis?.avgPSOScore?.value ?? 0) < 60) {
      tips.push("Ciblez des offres mieux alignées avec votre profil pour augmenter le score PSO moyen.");
    }
    if ((kpis?.activeApplications?.value ?? 0) < 5) {
      tips.push("Maintenez un pipeline de 5–10 candidatures actives pour maximiser vos chances.");
    }
    if ((kpis?.scheduledInterviews?.value ?? 0) === 0 && (kpis?.activeApplications?.value ?? 0) > 3) {
      tips.push("Relancez poliment les recruteurs après 7–10 jours sans réponse.");
    }
    if (tips.length === 0) {
      tips.push("Continuez sur votre lancée. Votre stratégie actuelle porte ses fruits.");
    }
    return tips;
  }, [kpis]);

  const careerRecommendations = useMemo(() => {
    const recs: { skill: string; action: string; priority: "high" | "medium" | "low" }[] = [];
    const skills = marketPulse?.skills ?? [];
    const top = skills.sort((a, b) => b.tensionScore - a.tensionScore).slice(0, 3);
    top.forEach((s, i) => {
      const priority = i === 0 ? "high" : i === 1 ? "medium" : "low";
      recs.push({
        skill: s.name,
        action: s.tensionScore > 0.6 ? "Compétence très demandée — mettez-la en avant" : "Compétence pertinente — renforcez-la",
        priority,
      });
    });
    if (recs.length === 0) {
      recs.push({
        skill: "Profil",
        action: "Complétez votre profil et CV pour recevoir des recommandations personnalisées.",
        priority: "high",
      });
    }
    return recs;
  }, [marketPulse?.skills]);

  const chartData = useMemo(() => {
    const skills = marketPulse?.skills ?? [];
    return skills.slice(0, 8).map((s) => ({
      name: s.name.length > 12 ? s.name.slice(0, 12) + "…" : s.name,
      tension: Math.round(s.tensionScore * 100),
      salary: s.salaryP50 > 0 ? Math.round(s.salaryP50 / 1000) : 0,
    }));
  }, [marketPulse?.skills]);

  const pieData = useMemo(() => {
    if (!kpis) return [];
    return [
      { name: "Actives", value: kpis.activeApplications.value, color: "#10b981" },
      { name: "Score PSO", value: Math.min(kpis.avgPSOScore.value, 100), color: "#3b82f6" },
      { name: "Taux réponse", value: Math.min(kpis.responseRate.value, 100), color: "#8b5cf6" },
      { name: "Entretiens", value: kpis.scheduledInterviews.value * 10, color: "#f59e0b" },
    ].filter((d) => d.value > 0);
  }, [kpis]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#E94560]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-sm font-medium text-foreground">
          {error instanceof Error ? error.message : "Erreur de chargement"}
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* ── Header ── */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-[#E94560]/10 border border-amber-500/20">
              <Lightbulb className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">AI Insights</h1>
              <p className="text-xs text-muted-foreground">
                Intelligence marché et stratégie de candidature
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs gap-1.5"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
              Rafraîchir
            </Button>
          </div>
        </div>

        {/* KPIs bar */}
        {kpis && (
          <div className="flex items-center gap-6 mt-4 flex-wrap">
            {[
              {
                label: "Candidatures actives",
                value: kpis.activeApplications.value,
                trend: kpis.activeApplications.trend,
                delta: kpis.activeApplications.deltaLabel,
                icon: Briefcase,
              },
              {
                label: "Score PSO moy.",
                value: kpis.avgPSOScore.value,
                trend: kpis.avgPSOScore.trend,
                delta: kpis.avgPSOScore.deltaLabel,
                icon: Target,
              },
              {
                label: "Taux de réponse",
                value: `${kpis.responseRate.value}%`,
                trend: kpis.responseRate.trend,
                delta: kpis.responseRate.deltaLabel,
                icon: Zap,
              },
              {
                label: "Entretiens planifiés",
                value: kpis.scheduledInterviews.value,
                trend: kpis.scheduledInterviews.trend,
                delta: kpis.scheduledInterviews.deltaLabel,
                icon: Calendar,
              },
              {
                label: "Momentum",
                value: momentumScore,
                trend: momentumScore >= 50 ? "up" : momentumScore >= 25 ? "stable" : "down",
                delta: momentumLabel.label,
                icon: Activity,
              },
            ].map((kpi) => {
              const trend = kpi.trend as keyof typeof TREND_ICONS;
              const TrendIcon = TREND_ICONS[trend];
              return (
                <div key={kpi.label} className="flex items-center gap-2">
                  <kpi.icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold tabular-nums">{kpi.value}</span>
                      <TrendIcon className={cn("h-3 w-3", TREND_COLORS[trend])} />
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {kpi.label} · {kpi.delta}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tabs */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            {(
              [
                { id: "overview", label: "Vue d'ensemble", icon: Brain },
                { id: "market", label: "Tendances marché", icon: TrendingUp },
                { id: "strategy", label: "Stratégie", icon: Target },
                { id: "career", label: "Recommandations", icon: Lightbulb },
                { id: "analytics", label: "Analytiques", icon: BarChart3 },
                { id: "predictive", label: "Prédictif", icon: Sparkles },
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

          {activeTab === "market" && (
            <div className="relative flex-1 min-w-[160px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="Rechercher une compétence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ═══ OVERVIEW TAB ═══ */}
        {activeTab === "overview" && (
          <div className="p-6 space-y-6">
            {/* Insight of the day */}
            <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-transparent p-5">
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Insight du jour
              </h2>
              <p className="text-sm text-foreground/90 leading-relaxed">{insightOfDay}</p>
            </div>

            {/* Quick cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <button
                onClick={() => setActiveTab("market")}
                className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-emerald-500/20 p-5 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <TrendingUp className="h-8 w-8 text-emerald-400" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Tendances marché</h3>
                <p className="text-xs text-muted-foreground">
                  Compétences émergentes, salaires et tension du marché
                </p>
              </button>

              <button
                onClick={() => setActiveTab("strategy")}
                className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-blue-500/20 p-5 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <Target className="h-8 w-8 text-blue-400" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Stratégie candidature</h3>
                <p className="text-xs text-muted-foreground">
                  Optimisez timing, messaging et ciblage selon vos succès
                </p>
              </button>

              <button
                onClick={() => setActiveTab("career")}
                className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-amber-500/20 p-5 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <Lightbulb className="h-8 w-8 text-amber-400" />
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-amber-400 transition-colors" />
                </div>
                <h3 className="font-semibold text-sm mb-1">Recommandations carrière</h3>
                <p className="text-xs text-muted-foreground">
                  Compétences à développer et entreprises à cibler
                </p>
              </button>
            </div>

            {/* Momentum + Activity */}
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#E94560]/80" />
                  Score de momentum
                </h3>
                <div className="flex items-center gap-4">
                  <div
                    className={cn(
                      "flex h-20 w-20 items-center justify-center rounded-2xl font-bold text-2xl tabular-nums",
                      momentumLabel.bg,
                      momentumLabel.color,
                    )}
                  >
                    {momentumScore}
                  </div>
                  <div>
                    <div className="font-medium">{momentumLabel.label}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Basé sur vos candidatures, score PSO, Inbox Tracker et profil
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-2 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#E94560] to-amber-500 transition-all duration-500"
                    style={{ width: `${momentumScore}%` }}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Activité récente
                </h3>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Aucune activité récente</p>
                  ) : (
                    recentActivity.slice(0, 5).map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg bg-muted/20 px-3 py-2 text-xs"
                      >
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1">{item.description}</span>
                        <span className="text-muted-foreground shrink-0">
                          {formatTimeAgo(item.timestamp)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MARKET TRENDS TAB ═══ */}
        {activeTab === "market" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-400" />
              Tendances marché
            </h2>

            {searchFilteredSkills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <TrendingUp className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">Aucune donnée de compétences</p>
                <p className="text-xs mt-1">Complétez votre profil ou ajoutez des offres pour voir les tendances</p>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {searchFilteredSkills.map((skill) => (
                    <div
                      key={skill.name}
                      className="rounded-xl border border-border/50 bg-card/40 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{skill.name}</h4>
                        <Badge
                          className={cn(
                            "text-[9px]",
                            skill.tensionScore > 0.6
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : skill.tensionScore > 0.3
                                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                : "bg-muted/30 text-muted-foreground border-border/50",
                          )}
                        >
                          Tension {Math.round(skill.tensionScore * 100)}%
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Salaire médian</span>
                        <span className="font-medium tabular-nums text-foreground">
                          {skill.salaryP50 > 0
                            ? `${Math.round(skill.salaryP50 / 1000)}k €`
                            : "—"}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${skill.tensionScore * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {chartData.length > 0 && (
                  <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                    <h3 className="text-sm font-semibold mb-4">Tension par compétence</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="tension" fill="#E94560" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ═══ STRATEGY TAB ═══ */}
        {activeTab === "strategy" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-400" />
              Stratégie de candidature
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Conseils personnalisés</h3>
                <ul className="space-y-2">
                  {strategyTips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-blue-400 mt-0.5">•</span>
                      <span className="text-foreground/90">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
                <h3 className="text-sm font-semibold">KPIs vs semaine dernière</h3>
                {kpis && (
                  <div className="space-y-3">
                    {[
                      { label: "Candidatures actives", kpi: kpis.activeApplications },
                      { label: "Score PSO moyen", kpi: kpis.avgPSOScore },
                      { label: "Taux de réponse", kpi: kpis.responseRate },
                      { label: "Entretiens planifiés", kpi: kpis.scheduledInterviews },
                    ].map(({ label, kpi }) => {
                      const TrendIcon = TREND_ICONS[kpi.trend];
                      return (
                        <div key={label} className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{label}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold tabular-nums">{kpi.value}</span>
                            <TrendIcon className={cn("h-3 w-3", TREND_COLORS[kpi.trend])} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ CAREER TAB ═══ */}
        {activeTab === "career" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" />
              Recommandations carrière
            </h2>

            <div className="space-y-4">
              {careerRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-5 flex items-start gap-4",
                    rec.priority === "high"
                      ? "border-amber-500/30 bg-amber-500/5"
                      : rec.priority === "medium"
                        ? "border-blue-500/20 bg-blue-500/5"
                        : "border-border/50 bg-card/30",
                  )}
                >
                  <Award
                    className={cn(
                      "h-8 w-8 shrink-0",
                      rec.priority === "high"
                        ? "text-amber-400"
                        : rec.priority === "medium"
                          ? "text-blue-400"
                          : "text-muted-foreground",
                    )}
                  />
                  <div>
                    <h4 className="font-semibold text-sm">{rec.skill}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{rec.action}</p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 text-[9px]",
                      rec.priority === "high"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : rec.priority === "medium"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          : "bg-muted/30 text-muted-foreground border-border/50",
                    )}
                  >
                    {rec.priority === "high" ? "Priorité haute" : rec.priority === "medium" ? "Priorité moyenne" : "Priorité basse"}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ ANALYTICS TAB ═══ */}
        {activeTab === "analytics" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-[#E94560]/80" />
              Analytiques
            </h2>

            <div className="grid gap-6 lg:grid-cols-2">
              {chartData.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <h3 className="text-sm font-semibold mb-4">Tension du marché par compétence</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                        <YAxis tick={{ fontSize: 10 }} stroke="currentColor" className="text-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <Line
                          type="monotone"
                          dataKey="tension"
                          stroke="#E94560"
                          strokeWidth={2}
                          dot={{ fill: "#E94560", r: 3 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {pieData.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                  <h3 className="text-sm font-semibold mb-4">Répartition des indicateurs</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          nameKey="name"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {chartData.length === 0 && pieData.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <BarChart3 className="h-12 w-12 opacity-20 mb-3" />
                <p className="text-sm font-medium">Pas assez de données</p>
                <p className="text-xs mt-1">Continuez à candidater pour voir les analytiques</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ PREDICTIVE TAB ═══ */}
        {activeTab === "predictive" && (
          <div className="p-6 space-y-6">
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-400" />
              Insights prédictifs
            </h2>

            <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-500/20">
                  <Brain className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-2">Tableau de bord analytique avancé</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Analyse prédictive, comparaison avec les autres candidats et recommandations IA en cours de développement.
                    Les données actuelles (tendances marché, momentum, KPIs) alimentent déjà des insights personnalisés.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                      Bientôt disponible
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold mb-3">Prédiction entretiens</h3>
                <p className="text-xs text-muted-foreground">
                  Basé sur votre taux de réponse actuel ({kpis?.responseRate.value ?? 0}%) et votre pipeline de{" "}
                  {kpis?.activeApplications.value ?? 0} candidatures actives, une estimation sera disponible prochainement.
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-card/30 p-5">
                <h3 className="text-sm font-semibold mb-3">Entreprises à cibler</h3>
                <p className="text-xs text-muted-foreground">
                  Analyse des employeurs où vos compétences correspondent le mieux. Connectez plus de sources de données
                  pour activer cette fonctionnalité.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
