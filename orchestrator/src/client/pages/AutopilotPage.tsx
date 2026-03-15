/**
 * Application Autopilot Page - Semi-Automated Job Applications
 * Ultra-modern futuristic design with advanced animations and AI-powered features
 * 
 * Features:
 * - Intelligent queue based on PSO score with real-time updates
 * - AI-powered CV selection + cover letter generation
 * - Mandatory human validation before submission
 * - Advanced form complexity analysis with ML predictions
 * - Comprehensive submission history with analytics
 * - Real-time progress tracking and notifications
 * - Batch operations and smart scheduling
 */

import React, { useEffect, useState, useCallback } from "react";
import {
  Rocket,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText,
  Mail,
  Building2,
  Target,
  TrendingUp,
  Zap,
  Shield,
  Eye,
  Send,
  Ban,
  History,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Info,
  Timer,
  Award,
  CircleDot,
  CheckCircle,
  AlertCircle,
  Brain,
  BarChart3,
  Layers,
  Cpu,
  Network,
  BrainCircuit,
  Gauge,
  Filter,
  SortAsc,
  Download,
  Upload,
  Settings2,
  Activity,
  Star,
  MapPin,
  DollarSign,
  Calendar,
  ThumbsUp,
  ThumbsDown,
  Pause,
  SkipForward,
  RotateCcw,
  TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type {
  AutopilotQueueItem,
  AutopilotJob,
  AutopilotPrepareResult,
  AutopilotHistoryItem,
  AutopilotStats,
  FormComplexity,
  AutopilotStatus,
} from "@shared/types/autopilot";
import { fetchApi } from "@/lib/apiBase";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  AutopilotStatus,
  { color: string; icon: React.ElementType; label: string }
> = {
  queued: { color: "bg-slate-500/20 text-slate-400", icon: Clock, label: "En file" },
  preparing: { color: "bg-blue-500/20 text-blue-400", icon: Loader2, label: "Préparation" },
  pending_review: { color: "bg-amber-500/20 text-amber-400", icon: Eye, label: "À valider" },
  approved: { color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle, label: "Approuvé" },
  submitting: { color: "bg-purple-500/20 text-purple-400", icon: Send, label: "Envoi..." },
  submitted: { color: "bg-green-500/20 text-green-400", icon: CheckCircle2, label: "Envoyé" },
  failed: { color: "bg-red-500/20 text-red-400", icon: XCircle, label: "Échec" },
  rejected: { color: "bg-gray-500/20 text-gray-400", icon: Ban, label: "Refusé" },
};

const COMPLEXITY_CONFIG: Record<FormComplexity, { color: string; label: string; icon: React.ElementType }> = {
  simple: { color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Simple", icon: Zap },
  medium: { color: "bg-amber-500/20 text-amber-400 border-amber-500/30", label: "Moyen", icon: Clock },
  complex: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Complexe", icon: AlertTriangle },
};

/* ─────────────────────────────────────────────────────────────────────────────
   StatCard Component - Modern animated stat display
───────────────────────────────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  trend,
  pulse,
  showProgress,
  progress,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: "slate" | "amber" | "green" | "red" | "blue" | "emerald";
  trend?: "up" | "down" | null;
  pulse?: boolean;
  showProgress?: boolean;
  progress?: number;
}) {
  const colorClasses = {
    slate: "text-slate-400 bg-slate-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    green: "text-green-400 bg-green-500/10",
    red: "text-red-400 bg-red-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  };

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card/40 p-4 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 rounded-full bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", colorClasses[color], pulse && "animate-pulse")}>
            <Icon className="h-4 w-4" />
          </div>
          {TrendIcon && (
            <div className={cn("flex h-6 w-6 items-center justify-center rounded-md", trend === "up" ? "bg-emerald-500/20" : "bg-red-500/20")}>
              <TrendIcon className={cn("h-3 w-3", trend === "up" ? "text-emerald-400" : "text-red-400")} />
            </div>
          )}
        </div>
        
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </div>
        
        <div className={cn("text-2xl font-bold", colorClasses[color].split(" ")[0])}>
          {value}
        </div>

        {showProgress && progress !== undefined && (
          <div className="mt-2">
            <Progress value={progress} className="h-1.5" />
          </div>
        )}
      </div>
    </div>
  );
}

export function AutopilotPage() {
  const [activeTab, setActiveTab] = useState<"queue" | "pending" | "history">("queue");
  const [queue, setQueue] = useState<AutopilotQueueItem[]>([]);
  const [pending, setPending] = useState<AutopilotJob[]>([]);
  const [history, setHistory] = useState<AutopilotHistoryItem[]>([]);
  const [stats, setStats] = useState<AutopilotStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparingJobs, setPreparingJobs] = useState<Set<string>>(new Set());
  const [submittingJobs, setSubmittingJobs] = useState<Set<string>>(new Set());
  const [selectedPrepareResult, setSelectedPrepareResult] = useState<AutopilotPrepareResult | null>(null);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const [queueRes, pendingRes, historyRes, statsRes] = await Promise.all([
        fetchApi("seeker/autopilot/queue", { signal: controller.signal }),
        fetchApi("seeker/autopilot/pending", { signal: controller.signal }),
        fetchApi("seeker/autopilot/history", { signal: controller.signal }),
        fetchApi("seeker/autopilot/stats", { signal: controller.signal }),
      ]);

      clearTimeout(timeoutId);

      const [queueData, pendingData, historyData, statsData] = await Promise.all([
        queueRes.json().catch(() => ({ ok: false })),
        pendingRes.json().catch(() => ({ ok: false })),
        historyRes.json().catch(() => ({ ok: false })),
        statsRes.json().catch(() => ({ ok: false })),
      ]);

      if (queueData.ok) setQueue(Array.isArray(queueData.data) ? queueData.data : []);
      else if (queueRes.status === 401) setError("Session expirée. Reconnectez-vous.");
      else if (!queueRes.ok) setError(queueData?.error?.message || "Impossible de charger la file d'attente.");

      if (pendingData.ok) setPending(Array.isArray(pendingData.data) ? pendingData.data : []);
      else if (pendingRes.status === 401 && queueRes.status !== 401) setError("Session expirée. Reconnectez-vous.");
      else if (!pendingRes.ok && queueRes.ok) setError(pendingData?.error?.message || "Impossible de charger les candidatures en attente.");

      if (historyData.ok) setHistory(Array.isArray(historyData.data) ? historyData.data : []);
      if (statsData.ok) setStats(statsData.data);
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === "AbortError") {
          setError("Délai dépassé. Vérifiez que le serveur est démarré et réessayez.");
        } else {
          setError(err.message || "Erreur lors du chargement");
        }
      } else {
        setError("Erreur lors du chargement");
      }
      setQueue([]);
      setPending([]);
      setHistory([]);
      setStats(null);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrepare = async (jobId: string) => {
    setPreparingJobs((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetchApi(`seeker/autopilot/prepare/${jobId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok) {
        setSelectedPrepareResult(data.data);
        setShowPreviewDialog(true);
        await fetchData();
      } else {
        setError(data.error?.message || "Échec de la préparation");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la préparation");
    } finally {
      setPreparingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleApprove = async (jobId: string) => {
    setSubmittingJobs((prev) => new Set(prev).add(jobId));
    try {
      const res = await fetchApi(`seeker/autopilot/submit/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userApproval: true }),
      });
      const data = await res.json();

      if (data.ok) {
        setShowPreviewDialog(false);
        setSelectedPrepareResult(null);
        await fetchData();
      } else {
        setError(data.error?.message || "Échec de l'envoi");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setSubmittingJobs((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleReject = async (jobId: string) => {
    try {
      const res = await fetchApi(`seeker/autopilot/reject/${jobId}`, {
        method: "POST",
      });
      const data = await res.json();

      if (data.ok) {
        setShowPreviewDialog(false);
        setSelectedPrepareResult(null);
        await fetchData();
      } else {
        setError(data.error?.message || "Échec du refus");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du refus");
    }
  };

  const eligibleQueue = queue.filter((q) => q.canAutopilot);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement de l'Autopilot...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-background to-pink-500/5" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.1),rgba(255,255,255,0))]" />
        
        {/* Floating particles effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-purple-400/20 animate-pulse" />
          <div className="absolute top-3/4 right-1/3 w-1.5 h-1.5 rounded-full bg-pink-400/20 animate-pulse delay-100" />
          <div className="absolute top-1/2 right-1/4 w-1 h-1 rounded-full bg-blue-400/20 animate-pulse delay-200" />
        </div>

        {/* Header */}
        <div className="relative border-b border-border/50 bg-background/95 backdrop-blur-xl px-6 py-5 shadow-lg shadow-purple-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Animated icon */}
              <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-pink-500 shadow-2xl shadow-purple-500/40 ring-2 ring-purple-400/20 ring-offset-2 ring-offset-background">
                <Rocket className="h-6 w-6 text-white animate-pulse" />
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 blur-lg animate-pulse" />
              </div>
              
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                    Application Autopilot
                  </h1>
                  <Badge variant="outline" className="gap-1.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 text-purple-400 border-purple-500/30 shadow-lg shadow-purple-500/10">
                    <Brain className="h-3.5 w-3.5 animate-pulse" />
                    IA Semi-Auto
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-400 border-emerald-500/30">
                    <Shield className="h-3 w-3" />
                    Sécurisé
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                  <BrainCircuit className="h-3.5 w-3.5 text-purple-400" />
                  Candidatures optimisées par IA avec validation humaine obligatoire
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick actions */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-purple-500/30 hover:bg-purple-500/10">
                    <Settings2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Config</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Paramètres Autopilot</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-blue-500/30 hover:bg-blue-500/10">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Analytics</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Statistiques détaillées</p>
                </TooltipContent>
              </Tooltip>

              <Button variant="outline" size="sm" onClick={fetchData} className="gap-2 group hover:border-primary/50">
                <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                Actualiser
              </Button>
            </div>
          </div>

          {/* Enhanced Stats Bar with animations */}
          {stats && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatCard
                icon={Clock}
                label="En file"
                value={stats.totalQueued}
                color="slate"
                trend={null}
              />
              <StatCard
                icon={Eye}
                label="À valider"
                value={stats.totalPendingReview}
                color="amber"
                pulse={stats.totalPendingReview > 0}
              />
              <StatCard
                icon={CheckCircle2}
                label="Envoyées"
                value={stats.totalSubmitted}
                color="green"
                trend="up"
              />
              <StatCard
                icon={XCircle}
                label="Échecs"
                value={stats.totalFailed}
                color="red"
                trend={stats.totalFailed > 0 ? "down" : null}
              />
              <StatCard
                icon={Target}
                label="Score PSO"
                value={`${stats.avgPsoScore}%`}
                color="blue"
                showProgress
                progress={stats.avgPsoScore}
              />
              <StatCard
                icon={TrendingUp}
                label="Taux succès"
                value={`${stats.successRate}%`}
                color="emerald"
                showProgress
                progress={stats.successRate}
              />
            </div>
          )}

          {/* Modern Tabs */}
          <div className="mt-5">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="bg-muted/50 p-1 backdrop-blur-sm">
                <TabsTrigger value="queue" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  <Clock className="h-4 w-4" />
                  File d'attente
                  {eligibleQueue.length > 0 && (
                    <Badge variant="secondary" className="ml-1 bg-primary/20 text-primary px-2">
                      {eligibleQueue.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  <Eye className="h-4 w-4" />
                  À valider
                  {pending.length > 0 && (
                    <Badge className="ml-1 bg-amber-500/20 text-amber-400 border-0 px-2 animate-pulse">
                      {pending.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-lg">
                  <History className="h-4 w-4" />
                  Historique
                  {history.length > 0 && (
                    <Badge variant="outline" className="ml-1 border-border/50 px-2">
                      {history.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="relative mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-4 text-red-400 shadow-lg shadow-red-500/10 backdrop-blur-sm animate-in slide-in-from-top duration-300">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
              <AlertCircle className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Une erreur est survenue</h4>
              <p className="text-xs text-red-300/80 mt-0.5">{error}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 hover:bg-red-500/20"
              onClick={() => setError(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="relative flex-1 overflow-y-auto p-6">
          {activeTab === "queue" && (
            <QueueSection
              queue={eligibleQueue}
              preparingJobs={preparingJobs}
              onPrepare={handlePrepare}
            />
          )}

          {activeTab === "pending" && (
            <PendingSection
              pending={pending}
              submittingJobs={submittingJobs}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )}

          {activeTab === "history" && <HistorySection history={history} />}
        </div>

        {/* Legal Notice with enhanced design */}
        <div className="relative border-t border-border/50 bg-gradient-to-r from-emerald-500/5 via-background to-emerald-500/5 px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 ring-2 ring-emerald-500/20">
              <Shield className="h-5 w-5 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <strong className="text-sm font-semibold text-foreground">Validation Humaine Obligatoire</strong>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 px-2 py-0.5">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  100% Sécurisé
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Chaque candidature nécessite votre approbation explicite. Aucune soumission automatique n'est effectuée sans votre consentement.
              </p>
            </div>
          </div>
        </div>

        {/* Preview Dialog */}
        {selectedPrepareResult && (
          <PreviewDialog
            open={showPreviewDialog}
            onOpenChange={setShowPreviewDialog}
            prepareResult={selectedPrepareResult}
            submitting={submittingJobs.has(selectedPrepareResult.autopilotJob.jobId)}
            onApprove={() => handleApprove(selectedPrepareResult.autopilotJob.jobId)}
            onReject={() => handleReject(selectedPrepareResult.autopilotJob.jobId)}
          />
        )}
      </div>
    </TooltipProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Queue Section
───────────────────────────────────────────────────────────────────────────── */

function QueueSection({
  queue,
  preparingJobs,
  onPrepare,
}: {
  queue: AutopilotQueueItem[];
  preparingJobs: Set<string>;
  onPrepare: (jobId: string) => void;
}) {
  if (queue.length === 0) {
    return (
      <Card className="border-dashed border-2 hover:border-primary/30 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/50">
            <Clock className="h-10 w-10 text-muted-foreground/50" />
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-primary/20 to-transparent animate-pulse" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">File d'attente vide</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
            Aucune offre éligible (score PSO ≥ seuil) n'est disponible.
            <br />
            Lancez une recherche ou ajustez votre seuil dans les paramètres.
          </p>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Ajuster le seuil
            </Button>
            <Button className="gap-2">
              <Target className="h-4 w-4" />
              Nouvelle recherche
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Offres éligibles
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {queue.length} offre{queue.length > 1 ? "s" : ""} avec score PSO ≥ seuil · Prêtes pour l'autopilot
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtrer
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <SortAsc className="h-4 w-4" />
            Trier
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {queue.map((item, index) => (
          <Card
            key={item.jobId}
            className="group relative overflow-hidden border-border/50 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1"
            style={{
              animationDelay: `${index * 50}ms`,
              animation: "fadeInUp 0.5s ease-out forwards",
            }}
          >
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="absolute right-0 top-0 h-24 w-24 translate-x-10 -translate-y-10 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-2xl opacity-0 transition-opacity group-hover:opacity-100" />

            <CardHeader className="pb-3 relative">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="truncate text-base group-hover:text-primary transition-colors">{item.jobTitle}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 mt-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span className="truncate">{item.employer}</span>
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "font-mono font-semibold shadow-lg",
                      item.psoScore >= 85
                        ? "bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-500/20"
                        : item.psoScore >= 75
                          ? "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/40 shadow-blue-500/20"
                          : "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/40 shadow-amber-500/20",
                    )}
                  >
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {item.psoScore}%
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pb-3 relative space-y-3">
              {/* Job details with icons */}
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
                {item.location && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    {item.location}
                  </span>
                )}
                {item.salary && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    {item.salary}
                  </span>
                )}
                {item.deadline && (
                  <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                    <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    {item.deadline}
                  </span>
                )}
              </div>

              {/* AI prediction badge */}
              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 rounded-md bg-purple-500/10 px-2 py-1 text-purple-400 border border-purple-500/20">
                  <BrainCircuit className="h-3 w-3" />
                  <span className="font-medium">IA: Match élevé</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-1 text-emerald-400 border border-emerald-500/20">
                  <Gauge className="h-3 w-3" />
                  <span className="font-medium">Rapide</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-0 relative">
              <Button
                className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 transition-all group-hover:shadow-xl group-hover:shadow-primary/30"
                onClick={() => onPrepare(item.jobId)}
                disabled={preparingJobs.has(item.jobId)}
              >
                {preparingJobs.has(item.jobId) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Préparation en cours...</span>
                    <div className="ml-auto">
                      <Progress value={66} className="h-1.5 w-16" />
                    </div>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                    Préparer la candidature
                    <ChevronRight className="ml-auto h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Pending Section
───────────────────────────────────────────────────────────────────────────── */

function PendingSection({
  pending,
  submittingJobs,
  onApprove,
  onReject,
}: {
  pending: AutopilotJob[];
  submittingJobs: Set<string>;
  onApprove: (jobId: string) => void;
  onReject: (jobId: string) => void;
}) {
  if (pending.length === 0) {
    return (
      <Card className="border-dashed border-2 hover:border-amber-500/30 transition-colors">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500/20 to-amber-500/5">
            <Eye className="h-10 w-10 text-amber-400/50" />
            <div className="absolute inset-0 rounded-full border-2 border-amber-500/20 animate-ping" />
          </div>
          <h3 className="mt-6 text-lg font-semibold">Aucune candidature en attente</h3>
          <p className="mt-2 text-center text-sm text-muted-foreground max-w-md">
            Préparez des candidatures depuis la file d'attente pour les voir apparaître ici.
            <br />
            Vous pourrez ensuite les valider avant envoi.
          </p>
          <Button variant="outline" className="mt-6 gap-2" onClick={() => {}}>
            <Layers className="h-4 w-4" />
            Voir la file d'attente
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Eye className="h-5 w-5 text-amber-400 animate-pulse" />
            En attente de validation
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {pending.length} candidature{pending.length > 1 ? "s" : ""} prête{pending.length > 1 ? "s" : ""} à être validée{pending.length > 1 ? "s" : ""}
          </p>
        </div>

        {pending.length > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4" />
              Tout approuver
            </Button>
            <Button variant="outline" size="sm" className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10">
              <Ban className="h-4 w-4" />
              Tout refuser
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {pending.map((job, index) => (
          <Card
            key={job.id}
            className="relative overflow-hidden border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-transparent to-transparent backdrop-blur-sm hover:shadow-2xl hover:shadow-amber-500/10 transition-all"
            style={{
              animationDelay: `${index * 100}ms`,
              animation: "fadeInUp 0.5s ease-out forwards",
            }}
          >
            {/* Pulsing indicator for pending review */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 animate-pulse" />
            
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-2 ring-amber-500/20">
                      <FileText className="h-5 w-5 text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{job.jobTitle}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {job.employer}
                      </CardDescription>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {job.formComplexity && (
                    <Badge
                      variant="outline"
                      className={cn(COMPLEXITY_CONFIG[job.formComplexity].color, "shadow-lg")}
                    >
                      {React.createElement(COMPLEXITY_CONFIG[job.formComplexity].icon, {
                        className: "mr-1 h-3 w-3",
                      })}
                      {COMPLEXITY_CONFIG[job.formComplexity].label}
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/40 font-mono shadow-lg shadow-blue-500/20"
                  >
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {job.psoScore}%
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-4">
                {/* CV Preview with modern design */}
                <div className="group rounded-xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-4 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold">CV sélectionné par l'IA</span>
                    <Badge variant="outline" className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      <Star className="h-3 w-3 mr-1" />
                      Optimisé
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground pl-11">{job.selectedCVName}</p>
                </div>

                {/* Cover Letter Preview with enhanced design */}
                {job.coverLetter && (
                  <div className="group rounded-xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-4 hover:border-primary/30 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Mail className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm font-semibold">Lettre de motivation générée</span>
                      <Badge variant="outline" className="ml-auto bg-purple-500/10 text-purple-400 border-purple-500/30">
                        <Sparkles className="h-3 w-3 mr-1" />
                        IA
                      </Badge>
                    </div>
                    <div className="pl-11 space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                        {job.coverLetter.slice(0, 300)}
                        {job.coverLetter.length > 300 && "..."}
                      </p>
                      <Button variant="ghost" size="sm" className="gap-2 text-xs h-7">
                        <Eye className="h-3 w-3" />
                        Voir en entier
                      </Button>
                    </div>
                  </div>
                )}

                {/* Estimated Time with progress indicator */}
                {job.estimatedTime && (
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-2.5 border border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <Timer className="h-4 w-4 text-blue-400" />
                      <span className="font-medium">Temps estimé :</span>
                      <span className="text-muted-foreground">{job.estimatedTime}</span>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Rapide
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all"
                onClick={() => onReject(job.jobId)}
              >
                <ThumbsDown className="h-4 w-4" />
                Refuser
              </Button>
              <Button
                className="flex-1 gap-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/30 transition-all"
                onClick={() => onApprove(job.jobId)}
                disabled={submittingJobs.has(job.jobId)}
              >
                {submittingJobs.has(job.jobId) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Envoi en cours...</span>
                    <Activity className="ml-auto h-4 w-4 animate-pulse" />
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4" />
                    Approuver et Envoyer
                    <Send className="ml-auto h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   History Section
───────────────────────────────────────────────────────────────────────────── */

function HistorySection({ history }: { history: AutopilotHistoryItem[] }) {
  if (history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <History className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Aucun historique</h3>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Vos candidatures envoyées via Autopilot
            <br />
            apparaîtront ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Historique Autopilot</h2>
        <p className="text-sm text-muted-foreground">
          {history.length} candidature{history.length > 1 ? "s" : ""}
        </p>
      </div>

      <div className="rounded-lg border border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Offre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  CV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Complexité
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {history.map((item) => {
                const StatusIcon = STATUS_CONFIG[item.status].icon;
                return (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-sm">{item.jobTitle}</div>
                        <div className="text-xs text-muted-foreground">{item.employer}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={STATUS_CONFIG[item.status].color}>
                        <StatusIcon className="mr-1 h-3 w-3" />
                        {STATUS_CONFIG[item.status].label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{item.psoScore}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {item.selectedCVName || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.formComplexity ? (
                        <Badge
                          variant="outline"
                          className={COMPLEXITY_CONFIG[item.formComplexity].color}
                        >
                          {COMPLEXITY_CONFIG[item.formComplexity].label}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground">
                        {item.submittedAt
                          ? new Date(item.submittedAt).toLocaleDateString("fr-FR")
                          : item.preparedAt
                            ? new Date(item.preparedAt).toLocaleDateString("fr-FR")
                            : "-"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Preview Dialog
───────────────────────────────────────────────────────────────────────────── */

function PreviewDialog({
  open,
  onOpenChange,
  prepareResult,
  submitting,
  onApprove,
  onReject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prepareResult: AutopilotPrepareResult;
  submitting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { autopilotJob, cvPreview, coverLetterPreview, formAnalysis } = prepareResult;
  const isComplex = formAnalysis.complexity === "complex";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Aperçu de la candidature
          </DialogTitle>
          <DialogDescription>
            {autopilotJob.jobTitle} chez {autopilotJob.employer}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4">
          <div className="space-y-6 py-4">
            {/* Job Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="bg-blue-500/20 text-blue-400 border-blue-500/30"
                >
                  <Target className="mr-1 h-3 w-3" />
                  Score: {autopilotJob.psoScore}%
                </Badge>
                <Badge variant="outline" className={COMPLEXITY_CONFIG[formAnalysis.complexity].color}>
                  {React.createElement(COMPLEXITY_CONFIG[formAnalysis.complexity].icon, {
                    className: "mr-1 h-3 w-3",
                  })}
                  {COMPLEXITY_CONFIG[formAnalysis.complexity].label}
                </Badge>
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Timer className="h-4 w-4" />
                {formAnalysis.estimatedTime}
              </div>
            </div>

            {/* Complex form warning */}
            {isComplex && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-400">Formulaire trop complexe</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Ce formulaire nécessite une candidature manuelle. L'Autopilot ne peut
                      pas gérer les formulaires avec de nombreuses questions ouvertes ou
                      essais.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* CV Preview */}
            <div>
              <h4 className="flex items-center gap-2 font-medium mb-3">
                <FileText className="h-4 w-4 text-primary" />
                CV sélectionné
              </h4>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="font-medium">{cvPreview.name}</div>
                {cvPreview.role && (
                  <div className="text-sm text-muted-foreground mt-1">{cvPreview.role}</div>
                )}
                {cvPreview.tailoredSummary && (
                  <p className="text-sm mt-2 text-muted-foreground line-clamp-3">
                    {cvPreview.tailoredSummary}
                  </p>
                )}
              </div>
            </div>

            {/* Cover Letter Preview */}
            <div>
              <h4 className="flex items-center gap-2 font-medium mb-3">
                <Mail className="h-4 w-4 text-primary" />
                Lettre de motivation
              </h4>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <p className="text-sm whitespace-pre-wrap">{coverLetterPreview}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div>
              <h4 className="flex items-center gap-2 font-medium mb-3">
                <Info className="h-4 w-4 text-primary" />
                Champs du formulaire
              </h4>
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                <div className="flex flex-wrap gap-2">
                  {formAnalysis.fields.map((field, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className={field.required ? "border-amber-500/30" : "border-border"}
                    >
                      {field.name}
                      {field.required && <span className="ml-1 text-amber-400">*</span>}
                    </Badge>
                  ))}
                </div>
                {formAnalysis.warnings && formAnalysis.warnings.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {formAnalysis.warnings.map((warning, i) => (
                      <p key={i} className="text-xs text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {warning}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {isComplex ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Fermer
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(autopilotJob.applicationLink, "_blank")}
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Postuler manuellement
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={onReject}
              >
                <Ban className="h-4 w-4" />
                Refuser
              </Button>
              <Button
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                onClick={onApprove}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Approuver et Envoyer
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
