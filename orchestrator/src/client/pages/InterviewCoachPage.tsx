/**
 * Interview Coach Page
 * Displays generated interview questions in a rich, interactive format.
 */

import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Clock,
  Code,
  Download,
  FileText,
  Lightbulb,
  Mic,
  RotateCcw,
  Sparkles,
  Star,
  Target,
  Zap,
  CheckCircle,
  Brain,
  MessageSquare,
  TrendingUp,
  Building2,
} from "lucide-react";

interface InterviewQuestion {
  question: string;
  type: "behavioral" | "technical" | "motivational" | "situational";
  difficulty: 1 | 2 | 3;
  expectedKeywords: string[];
  starRequired: boolean;
  tipForCandidate: string;
}

interface SessionData {
  id: string;
  applicationId: string | null;
  mode: string;
  jobTitle: string;
  company: string;
  questions: InterviewQuestion[];
  createdAt: string;
  completedAt: string | null;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType; bg: string }> = {
  behavioral: { label: "Comportemental", color: "text-purple-400", icon: MessageSquare, bg: "bg-purple-500/15 border-purple-500/20" },
  technical: { label: "Technique", color: "text-blue-400", icon: Code, bg: "bg-blue-500/15 border-blue-500/20" },
  motivational: { label: "Motivationnel", color: "text-emerald-400", icon: TrendingUp, bg: "bg-emerald-500/15 border-emerald-500/20" },
  situational: { label: "Situationnel", color: "text-amber-400", icon: Brain, bg: "bg-amber-500/15 border-amber-500/20" },
};

const MODE_LABELS: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  flash: { label: "Flash", icon: Zap, color: "text-yellow-400" },
  full: { label: "Complet", icon: FileText, color: "text-blue-400" },
  technical: { label: "Technique", icon: Code, color: "text-green-400" },
};

export const InterviewCoachPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("sessionId");

  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set());
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("Aucun ID de session fourni.");
      setIsLoading(false);
      return;
    }
    fetchSession(sessionId);
  }, [sessionId]);

  const fetchSession = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/seeker/interview/sessions/${id}`);
      if (!response.ok) {
        throw new Error("Session introuvable");
      }
      const data = await response.json();
      setSession(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTip = (index: number) => {
    setExpandedTips((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const toggleAnswered = (index: number) => {
    setAnsweredQuestions((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  const handleExport = () => {
    if (!session) return;
    const content = session.questions
      .map(
        (q, i) =>
          `${i + 1}. ${q.question}\n   Type: ${TYPE_CONFIG[q.type]?.label ?? q.type} | Difficulté: ${"★".repeat(q.difficulty)}${"☆".repeat(3 - q.difficulty)}\n   ${q.starRequired ? "[Réponse STAR attendue]\n   " : ""}Conseil: ${q.tipForCandidate}\n   Mots-clés: ${q.expectedKeywords.join(", ")}\n`,
      )
      .join("\n");

    const blob = new Blob(
      [
        `═══════════════════════════════════════════\n` +
          `PRÉPARATION D'ENTRETIEN — ${session.jobTitle}\n` +
          `${session.company}\n` +
          `Mode: ${MODE_LABELS[session.mode]?.label ?? session.mode} | ${session.questions.length} questions\n` +
          `Généré le ${new Date(session.createdAt).toLocaleDateString("fr-FR")}\n` +
          `═══════════════════════════════════════════\n\n` +
          content,
      ],
      { type: "text/plain;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entretien-${session.company.replace(/\s+/g, "-").toLowerCase()}-${session.mode}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const progress = session ? Math.round((answeredQuestions.size / session.questions.length) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-3">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-blue-500/10 animate-pulse">
            <Target className="h-7 w-7 text-blue-400" />
          </div>
          <p className="text-sm text-muted-foreground">Chargement de la session...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-xl bg-red-500/10">
            <Target className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="text-lg font-semibold">{error || "Session introuvable"}</h2>
          <p className="text-sm text-muted-foreground">
            La session de préparation n'a pas pu être chargée.
          </p>
          <Button onClick={() => navigate("/dashboard")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour au Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const modeInfo = MODE_LABELS[session.mode] ?? { label: session.mode, icon: Target, color: "text-foreground" };
  const ModeIcon = modeInfo.icon;

  const typeCounts = session.questions.reduce(
    (acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="container mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour au Dashboard
          </button>
          <h1 className="text-xl font-bold tracking-tight">Préparation d'entretien</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span className="font-medium text-foreground">{session.jobTitle}</span>
            <span>chez</span>
            <span className="font-medium text-foreground">{session.company}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs">
            <Download className="h-3.5 w-3.5" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/10 to-violet-500/5 p-3">
          <div className="flex items-center gap-2">
            <ModeIcon className={cn("h-5 w-5", modeInfo.color)} />
            <div>
              <div className="text-lg font-bold">{session.questions.length}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Questions</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-green-500/5 p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="text-lg font-bold">{answeredQuestions.size}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Traitées</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <div>
              <div className="text-lg font-bold">{session.mode === "flash" ? "10" : session.mode === "full" ? "30" : "20"}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Minutes</div>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/40 bg-gradient-to-br from-violet-500/10 to-purple-500/5 p-3">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-400" />
            <div>
              <div className="text-lg font-bold">{progress}%</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Progression</div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Progression</span>
          <span>{answeredQuestions.size}/{session.questions.length}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Type distribution */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeCounts).map(([type, count]) => {
          const cfg = TYPE_CONFIG[type] ?? { label: type, color: "text-foreground", icon: Target, bg: "bg-muted/10 border-border/20" };
          const TypeIcon = cfg.icon;
          return (
            <span
              key={type}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", cfg.bg, cfg.color)}
            >
              <TypeIcon className="h-3 w-3" />
              {cfg.label} ({count})
            </span>
          );
        })}
      </div>

      {/* Questions list */}
      <div className="space-y-3">
        {session.questions.map((q, index) => {
          const cfg = TYPE_CONFIG[q.type] ?? { label: q.type, color: "text-foreground", icon: Target, bg: "bg-muted/10 border-border/20" };
          const TypeIcon = cfg.icon;
          const isExpanded = expandedTips.has(index);
          const isAnswered = answeredQuestions.has(index);
          const isActive = activeQuestion === index;

          return (
            <div
              key={index}
              className={cn(
                "rounded-xl border transition-all",
                isAnswered
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : isActive
                    ? "border-blue-500/40 bg-blue-500/5 shadow-lg shadow-blue-500/5"
                    : "border-border/40 bg-card hover:border-border/60",
              )}
            >
              <div
                className="flex items-start gap-3 p-4 cursor-pointer"
                onClick={() => setActiveQuestion(isActive ? null : index)}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                    isAnswered
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-muted/30 text-muted-foreground",
                  )}
                >
                  {isAnswered ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm leading-relaxed", isAnswered && "text-muted-foreground line-through decoration-emerald-500/30")}>{q.question}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border", cfg.bg, cfg.color)}>
                      <TypeIcon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                    <span className="inline-flex items-center gap-0.5">
                      {Array.from({ length: 3 }, (_, i) => (
                        <Star key={i} className={cn("h-3 w-3", i < q.difficulty ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30")} />
                      ))}
                    </span>
                    {q.starRequired && (
                      <span className="rounded-full bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                        STAR
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAnswered(index);
                  }}
                  className={cn(
                    "h-8 w-8 p-0 shrink-0",
                    isAnswered ? "text-emerald-400 hover:text-emerald-300" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Expanded details */}
              {isActive && (
                <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-3">
                  {/* Tip */}
                  <div className="rounded-lg bg-gradient-to-r from-blue-500/10 to-violet-500/5 border border-blue-500/20 p-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-blue-400 mb-1.5">
                      <Lightbulb className="h-3.5 w-3.5" />
                      Conseil pour le candidat
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{q.tipForCandidate}</p>
                  </div>

                  {/* Keywords */}
                  {q.expectedKeywords.length > 0 && (
                    <div>
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
                        Mots-clés attendus
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {q.expectedKeywords.map((kw) => (
                          <span
                            key={kw}
                            className="rounded-md bg-muted/30 border border-border/30 px-2 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {q.starRequired && (
                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                      <div className="text-xs font-medium text-amber-400 mb-1">Méthode STAR recommandée</div>
                      <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                        <div><span className="font-bold text-amber-400">S</span>ituation</div>
                        <div><span className="font-bold text-amber-400">T</span>âche</div>
                        <div><span className="font-bold text-amber-400">A</span>ction</div>
                        <div><span className="font-bold text-amber-400">R</span>ésultat</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-border/50 bg-card/95 px-4 py-3 shadow-xl backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {answeredQuestions.size === session.questions.length
            ? "Toutes les questions ont été traitées !"
            : `${session.questions.length - answeredQuestions.size} question${session.questions.length - answeredQuestions.size > 1 ? "s" : ""} restante${session.questions.length - answeredQuestions.size > 1 ? "s" : ""}`}
        </div>
        <div className="flex items-center gap-2">
          {answeredQuestions.size > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnsweredQuestions(new Set())}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="text-xs gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            Exporter
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700"
          >
            Terminer
          </Button>
        </div>
      </div>
    </div>
  );
};
