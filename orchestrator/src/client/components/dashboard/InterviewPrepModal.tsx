/**
 * Interview Preparation Modal
 * Two-step modal for generating AI-powered interview questions.
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  FileText,
  Code,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Lightbulb,
  Mic,
  Download,
  X,
  Building2,
  Calendar,
  Target,
} from "lucide-react";

interface ApplicationWithInterview {
  id: string;
  company: string;
  jobTitle: string;
  interviewDate: string | null;
  status: string;
  psoScore: number | null;
  location: string | null;
}

interface InterviewQuestion {
  question: string;
  type: "behavioral" | "technical" | "motivational" | "situational";
  difficulty: 1 | 2 | 3;
  expectedKeywords: string[];
  starRequired: boolean;
  tipForCandidate: string;
}

interface PrepareResponse {
  sessionId: string;
  questions: InterviewQuestion[];
  jobTitle: string;
  company: string;
  mode: string;
}

type PrepMode = "flash" | "full" | "technical";

interface InterviewPrepModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InterviewPrepModal: React.FC<InterviewPrepModalProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [applications, setApplications] = useState<ApplicationWithInterview[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [freeformDescription, setFreeformDescription] = useState("");
  const [freeformTitle, setFreeformTitle] = useState("");
  const [freeformCompany, setFreeformCompany] = useState("");
  const [mode, setMode] = useState<PrepMode>("flash");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [prepResult, setPrepResult] = useState<PrepareResponse | null>(null);
  const [expandedTips, setExpandedTips] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedAppId(null);
      setFreeformDescription("");
      setFreeformTitle("");
      setFreeformCompany("");
      setMode("flash");
      setError(null);
      setPrepResult(null);
      setExpandedTips(new Set());
      fetchApplications();
    }
  }, [open]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/seeker/interview/applications-with-interview");
      if (response.ok) {
        const data = await response.json();
        setApplications(data.data || []);
      }
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setStep(2);

    const messages = [
      "Analyse de la fiche de poste...",
      "Génération des questions...",
      "Personnalisation selon votre profil...",
    ];

    let messageIndex = 0;
    setLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingMessage(messages[messageIndex]);
    }, 2000);

    try {
      const body: Record<string, unknown> = { mode };
      
      if (selectedAppId) {
        body.applicationId = selectedAppId;
      } else {
        body.jobDescription = freeformDescription;
        body.jobTitle = freeformTitle || undefined;
        body.company = freeformCompany || undefined;
      }

      const response = await fetch("/api/seeker/interview/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      clearInterval(interval);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Échec de la génération des questions");
      }

      const data = await response.json();
      const result = data.data as PrepareResponse;
      setPrepResult(result);

      onOpenChange(false);
      navigate(`/interview-coach?sessionId=${result.sessionId}`);
    } catch (err) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
      setStep(1);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTip = (index: number) => {
    setExpandedTips((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const getRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: "Passé", urgent: false };
    if (diffDays === 0) return { text: "Aujourd'hui", urgent: true };
    if (diffDays === 1) return { text: "Demain", urgent: true };
    if (diffDays <= 2) return { text: `Dans ${diffDays} jours`, urgent: true };
    return { text: `Dans ${diffDays} jours`, urgent: false };
  };

  const getTypeLabel = (type: InterviewQuestion["type"]) => {
    const labels: Record<string, { text: string; color: string }> = {
      behavioral: { text: "Comportemental", color: "bg-purple-500/20 text-purple-400" },
      technical: { text: "Technique", color: "bg-blue-500/20 text-blue-400" },
      motivational: { text: "Motivationnel", color: "bg-green-500/20 text-green-400" },
      situational: { text: "Situationnel", color: "bg-orange-500/20 text-orange-400" },
    };
    return labels[type] || { text: type, color: "bg-gray-500/20 text-gray-400" };
  };

  const getDifficultyStars = (difficulty: 1 | 2 | 3) => {
    return Array.from({ length: 3 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < difficulty ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`}
      />
    ));
  };

  const handleExportPDF = () => {
    if (!prepResult) return;
    
    const content = prepResult.questions
      .map((q, i) => `${i + 1}. ${q.question}\n   Type: ${q.type} | Difficulté: ${"★".repeat(q.difficulty)}\n   Conseil: ${q.tipForCandidate}\n`)
      .join("\n");
    
    const blob = new Blob(
      [`Questions d'entretien - ${prepResult.jobTitle} @ ${prepResult.company}\n\n${content}`],
      { type: "text/plain;charset=utf-8" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `preparation-entretien-${prepResult.company.replace(/\s+/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isUrgent = prepResult && applications.find((a) => a.id === selectedAppId)?.interviewDate
    ? getRelativeDate(applications.find((a) => a.id === selectedAppId)?.interviewDate || null)?.urgent
    : false;

  const canGenerate = selectedAppId || (freeformDescription.trim().length > 50);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Préparer un entretien
          </DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Candidatures avec entretien planifié
              </h3>
              
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : applications.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {applications.map((app) => {
                    const dateInfo = getRelativeDate(app.interviewDate);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => {
                          setSelectedAppId(app.id);
                          setFreeformDescription("");
                        }}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          selectedAppId === app.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/50 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-bold text-primary">
                              {app.company.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{app.jobTitle}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {app.company}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {dateInfo && (
                              <span
                                className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                                  dateInfo.urgent
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                <Calendar className="h-3 w-3" />
                                {dateInfo.text}
                              </span>
                            )}
                            {app.psoScore !== null && (
                              <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400">
                                {Math.round(app.psoScore)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Aucune candidature active trouvée
                </p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Ou saisir une offre libre
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Titre du poste"
                  value={freeformTitle}
                  onChange={(e) => {
                    setFreeformTitle(e.target.value);
                    if (e.target.value) setSelectedAppId(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  placeholder="Entreprise"
                  value={freeformCompany}
                  onChange={(e) => {
                    setFreeformCompany(e.target.value);
                    if (e.target.value) setSelectedAppId(null);
                  }}
                  className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <textarea
                placeholder="Collez la description de poste ici (minimum 50 caractères)..."
                value={freeformDescription}
                onChange={(e) => {
                  setFreeformDescription(e.target.value);
                  if (e.target.value) setSelectedAppId(null);
                }}
                className="w-full h-24 px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                maxLength={5000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {freeformDescription.length}/5000
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Mode de préparation
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "flash" as const, icon: Zap, label: "Flash", desc: "8 questions — 10 min", color: "text-yellow-400" },
                  { id: "full" as const, icon: FileText, label: "Complet", desc: "15 questions — 30 min", color: "text-blue-400" },
                  { id: "technical" as const, icon: Code, label: "Technique", desc: "12 questions — focus tech", color: "text-green-400" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      mode === m.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <m.icon className={`h-5 w-5 mx-auto mb-1 ${m.color}`} />
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className="w-full"
            >
              Générer mes questions
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            {isUrgent && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Votre entretien est dans moins de 24h — Bonne chance !
                </span>
              </div>
            )}

            {isGenerating ? (
              <div className="py-12 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground animate-pulse">{loadingMessage}</p>
                <Progress value={33} className="w-48 mx-auto" />
              </div>
            ) : prepResult ? (
              <>
                <div className="flex items-center justify-between pb-2 border-b border-border">
                  <div>
                    <h3 className="font-medium">{prepResult.jobTitle}</h3>
                    <p className="text-sm text-muted-foreground">{prepResult.company}</p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {prepResult.questions.length} questions
                  </span>
                </div>

                <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                  {prepResult.questions.map((q, index) => {
                    const typeInfo = getTypeLabel(q.type);
                    const isExpanded = expandedTips.has(index);

                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg border border-border bg-card/50 space-y-2"
                      >
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <p className="text-sm flex-1">{q.question}</p>
                        </div>

                        <div className="flex items-center gap-2 pl-9 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                            {typeInfo.text}
                          </span>
                          <span className="flex items-center gap-0.5">
                            {getDifficultyStars(q.difficulty)}
                          </span>
                          {q.starRequired && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                              STAR
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleTip(index)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 pl-9"
                        >
                          <Lightbulb className="h-3 w-3" />
                          Conseil
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {isExpanded && (
                          <p className="text-xs text-muted-foreground pl-9 pr-2 py-2 bg-muted/30 rounded">
                            {q.tipForCandidate}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Button
                    variant="default"
                    className="flex-1"
                    onClick={() => {
                      window.location.href = `/interview-coach?sessionId=${prepResult.sessionId}`;
                    }}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Démarrer la simulation
                  </Button>
                  <Button variant="outline" onClick={handleExportPDF}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
