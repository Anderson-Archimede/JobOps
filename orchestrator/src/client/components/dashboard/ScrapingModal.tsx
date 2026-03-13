import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

interface ScrapingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const ScrapingModal: React.FC<ScrapingModalProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [platforms, setPlatforms] = useState<ScrapingPlatform[]>([
    "linkedin",
    "hellowork",
    "indeed",
    "glassdoor",
    "welcome_jungle",
  ]);
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [contractTypes, setContractTypes] = useState<ContractType[]>([]);
  const [maxResults, setMaxResults] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [globalProgress, setGlobalProgress] = useState(0);
  const [platformProgress, setPlatformProgress] = useState<
    { platform: string; percent: number }[]
  >([]);
  const [jobsFound, setJobsFound] = useState(0);
  const [completed, setCompleted] = useState(false);

  const togglePlatform = (value: ScrapingPlatform) => {
    setPlatforms((prev) =>
      prev.includes(value)
        ? prev.filter((p) => p !== value)
        : [...prev, value],
    );
  };

  const toggleContract = (value: ContractType) => {
    setContractTypes((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : [...prev, value],
    );
  };

  async function launchScraping(): Promise<{
    sessionId: string;
    status: string;
    message: string;
  }> {
    let response: Response;
    const payload = {
      platforms,
      keywords,
      location: location || undefined,
      contractTypes,
      maxResults,
    };

    try {
      response = await fetch("/api/seeker/scraping/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw new Error(
        `Erreur réseau : impossible de joindre le serveur. ` +
          `Vérifie que le backend est démarré. ` +
          `Détail : ${
            networkError instanceof Error
              ? networkError.message
              : String(networkError)
          }`,
      );
    }

    const rawText = await response.text();

    let data: any;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      // Le body n'est pas du JSON valide
      // eslint-disable-next-line no-console
      console.error("[scraping/launch] Réponse non-JSON reçue:", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        bodyPreview: rawText.slice(0, 300),
      });
      throw new Error(
        `Le serveur a répondu avec un contenu invalide ` +
          `(status ${response.status}). ` +
          `Consulte la console pour le détail.`,
      );
    }

    if (!response.ok || !data?.ok) {
      const err = data as { error?: { message?: string } };
      throw new Error(
        err?.error?.message ?? `Erreur ${response.status.toString()}`,
      );
    }

    return data.data as {
      sessionId: string;
      status: string;
      message: string;
    };
  }

  const handleLaunch = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await launchScraping();

      const newSessionId: string | null = result.sessionId ?? null;
      setSessionId(newSessionId);
      setStep(2);
      setCompleted(false);
      setGlobalProgress(0);
      setPlatformProgress([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = platforms.length === 0 || keywords.trim().length < 2;

  // Reset state when modal is closed
  useEffect(() => {
    if (!open) {
      setStep(1);
      setError(null);
      setSessionId(null);
      setGlobalProgress(0);
      setPlatformProgress([]);
      setJobsFound(0);
      setCompleted(false);
    }
  }, [open]);

  // Subscribe to SSE progress when in step 2
  useEffect(() => {
    if (!open || step !== 2 || !sessionId) return;

    const source = new EventSource(
      `/api/seeker/scraping/sessions/${sessionId}/progress`,
    );

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "progress") {
          setGlobalProgress(payload.progress ?? 0);
          if (Array.isArray(payload.platforms)) {
            setPlatformProgress(payload.platforms);
          }
        }
        if (payload.type === "completed") {
          setJobsFound(payload.jobsFound ?? 0);
          setCompleted(true);
          setGlobalProgress(100);
        }
        if (payload.type === "error") {
          setError(payload.message ?? "Erreur de suivi du scraping");
        }
      } catch {
        // ignore parsing errors
      }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  }, [open, step, sessionId]);

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open && completed) onSuccess?.();
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Lancer un scraping ciblé</DialogTitle>
          <DialogDescription>
            Configure les plateformes et mots-clés pour découvrir de nouvelles
            offres correspondant à ton profil.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {step === 1 && (
            <>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plateformes
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  "linkedin",
                  "hellowork",
                  "indeed",
                  "glassdoor",
                  "france_travail",
                  "welcome_jungle",
                  "meteojob",
                ] as ScrapingPlatform[]
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    platforms.includes(p)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Mots-clés
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex: Data Analyst Power BI Paris"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Localisation (optionnel)
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder="Ex: Paris, Remote, Lyon..."
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              Types de contrat
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                ["CDI", "CDD", "FREELANCE", "STAGE", "ALTERNANCE"] as ContractType[]
              ).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleContract(c)}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    contractTypes.includes(c)
                      ? "bg-secondary text-secondary-foreground border-secondary"
                      : "bg-muted/40 text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Nombre maximum d&apos;offres</span>
              <span className="font-semibold text-foreground">
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
              className="w-full"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={disabled || isSubmitting}
              onClick={handleLaunch}
            >
              {isSubmitting ? "Lancement..." : "Lancer le scraping"}
            </Button>
          </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progression globale</span>
                  <span className="font-semibold text-foreground">
                    {globalProgress}%
                  </span>
                </div>
                <Progress value={globalProgress} className="h-2" />
              </div>

              <div className="space-y-1">
                {platformProgress.map((p) => (
                  <div
                    key={p.platform}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {p.platform}
                    </span>
                    <div className="flex-1 mx-2 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                        style={{ width: `${p.percent}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-muted-foreground">
                      {p.percent}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                {completed ? (
                  <span className="text-emerald-400">
                    {jobsFound} offres trouvées.{" "}
                  </span>
                ) : (
                  <span>Scraping en cours...</span>
                )}
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-2 py-1">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
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
                  type="button"
                  size="sm"
                  disabled={!completed}
                  onClick={() => {
                    onSuccess?.();
                    onOpenChange(false);
                    window.location.href = "/jobs/all";
                  }}
                >
                  Voir les offres
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

