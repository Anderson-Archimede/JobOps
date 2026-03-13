import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ScrapingPlatform =
  | "linkedin"
  | "hellowork"
  | "indeed"
  | "glassdoor"
  | "france_travail"
  | "welcome_jungle"
  | "meteojob";

type ContractType = "CDI" | "CDD" | "FREELANCE" | "STAGE" | "ALTERNANCE";

interface PlatformProgress {
  platform: string;
  percent: number;
  found: number;
  status: "pending" | "running" | "done" | "error";
  error?: string;
}

interface ScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const PLATFORM_META: Record<string, { label: string; color: string; icon: string }> = {
  linkedin: { label: "LinkedIn", color: "from-blue-600 to-blue-400", icon: "in" },
  hellowork: { label: "HelloWork", color: "from-orange-500 to-amber-400", icon: "HW" },
  indeed: { label: "Indeed", color: "from-indigo-500 to-blue-400", icon: "IN" },
  glassdoor: { label: "Glassdoor", color: "from-green-600 to-emerald-400", icon: "GD" },
  france_travail: { label: "France Travail", color: "from-blue-700 to-blue-500", icon: "FT" },
  welcome_jungle: { label: "Welcome to the Jungle", color: "from-yellow-500 to-lime-400", icon: "WJ" },
  meteojob: { label: "Météojob", color: "from-cyan-500 to-sky-400", icon: "MJ" },
};

export const ScrapingModal: React.FC<ScrapingModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [platforms, setPlatforms] = useState<ScrapingPlatform[]>([
    "linkedin", "hellowork", "indeed", "welcome_jungle",
  ]);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [contractTypes, setContractTypes] = useState<ContractType[]>(["CDI"]);
  const [maxResults, setMaxResults] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [platformProgress, setPlatformProgress] = useState<PlatformProgress[]>([]);
  const [jobsFound, setJobsFound] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const navigate = useNavigate();

  const togglePlatform = (value: ScrapingPlatform) => {
    setPlatforms((prev) =>
      prev.includes(value) ? prev.filter((p) => p !== value) : [...prev, value],
    );
  };

  const toggleContract = (value: ContractType) => {
    setContractTypes((prev) =>
      prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value],
    );
  };

  async function launchScraping() {
    const payload = {
      platforms,
      keywords,
      location: location || undefined,
      contractTypes: contractTypes.length > 0 ? contractTypes : undefined,
      maxResults,
    };

    let response: Response;
    try {
      response = await fetch("/api/seeker/scraping/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new Error(
        `Erreur réseau : impossible de joindre le serveur. Détail : ${networkError instanceof Error ? networkError.message : String(networkError)}`,
      );
    }

    const rawText = await response.text();
    let data: any;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(`Réponse invalide du serveur (status ${response.status})`);
    }

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error?.message ?? `Erreur ${response.status}`);
    }

    return data.data as { sessionId: string; status: string; message: string };
  }

  const handleLaunch = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await launchScraping();
      setSessionId(result.sessionId);
      setStep(2);
      setCompleted(false);
      setGlobalProgress(0);
      setJobsFound(0);
      setElapsedSec(0);
      setPlatformProgress(
        platforms.map((p) => ({ platform: p, percent: 0, found: 0, status: "pending" as const })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = platforms.length === 0 || keywords.trim().length < 2;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setError(null);
      setSessionId(null);
      setGlobalProgress(0);
      setPlatformProgress([]);
      setJobsFound(0);
      setCompleted(false);
      setElapsedSec(0);
    }
  }, [open]);

  // Elapsed time counter
  useEffect(() => {
    if (step !== 2 || completed) return;
    const t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [step, completed]);

  // SSE progress
  useEffect(() => {
    if (!open || step !== 2 || !sessionId) return;

    const source = new EventSource(`/api/seeker/scraping/sessions/${sessionId}/progress`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "progress") {
          setGlobalProgress(payload.progress ?? 0);
          setJobsFound(payload.jobsFound ?? 0);
          if (Array.isArray(payload.platforms)) {
            setPlatformProgress(payload.platforms);
          }
        }
        if (payload.type === "completed") {
          setJobsFound(payload.jobsFound ?? 0);
          setCompleted(true);
          setGlobalProgress(100);
          if (Array.isArray(payload.platforms)) {
            setPlatformProgress(payload.platforms);
          }
          source.close();
        }
        if (payload.type === "error") {
          setError(payload.message ?? "Erreur pendant le scraping");
          source.close();
        }
      } catch {
        // ignore
      }
    };

    source.onerror = () => source.close();
    return () => source.close();
  }, [open, step, sessionId]);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && completed) onSuccess?.();
        onOpenChange(val);
      }}
    >
      <DialogContent className="max-w-lg border-border/60 bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 text-xs font-bold text-white">
              S
            </span>
            {step === 1 ? "Lancer un scraping ciblé" : "Scraping en cours"}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Sélectionnez les plateformes et définissez vos critères de recherche."
              : `Analyse de ${platforms.length} plateforme(s) — ${fmtTime(elapsedSec)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {step === 1 && (
            <>
              {/* Platforms */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plateformes ({platforms.length} sélectionnée{platforms.length > 1 ? "s" : ""})
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(Object.keys(PLATFORM_META) as ScrapingPlatform[]).map((p) => {
                    const meta = PLATFORM_META[p];
                    const active = platforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={cn(
                          "relative flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-medium transition-all",
                          active
                            ? "border-blue-500/50 bg-blue-500/10 text-foreground ring-1 ring-blue-500/20"
                            : "border-border/50 bg-muted/10 text-muted-foreground hover:border-border hover:bg-muted/20",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[9px] font-bold text-white",
                            meta.color,
                          )}
                        >
                          {meta.icon}
                        </span>
                        <span className="truncate">{meta.label}</span>
                        {active && (
                          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-blue-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Mots-clés de recherche
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Data Analyst Power BI"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  Localisation <span className="font-normal">(optionnel)</span>
                </label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 text-sm text-foreground outline-none transition-all focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
                  placeholder="Ex: Paris, Remote, Lyon..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              {/* Contract Types */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Types de contrat</div>
                <div className="flex flex-wrap gap-1.5">
                  {(["CDI", "CDD", "FREELANCE", "STAGE", "ALTERNANCE"] as ContractType[]).map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleContract(c)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                          contractTypes.includes(c)
                            ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400"
                            : "border-border/50 bg-muted/10 text-muted-foreground hover:bg-muted/20",
                        )}
                      >
                        {c}
                      </button>
                    ),
                  )}
                </div>
              </div>

              {/* Max Results */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Nombre maximum d&apos;offres</span>
                  <span className="rounded bg-muted/30 px-2 py-0.5 font-semibold text-foreground">
                    {maxResults}
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={200}
                  step={10}
                  value={maxResults}
                  onChange={(e) => setMaxResults(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>10</span>
                  <span>200</span>
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Annuler
                </Button>
                <Button size="sm" disabled={disabled || isSubmitting} onClick={handleLaunch}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Lancement...
                    </span>
                  ) : (
                    "Lancer le scraping"
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {/* Global progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Progression globale
                  </span>
                  <span className="text-sm font-bold text-foreground">{globalProgress}%</span>
                </div>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted/30">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-700 ease-out",
                      completed
                        ? "bg-gradient-to-r from-emerald-500 to-green-400"
                        : "bg-gradient-to-r from-blue-600 via-violet-500 to-blue-400",
                    )}
                    style={{ width: `${globalProgress}%` }}
                  />
                  {!completed && globalProgress > 0 && globalProgress < 100 && (
                    <div
                      className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/10 to-transparent"
                      style={{ animationDuration: "1.5s" }}
                    />
                  )}
                </div>
              </div>

              {/* Per-platform progress */}
              <div className="space-y-2 rounded-lg border border-border/40 bg-muted/5 p-3">
                {platformProgress.map((p) => {
                  const meta = PLATFORM_META[p.platform] ?? {
                    label: p.platform,
                    color: "from-gray-500 to-gray-400",
                    icon: "??",
                  };
                  return (
                    <div key={p.platform} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br text-[9px] font-bold text-white",
                          meta.color,
                        )}
                      >
                        {meta.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{meta.label}</span>
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            {p.status === "done" && (
                              <span className="text-emerald-400">&#10003;</span>
                            )}
                            {p.status === "running" && (
                              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                            )}
                            {p.status === "error" && (
                              <span className="text-red-400">&#10007;</span>
                            )}
                            {p.found > 0 && (
                              <span className="font-medium text-foreground">
                                {p.found} offre{p.found > 1 ? "s" : ""}
                              </span>
                            )}
                            <span>{p.percent}%</span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted/30">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              p.status === "done"
                                ? "bg-emerald-500"
                                : p.status === "error"
                                ? "bg-red-500"
                                : `bg-gradient-to-r ${meta.color}`,
                            )}
                            style={{ width: `${p.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/5 px-4 py-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{jobsFound}</div>
                  <div className="text-[10px] text-muted-foreground">Offres trouvées</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">{fmtTime(elapsedSec)}</div>
                  <div className="text-[10px] text-muted-foreground">Temps écoulé</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-foreground">
                    {platformProgress.filter((p) => p.status === "done").length}/{platformProgress.length}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Plateformes</div>
                </div>
              </div>

              {/* Status */}
              <div className="text-center text-xs">
                {completed ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 font-medium text-emerald-400 ring-1 ring-emerald-500/25">
                    <span className="text-sm">&#10003;</span> Scraping terminé avec succès
                  </span>
                ) : error ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-3 py-1.5 font-medium text-red-400 ring-1 ring-red-500/25">
                    Erreur : {error}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                    Analyse des plateformes en cours...
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (completed) onSuccess?.();
                    onOpenChange(false);
                  }}
                >
                  Fermer
                </Button>
                <Button
                  size="sm"
                  disabled={!completed}
                  onClick={() => {
                    onSuccess?.();
                    onOpenChange(false);
                    navigate("/jobs/discovered");
                  }}
                  className="bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:from-emerald-700 hover:to-green-600"
                >
                  Voir les {jobsFound} offres
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
