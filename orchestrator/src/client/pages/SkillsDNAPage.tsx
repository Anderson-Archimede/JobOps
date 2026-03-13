/**
 * Skills DNA — C-HUNT-01
 * Radar de Compétences + Gap Analysis + Roadmap
 */

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  RefreshCw,
  ExternalLink,
  BookOpen,
  TrendingUp,
  FileText,
  Sparkles,
  AlertCircle,
  Zap,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { FuturisticRadar, type RadarDataPoint } from "@/components/skills/FuturisticRadar";

/* ─── Constants ─────────────────────────────────────── */

const AXES = ["DATA_ENGINEERING", "BI_ANALYTICS", "TECHNICAL", "CLOUD", "SOFT", "DOMAIN"] as const;

const CATEGORY_LABELS: Record<string, string> = {
  DATA_ENGINEERING: "Data Eng.",
  BI_ANALYTICS: "BI / Viz",
  TECHNICAL: "ML / AI",
  CLOUD: "Cloud",
  SOFT: "Soft Skills",
  DOMAIN: "Domaine",
};

const CATEGORY_LABELS_FULL: Record<string, string> = {
  DATA_ENGINEERING: "Data Engineering",
  BI_ANALYTICS: "BI / Visualisation",
  TECHNICAL: "ML / AI",
  CLOUD: "Cloud",
  SOFT: "Soft Skills",
  DOMAIN: "Domaine",
};

const LEVEL_SCORE: Record<string, number> = {
  NOTIONS: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

const LEVEL_LABEL_FR: Record<string, string> = {
  NOTIONS: "Notions",
  INTERMEDIATE: "Intermédiaire",
  ADVANCED: "Avancé",
  EXPERT: "Expert",
};

const LEVEL_COLOR: Record<string, string> = {
  NOTIONS: "bg-slate-500",
  INTERMEDIATE: "bg-blue-500",
  ADVANCED: "bg-emerald-500",
  EXPERT: "bg-violet-500",
};

const LINE_COLORS: Record<string, string> = {
  DATA_ENGINEERING: "#2dd4bf",
  BI_ANALYTICS: "#60a5fa",
  TECHNICAL: "#a78bfa",
  CLOUD: "#fbbf24",
  SOFT: "#f472b6",
  DOMAIN: "#4ade80",
};

/* ─── Types ──────────────────────────────────────────── */

interface ExtractedSkill {
  name: string;
  category: string;
  level: string;
  evidence: string;
}

interface RecommendedResource {
  label: string;
  url?: string;
  estimatedDuration?: string;
}

interface SkillGapItem {
  skillName: string;
  frequency: number;
  frequencyPercent: number;
  recommendedResource: RecommendedResource;
}

interface SkillsDNAData {
  skills: ExtractedSkill[];
  gapAnalysis: SkillGapItem[];
  lastUpdated: string | null;
}

interface HistoryPoint {
  snapshotAt: string;
  categoryAverages: Record<string, number>;
}

/* ─── Helpers ───────────────────────────────────────── */

function aggregateByCategory(skills: ExtractedSkill[]): Record<string, number> {
  const sum: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const axis of AXES) { sum[axis] = 0; count[axis] = 0; }
  for (const s of skills) {
    const cat = AXES.includes(s.category as (typeof AXES)[number]) ? s.category : "DOMAIN";
    sum[cat] = (sum[cat] ?? 0) + (LEVEL_SCORE[s.level] ?? 1);
    count[cat] = (count[cat] ?? 0) + 1;
  }
  const out: Record<string, number> = {};
  for (const axis of AXES) {
    out[axis] = count[axis] ? Math.round((sum[axis] / count[axis]) * 100) / 100 : 0;
  }
  return out;
}

/* ─── Component ─────────────────────────────────────── */

export const SkillsDNAPage: React.FC = () => {
  const [data, setData] = useState<SkillsDNAData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = (path: string, opts?: RequestInit) =>
    fetch(path, { credentials: "include", ...opts });

  const fetchData = async () => {
    try {
      const [profileRes, historyRes] = await Promise.all([
        api("/api/seeker/skills-dna"),
        api("/api/seeker/skills-dna/history"),
      ]);
      if (!profileRes.ok) {
        const t = await profileRes.text();
        throw new Error(t || "Échec chargement Skills DNA");
      }
      const profileJson = await profileRes.json();
      const raw = profileJson?.data ?? profileJson ?? {};
      setData({
        skills: Array.isArray(raw.skills) ? raw.skills : [],
        gapAnalysis: Array.isArray(raw.gapAnalysis) ? raw.gapAnalysis : [],
        lastUpdated: raw.lastUpdated ?? null,
      });
      if (historyRes.ok) {
        const hj = await historyRes.json();
        const hist = hj?.data ?? hj ?? [];
        setHistory(Array.isArray(hist) ? hist : []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setData({ skills: [], gapAnalysis: [], lastUpdated: null });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await api("/api/seeker/skills-dna/refresh", { method: "POST" });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || "Mise à jour impossible");
      }
      const json = await res.json();
      const raw = json?.data ?? json ?? {};
      const skills = Array.isArray(raw.skills) ? raw.skills : data?.skills ?? [];
      const gapAnalysis = Array.isArray(raw.gapAnalysis) ? raw.gapAnalysis : data?.gapAnalysis ?? [];
      setData({
        skills,
        gapAnalysis,
        lastUpdated: raw.lastUpdated ?? data?.lastUpdated ?? null,
      });
      if (skills.length > 0) {
        toast.success(`${skills.length} compétence(s) extraite(s) avec succès`);
      } else {
        toast.warning("Aucune compétence extraite. Vérifiez que votre CV contient du texte lisible.");
      }
      setError(null);
      const hRes = await api("/api/seeker/skills-dna/history");
      if (hRes.ok) {
        const hj = await hRes.json();
        const hist = hj?.data ?? hj ?? [];
        setHistory(Array.isArray(hist) ? hist : []);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur mise à jour");
    } finally {
      setRefreshing(false);
    }
  };

  const handleEditLevel = () => toast.info("Modifier le niveau — bientôt disponible");

  /* ─── Loading ─── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="relative h-14 w-14">
          <div className="absolute inset-0 animate-ping rounded-full bg-teal-500/30" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-teal-500/50 bg-teal-500/10">
            <Target className="h-6 w-6 text-teal-400" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">Chargement de votre Skills DNA…</p>
      </div>
    );
  }

  const skills = data?.skills ?? [];
  const gapAnalysis = data?.gapAnalysis ?? [];
  const byCategory = aggregateByCategory(skills);
  const hasAnySkill = skills.length > 0;
  const totalSkills = skills.length;

  const radarData: RadarDataPoint[] = AXES.map((key) => ({
    label: CATEGORY_LABELS[key] ?? key,
    value: hasAnySkill ? (byCategory[key] ?? 0) : 0,
    target: 3,
  }));

  const skillsByCategory = AXES.reduce<Record<string, ExtractedSkill[]>>((acc, cat) => {
    acc[cat] = skills.filter((s) => s.category === cat);
    return acc;
  }, {});

  const historyChartData = history.map((h) => ({
    date: new Date(h.snapshotAt).toLocaleDateString("fr-FR", { month: "short", day: "numeric" }),
    ...h.categoryAverages,
  }));

  const expertCount = skills.filter((s) => s.level === "EXPERT").length;
  const advancedCount = skills.filter((s) => s.level === "ADVANCED").length;
  const avgScore =
    totalSkills > 0
      ? Math.round((skills.reduce((s, k) => s + (LEVEL_SCORE[k.level] ?? 1), 0) / totalSkills) * 10) / 10
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/10">
      <div className="mx-auto max-w-6xl space-y-6 p-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 shadow-sm ring-1 ring-teal-500/30">
              <Target className="h-6 w-6 text-teal-400" />
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400 opacity-40" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-teal-500" />
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Skills DNA</h1>
              <p className="text-xs text-muted-foreground">
                Radar de compétences · Gap Analysis · Roadmap
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data?.lastUpdated && (
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1 text-xs text-muted-foreground">
                Mis à jour le{" "}
                {new Date(data.lastUpdated).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              size="sm"
              className="bg-teal-600 text-white hover:bg-teal-700"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Extraction en cours…" : "Mettre à jour"}
            </Button>
          </div>
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── Onboarding banner when no skills ── */}
        {!hasAnySkill && (
          <div className="overflow-hidden rounded-xl border border-teal-500/20 bg-gradient-to-r from-teal-950/40 to-transparent p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-500/20">
                <Sparkles className="h-5 w-5 text-teal-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Activez votre Skills DNA</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ajoutez des CVs dans le CV Manager puis cliquez sur <strong>Mettre à jour</strong>{" "}
                  pour extraire automatiquement vos compétences via IA.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link to="/cv-manager">
                    <Button variant="outline" size="sm" className="border-teal-500/40 text-teal-400 hover:bg-teal-500/10">
                      <FileText className="mr-2 h-4 w-4" />
                      CV Manager
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── KPI badges ── */}
        {hasAnySkill && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Compétences", value: totalSkills, color: "text-teal-400" },
              { label: "Expert", value: expertCount, color: "text-violet-400" },
              { label: "Avancé", value: advancedCount, color: "text-emerald-400" },
              { label: "Score moyen", value: `${avgScore}/4`, color: "text-amber-400" },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-border/60 bg-card/80 p-4 text-center"
              >
                <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Radar + Legend ── */}
        <div className="rounded-2xl border border-teal-500/15 bg-gradient-to-br from-slate-900/80 via-card to-slate-900/40 p-6 shadow-lg ring-1 ring-teal-500/10 backdrop-blur">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Radar de compétences</h2>
              <p className="text-xs text-muted-foreground">
                6 axes · Échelle 1 (Notions) → 4 (Expert)
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm bg-teal-400/70" />
                Votre profil
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-px w-5 border-t-2 border-dashed border-slate-400/60" />
                Marché cible
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center lg:flex-row lg:items-start lg:gap-10">
            <FuturisticRadar data={radarData} size={400} />

            {/* Axis detail cards */}
            <div className="mt-4 grid w-full max-w-xs grid-cols-2 gap-2 lg:mt-0 lg:max-w-none lg:w-auto">
              {radarData.map((d) => {
                const catKey = AXES.find((a) => CATEGORY_LABELS[a] === d.label) ?? "DOMAIN";
                const pct = Math.round((d.value / 4) * 100);
                const marketPct = Math.round((d.target / 4) * 100);
                const diff = pct - marketPct;
                return (
                  <div
                    key={d.label}
                    className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
                  >
                    <p className="text-xs font-medium text-foreground">{CATEGORY_LABELS_FULL[catKey]}</p>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-teal-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{pct}%</span>
                      <span
                        className={`text-[10px] font-medium ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {diff >= 0 ? `+${diff}%` : `${diff}%`} vs marché
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!hasAnySkill && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Le polygone « Votre profil » se remplira après extraction depuis vos CVs.
            </p>
          )}
        </div>

        {/* ── Skills by category ── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Compétences par catégorie</h2>
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center">
              <FileText className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                Aucune compétence extraite
              </p>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Ajoutez un CV PDF dans le CV Manager, puis cliquez sur &quot;Mettre à jour&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {AXES.map((cat) => {
                const list = skillsByCategory[cat] ?? [];
                if (list.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: LINE_COLORS[cat] }}
                      />
                      <h3 className="text-sm font-semibold text-foreground">
                        {CATEGORY_LABELS_FULL[cat]}
                      </h3>
                      <span className="text-xs text-muted-foreground">({list.length})</span>
                    </div>
                    <ul className="space-y-2">
                      {list.map((skill, i) => (
                        <li
                          key={`${skill.name}-${i}`}
                          className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-muted/15 px-3 py-2.5 transition-colors hover:bg-muted/30"
                        >
                          <span className="font-medium text-foreground">{skill.name}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium text-white ${LEVEL_COLOR[skill.level] ?? "bg-slate-500"}`}
                          >
                            {LEVEL_LABEL_FR[skill.level] ?? skill.level}
                          </span>
                          <div className="min-w-[100px] max-w-[180px] flex-1">
                            <Progress
                              value={((LEVEL_SCORE[skill.level] ?? 1) / 4) * 100}
                              className="h-1.5"
                            />
                          </div>
                          {skill.evidence && (
                            <span
                              className="max-w-xs truncate text-xs italic text-muted-foreground"
                              title={skill.evidence}
                            >
                              {skill.evidence}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleEditLevel}
                            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                          >
                            Modifier
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Gap Analysis ── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-semibold text-foreground">Gap Analysis</h2>
            <span className="ml-1 rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400">
              Top 5 compétences manquantes
            </span>
          </div>
          {gapAnalysis.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center">
              <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm font-medium text-muted-foreground">
                Aucune donnée de marché disponible
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Lancez un scraping, puis cliquez sur &quot;Mettre à jour&quot; pour comparer avec les offres.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {gapAnalysis.map((gap, i) => (
                <li
                  key={`${gap.skillName}-${i}`}
                  className="group rounded-xl border border-border/50 bg-muted/10 p-4 transition-colors hover:bg-muted/20"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-xs font-bold text-red-400">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-foreground">{gap.skillName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-red-400"
                              style={{ width: `${gap.frequencyPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {gap.frequencyPercent}% des offres
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card px-3 py-2">
                      <BookOpen className="h-4 w-4 shrink-0 text-blue-400" />
                      <div>
                        <p className="text-xs font-medium text-foreground">
                          {gap.recommendedResource.label}
                        </p>
                        {gap.recommendedResource.estimatedDuration && (
                          <p className="text-[10px] text-muted-foreground">
                            ⏱ {gap.recommendedResource.estimatedDuration}
                          </p>
                        )}
                      </div>
                      {gap.recommendedResource.url && (
                        <a
                          href={gap.recommendedResource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Évolution 6 mois ── */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-400" />
            <h2 className="text-lg font-semibold text-foreground">Évolution sur 6 mois</h2>
          </div>
          {historyChartData.length < 2 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-10 text-center">
              <TrendingUp className="mb-3 h-10 w-10 text-muted-foreground/60" />
              <p className="text-sm text-muted-foreground">
                Pas encore assez de points. Chaque &quot;Mettre à jour&quot; enregistre un snapshot.
              </p>
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.2)" />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                  <YAxis
                    domain={[0, 4]}
                    ticks={[0, 1, 2, 3, 4]}
                    tickFormatter={(v) => ["", "Notions", "Inter.", "Avancé", "Expert"][v as number] ?? v}
                    tick={{ fill: "#94a3b8", fontSize: 10 }}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(v: number, name: string) => [v.toFixed(1), CATEGORY_LABELS_FULL[name] ?? name]}
                  />
                  <Legend formatter={(v) => CATEGORY_LABELS_FULL[v] ?? v} wrapperStyle={{ fontSize: 11 }} />
                  {AXES.map((axis) => (
                    <Line
                      key={axis}
                      type="monotone"
                      dataKey={axis}
                      stroke={LINE_COLORS[axis]}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
