import type {
  JobListItem,
  PostApplicationInboxItem,
  PostApplicationProvider,
  PostApplicationSyncRun,
} from "@shared/types";
import { POST_APPLICATION_PROVIDERS } from "@shared/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle,
  CheckCircle2,
  Clock,
  Filter,
  Inbox,
  Link2,
  Loader2,
  Mail,
  MailCheck,
  MailX,
  MessageSquareText,
  RefreshCcw,
  Search,
  Settings2,
  Sparkles,
  Timer,
  TrendingUp,
  Unplug,
  Upload,
  XCircle,
  Zap,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useQueryErrorToast } from "@/client/hooks/useQueryErrorToast";
import { queryKeys } from "@/client/lib/queryKeys";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trackProductEvent } from "@/lib/analytics";
import { cn, formatDateTime } from "@/lib/utils";
import * as api from "../api";
import { ApplicationsList } from "./tracking-inbox/ApplicationsList";
import { EmailViewerList } from "./tracking-inbox/EmailViewerList";

const PROVIDER_OPTIONS: PostApplicationProvider[] = [
  ...POST_APPLICATION_PROVIDERS,
];
const GMAIL_OAUTH_RESULT_TYPE = "gmail-oauth-result";
const GMAIL_OAUTH_TIMEOUT_MS = 3 * 60 * 1000;
const EMPTY_INBOX_ITEMS: PostApplicationInboxItem[] = [];
const EMPTY_SYNC_RUNS: PostApplicationSyncRun[] = [];

type GmailOauthResultMessage = {
  type: string;
  state?: string;
  code?: string;
  error?: string;
};

type TabId = "inbox" | "candidatures" | "timeline" | "analytics" | "settings";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "inbox", label: "Boîte de réception", icon: Inbox },
  { id: "candidatures", label: "Mes candidatures", icon: Briefcase },
  { id: "timeline", label: "Historique synchros", icon: Clock },
  { id: "analytics", label: "Analytiques", icon: BarChart3 },
  { id: "settings", label: "Configuration", icon: Settings2 },
];

function formatEpochMs(value?: number | null): string {
  if (!value) return "n/a";
  return formatDateTime(new Date(value).toISOString()) ?? "n/a";
}

function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function statusRunColor(status: string) {
  switch (status) {
    case "completed":
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    case "running":
      return "text-blue-400 bg-blue-500/10 border-blue-500/20";
    case "failed":
      return "text-red-400 bg-red-500/10 border-red-500/20";
    case "cancelled":
      return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    default:
      return "text-muted-foreground bg-muted/30 border-border/50";
  }
}

function messageTypeIcon(type: string) {
  switch (type) {
    case "interview":
      return <MessageSquareText className="h-4 w-4 text-blue-400" />;
    case "rejection":
      return <MailX className="h-4 w-4 text-red-400" />;
    case "offer":
      return <Sparkles className="h-4 w-4 text-amber-400" />;
    case "update":
      return <ArrowUpRight className="h-4 w-4 text-emerald-400" />;
    default:
      return <Mail className="h-4 w-4 text-muted-foreground" />;
  }
}

function messageTypeLabel(type: string) {
  switch (type) {
    case "interview":
      return "Entretien";
    case "rejection":
      return "Refus";
    case "offer":
      return "Offre";
    case "update":
      return "Mise à jour";
    default:
      return "Autre";
  }
}

export const TrackingInboxPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>("inbox");
  const [provider, setProvider] = useState<PostApplicationProvider>("gmail");
  const [accountKey, setAccountKey] = useState("default");
  const [maxMessages, setMaxMessages] = useState("100");
  const [searchDays, setSearchDays] = useState("90");
  const [searchFilter, setSearchFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const isDefaultAccountKey = accountKey.trim() === "default";

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<
    "connect" | "sync" | "disconnect" | null
  >(null);

  const [isRunModalOpen, setIsRunModalOpen] = useState(false);
  const [selectedRun, setSelectedRun] = useState<PostApplicationSyncRun | null>(
    null,
  );

  const [appliedJobByMessageId, setAppliedJobByMessageId] = useState<
    Record<string, string>
  >({});

  const statusQuery = useQuery({
    queryKey: queryKeys.postApplication.providerStatus(provider, accountKey),
    queryFn: () => api.postApplicationProviderStatus({ provider, accountKey }),
    enabled: Boolean(provider && accountKey),
  });
  const inboxQuery = useQuery({
    queryKey: queryKeys.postApplication.inbox(provider, accountKey, 100),
    queryFn: () =>
      api.getPostApplicationInbox({ provider, accountKey, limit: 100 }),
    enabled: Boolean(provider && accountKey),
  });
  const runsQuery = useQuery({
    queryKey: queryKeys.postApplication.runs(provider, accountKey, 20),
    queryFn: () =>
      api.getPostApplicationRuns({ provider, accountKey, limit: 20 }),
    enabled: Boolean(provider && accountKey),
  });

  const status = statusQuery.data?.status ?? null;
  const inbox = inboxQuery.data?.items ?? EMPTY_INBOX_ITEMS;
  const runs = runsQuery.data?.runs ?? EMPTY_SYNC_RUNS;

  const runMessagesQuery = useQuery({
    queryKey: queryKeys.postApplication.runMessages(
      selectedRun?.id ?? "",
      provider,
      accountKey,
    ),
    queryFn: () =>
      api.getPostApplicationRunMessages({
        runId: selectedRun?.id ?? "",
        provider,
        accountKey,
      }),
    enabled: Boolean(
      isRunModalOpen && selectedRun?.id && provider && accountKey,
    ),
  });
  const selectedRunItems = runMessagesQuery.data?.items ?? EMPTY_INBOX_ITEMS;
  const isRunMessagesLoading =
    runMessagesQuery.isPending || runMessagesQuery.isFetching;

  const hasReviewItems = useMemo(
    () => inbox.length > 0 || selectedRunItems.length > 0,
    [inbox.length, selectedRunItems.length],
  );

  const appliedJobsQuery = useQuery({
    queryKey: queryKeys.jobs.list({
      statuses: ["applied", "in_progress"],
      view: "list",
    }),
    queryFn: () =>
      api.getJobs({
        statuses: ["applied", "in_progress"],
        view: "list",
      }),
    enabled: hasReviewItems,
  });
  const appliedJobs = useMemo<JobListItem[]>(
    () =>
      (appliedJobsQuery.data?.jobs ?? []).filter(
        (job) => job.status === "applied" || job.status === "in_progress",
      ),
    [appliedJobsQuery.data?.jobs],
  );
  const isAppliedJobsLoading =
    appliedJobsQuery.isPending || appliedJobsQuery.isFetching;

  const [inboxActionDialog, setInboxActionDialog] = useState<{
    isOpen: boolean;
    action: "approve" | "deny" | null;
    itemCount: number;
  }>({ isOpen: false, action: null, itemCount: 0 });
  const isLoading =
    statusQuery.isPending || inboxQuery.isPending || runsQuery.isPending;

  const filteredInbox = useMemo(() => {
    let items = inbox;
    if (typeFilter !== "all") {
      items = items.filter((item) => item.message.messageType === typeFilter);
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      items = items.filter(
        (item) =>
          item.message.subject.toLowerCase().includes(q) ||
          item.message.fromAddress.toLowerCase().includes(q) ||
          (item.message.senderName ?? "").toLowerCase().includes(q) ||
          (item.matchedJob?.employer ?? "").toLowerCase().includes(q),
      );
    }
    return items;
  }, [inbox, typeFilter, searchFilter]);

  const analytics = useMemo(() => {
    const totalRuns = runs.length;
    const totalDiscovered = runs.reduce((s, r) => s + r.messagesDiscovered, 0);
    const totalRelevant = runs.reduce((s, r) => s + r.messagesRelevant, 0);
    const totalMatched = runs.reduce((s, r) => s + r.messagesMatched, 0);
    const totalApproved = runs.reduce((s, r) => s + r.messagesApproved, 0);
    const totalDenied = runs.reduce((s, r) => s + r.messagesDenied, 0);
    const totalErrored = runs.reduce((s, r) => s + r.messagesErrored, 0);
    const matchRate = totalRelevant > 0 ? (totalMatched / totalRelevant) * 100 : 0;
    const approvalRate = totalMatched > 0 ? (totalApproved / (totalApproved + totalDenied)) * 100 : 0;

    const typeBreakdown: Record<string, number> = {};
    for (const item of inbox) {
      const t = item.message.messageType || "other";
      typeBreakdown[t] = (typeBreakdown[t] || 0) + 1;
    }

    const lastSync = runs[0]?.completedAt ?? runs[0]?.startedAt ?? null;
    const successfulRuns = runs.filter((r) => r.status === "completed").length;

    return {
      totalRuns,
      totalDiscovered,
      totalRelevant,
      totalMatched,
      totalApproved,
      totalDenied,
      totalErrored,
      matchRate,
      approvalRate,
      typeBreakdown,
      lastSync,
      successfulRuns,
      pendingCount: inbox.length,
    };
  }, [runs, inbox]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        statusQuery.refetch(),
        inboxQuery.refetch(),
        runsQuery.refetch(),
        hasReviewItems ? appliedJobsQuery.refetch() : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Échec du rafraîchissement";
      toast.error(message);
    } finally {
      setIsRefreshing(false);
    }
  }, [appliedJobsQuery, hasReviewItems, inboxQuery, queryClient, runsQuery, statusQuery]);

  useEffect(() => {
    if (!provider || !accountKey) return;
    setAppliedJobByMessageId({});
  }, [provider, accountKey]);

  useEffect(() => {
    const defaultAppliedJobId = appliedJobs[0]?.id ?? "";
    setAppliedJobByMessageId((previous) => {
      const next = { ...previous };
      let didChange = false;
      for (const item of [...inbox, ...selectedRunItems]) {
        const selectedJobId = next[item.message.id];
        const hasValidSelection = appliedJobs.some(
          (appliedJob) => appliedJob.id === selectedJobId,
        );
        if (!selectedJobId || !hasValidSelection) {
          const matchedJobId = item.message.matchedJobId ?? "";
          const hasValidMatchedJob = appliedJobs.some(
            (appliedJob) => appliedJob.id === matchedJobId,
          );
          const nextJobId = hasValidMatchedJob
            ? matchedJobId
            : defaultAppliedJobId;
          if (next[item.message.id] !== nextJobId) {
            next[item.message.id] = nextJobId;
            didChange = true;
          }
        }
      }
      return didChange ? next : previous;
    });
  }, [appliedJobs, inbox, selectedRunItems]);

  const waitForGmailOauthResult = useCallback(
    (
      expectedState: string,
      popup: Window,
    ): Promise<{ code?: string; error?: string }> => {
      return new Promise((resolve, reject) => {
        let settled = false;

        const close = () => {
          window.clearTimeout(timeoutId);
          window.clearInterval(closedCheckId);
          window.removeEventListener("message", onMessage);
        };

        const finishResolve = (value: { code?: string; error?: string }) => {
          if (settled) return;
          settled = true;
          close();
          try {
            popup.close();
          } catch {
            /* noop */
          }
          resolve(value);
        };

        const finishReject = (message: string) => {
          if (settled) return;
          settled = true;
          close();
          reject(new Error(message));
        };

        const onMessage = (event: MessageEvent<unknown>) => {
          if (event.origin !== window.location.origin) return;
          const data = event.data as GmailOauthResultMessage | undefined;
          if (!data || data.type !== GMAIL_OAUTH_RESULT_TYPE) return;
          if (data.state !== expectedState) return;
          finishResolve({
            ...(data.code ? { code: data.code } : {}),
            ...(data.error ? { error: data.error } : {}),
          });
        };

        const timeoutId = window.setTimeout(() => {
          finishReject("Timed out waiting for Gmail OAuth response.");
        }, GMAIL_OAUTH_TIMEOUT_MS);

        const closedCheckId = window.setInterval(() => {
          if (!popup.closed) return;
          finishReject("Gmail OAuth window was closed before completion.");
        }, 250);

        window.addEventListener("message", onMessage);
      });
    },
    [],
  );

  const runProviderAction = useCallback(
    async (action: "connect" | "sync" | "disconnect") => {
      setIsActionLoading(true);
      setActiveAction(action);
      let syncToastId: string | number | null = null;
      try {
        if (action === "connect") {
          trackProductEvent("tracking_inbox_connect_started", {
            provider,
            account_key_is_default: isDefaultAccountKey,
          });
          if (provider !== "gmail") {
            toast.error(
              `${provider} connect is not implemented yet. Use Gmail for now.`,
            );
            return;
          }

          const oauthStart = await api.postApplicationGmailOauthStart({
            accountKey,
          });
          const popup = window.open(
            oauthStart.authorizationUrl,
            "gmail-oauth-connect",
            "popup,width=520,height=720",
          );
          if (!popup) {
            toast.error(
              "Le navigateur a bloqué le popup OAuth. Autorisez les popups et réessayez.",
            );
            return;
          }

          const oauthResult = await waitForGmailOauthResult(
            oauthStart.state,
            popup,
          );
          if (oauthResult.error) {
            throw new Error(`Gmail OAuth failed: ${oauthResult.error}`);
          }
          if (!oauthResult.code) {
            throw new Error(
              "Gmail OAuth did not return an authorization code.",
            );
          }

          await api.postApplicationGmailOauthExchange({
            accountKey,
            state: oauthStart.state,
            code: oauthResult.code,
          });
          trackProductEvent("tracking_inbox_connect_completed", {
            provider,
            result: "success",
          });
          toast.success("Fournisseur connecté avec succès");
        } else if (action === "sync") {
          const parsedMaxMessages = Number.parseInt(maxMessages, 10);
          const parsedSearchDays = Number.parseInt(searchDays, 10);
          if (
            !Number.isFinite(parsedMaxMessages) ||
            parsedMaxMessages < 1 ||
            parsedMaxMessages > 500 ||
            !Number.isFinite(parsedSearchDays) ||
            parsedSearchDays < 1 ||
            parsedSearchDays > 365
          ) {
            toast.error(
              "Max messages doit être entre 1-500 et jours de recherche entre 1-365.",
            );
            return;
          }
          syncToastId = toast.loading(
            "Synchronisation en cours. Cela peut prendre quelques minutes...",
          );
          trackProductEvent("tracking_inbox_sync_started", {
            provider,
            max_messages: parsedMaxMessages,
            search_days: parsedSearchDays,
          });

          await api.postApplicationProviderSync({
            provider,
            accountKey,
            maxMessages: parsedMaxMessages,
            searchDays: parsedSearchDays,
          });
          trackProductEvent("tracking_inbox_sync_completed", {
            provider,
            result: "success",
          });
          toast.success("Synchronisation terminée", {
            ...(syncToastId ? { id: syncToastId } : {}),
          });
        } else {
          await api.postApplicationProviderDisconnect({ provider, accountKey });
          trackProductEvent("tracking_inbox_disconnect_confirmed", {
            provider,
          });
          toast.success("Fournisseur déconnecté");
        }

        await refresh();
      } catch (error) {
        if (action === "connect") {
          const message = error instanceof Error ? error.message : "";
          trackProductEvent("tracking_inbox_connect_completed", {
            provider,
            result: message.includes("Timed out")
              ? "timeout"
              : message.includes("window was closed")
                ? "cancelled"
                : "error",
          });
        }
        if (action === "sync") {
          trackProductEvent("tracking_inbox_sync_completed", {
            provider,
            result: "error",
          });
        }
        const message =
          error instanceof Error
            ? error.message
            : `Échec de l'action ${action}`;
        if (syncToastId) {
          toast.error(message, { id: syncToastId });
        } else {
          toast.error(message);
        }
      } finally {
        setActiveAction(null);
        setIsActionLoading(false);
      }
    },
    [
      accountKey,
      isDefaultAccountKey,
      maxMessages,
      provider,
      refresh,
      searchDays,
      waitForGmailOauthResult,
    ],
  );

  const handleDecision = useCallback(
    async (
      item: PostApplicationInboxItem,
      decision: "approve" | "deny",
      context: "main_inbox" | "run_modal",
    ) => {
      const selectedJobId =
        appliedJobByMessageId[item.message.id] || item.message.matchedJobId;

      if (decision === "approve" && !selectedJobId) {
        toast.error("Sélectionnez un job avant de confirmer.");
        return;
      }

      setIsActionLoading(true);
      try {
        if (decision === "approve") {
          await api.approvePostApplicationInboxItem({
            messageId: item.message.id,
            provider,
            accountKey,
            jobId: selectedJobId ?? undefined,
            stageTarget: item.message.stageTarget ?? undefined,
          });
          trackProductEvent("tracking_inbox_review_action_completed", {
            action: "approve",
            context,
            item_count: 1,
            provider,
            result: "success",
          });
          toast.success("Message associé au job");
        } else {
          await api.denyPostApplicationInboxItem({
            messageId: item.message.id,
            provider,
            accountKey,
          });
          trackProductEvent("tracking_inbox_review_action_completed", {
            action: "deny",
            context,
            item_count: 1,
            provider,
            result: "success",
          });
          toast.success("Message ignoré");
        }

        await refresh();
      } catch (error) {
        trackProductEvent("tracking_inbox_review_action_completed", {
          action: decision,
          context,
          item_count: 1,
          provider,
          result: "error",
        });
        const message =
          error instanceof Error
            ? error.message
            : `Échec de l'action ${decision}`;
        toast.error(message);
      } finally {
        setIsActionLoading(false);
      }
    },
    [accountKey, appliedJobByMessageId, provider, refresh],
  );

  const handleInboxAction = useCallback(
    async (action: "approve" | "deny") => {
      if (inbox.length === 0) return;

      setIsActionLoading(true);
      setInboxActionDialog({ isOpen: false, action: null, itemCount: 0 });

      try {
        const result = await api.runPostApplicationInboxAction({
          action,
          provider,
          accountKey,
        });

        const { succeeded, failed, skipped } = result;
        const actionLabel = action === "approve" ? "approuvés" : "ignorés";
        trackProductEvent("tracking_inbox_review_action_completed", {
          action,
          context: "main_inbox",
          item_count: result.requested,
          provider,
          result:
            failed === result.requested && result.requested > 0
              ? "error"
              : "success",
        });

        if (failed === 0 && skipped === 0) {
          toast.success(`${succeeded} messages ${actionLabel}`);
        } else if (failed === 0) {
          toast.success(
            `${succeeded} ${actionLabel}, ${skipped} ignoré(s) (pas de correspondance)`,
          );
        } else {
          toast.error(
            `${succeeded} ${actionLabel}, ${failed} échoué(s), ${skipped} ignoré(s)`,
          );
        }

        await refresh();
      } catch (error) {
        trackProductEvent("tracking_inbox_review_action_completed", {
          action,
          context: "main_inbox",
          item_count: inbox.length,
          provider,
          result: "error",
        });
        const message =
          error instanceof Error
            ? error.message
            : `Échec de l'action ${action}`;
        toast.error(message);
      } finally {
        setIsActionLoading(false);
      }
    },
    [accountKey, inbox.length, provider, refresh],
  );

  const openInboxActionDialog = useCallback(
    (action: "approve" | "deny") => {
      const eligibleCount =
        action === "approve"
          ? inbox.filter((item) => item.matchedJob).length
          : inbox.length;

      if (eligibleCount === 0) {
        toast.error(
          action === "approve"
            ? "Aucun message avec correspondance à approuver"
            : "Aucun message à ignorer",
        );
        return;
      }

      setInboxActionDialog({
        isOpen: true,
        action,
        itemCount: eligibleCount,
      });
    },
    [inbox],
  );

  const handleOpenRunMessages = useCallback((run: PostApplicationSyncRun) => {
    setSelectedRun(run);
    setIsRunModalOpen(true);
  }, []);

  const handleAppliedJobChange = useCallback(
    (messageId: string, value: string) => {
      setAppliedJobByMessageId((previous) => ({
        ...previous,
        [messageId]: value,
      }));
    },
    [],
  );

  useQueryErrorToast(
    statusQuery.error,
    "Échec du chargement du statut de connexion",
  );
  useQueryErrorToast(inboxQuery.error, "Échec du chargement de la boîte de réception");
  useQueryErrorToast(runsQuery.error, "Échec du chargement des synchros");
  useQueryErrorToast(
    appliedJobsQuery.error,
    "Échec du chargement des jobs",
  );
  useQueryErrorToast(
    runMessagesQuery.error,
    "Échec du chargement des messages de la synchro",
  );

  const isConnected = Boolean(status?.connected);

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E94560]/20 to-[#E94560]/5 border border-[#E94560]/20">
                <Mail className="h-5 w-5 text-[#E94560]" />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Inbox Tracker</h1>
                <p className="text-xs text-muted-foreground">Suivi automatique de vos candidatures par email</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Connection status badge */}
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                isConnected
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-muted-foreground bg-muted/30 border-border/50"
              )}>
                <span className={cn("h-1.5 w-1.5 rounded-full", isConnected ? "bg-emerald-400" : "bg-muted-foreground")} />
                {isConnected ? "Connecté" : "Déconnecté"}
              </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void refresh()}
            disabled={isRefreshing || isLoading}
                className="gap-1.5 h-8 text-xs"
          >
            {isRefreshing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
                  <RefreshCcw className="h-3.5 w-3.5" />
            )}
                Rafraîchir
          </Button>
            </div>
          </div>

          {/* KPI Bar */}
          <div className="flex items-center gap-6 mt-4">
            {[
              { label: "En attente", value: analytics.pendingCount, icon: Timer, color: "text-amber-400" },
              { label: "Découverts", value: analytics.totalDiscovered, icon: Mail, color: "text-blue-400" },
              { label: "Correspondances", value: analytics.totalMatched, icon: MailCheck, color: "text-emerald-400" },
              { label: "Approuvés", value: analytics.totalApproved, icon: CheckCircle, color: "text-green-400" },
              { label: "Synchros", value: analytics.totalRuns, icon: Activity, color: "text-purple-400" },
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
          <div className="flex items-center gap-1 mt-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-[#E94560]/10 text-[#E94560] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {tab.id === "inbox" && analytics.pendingCount > 0 && (
                  <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#E94560] px-1 text-[9px] font-bold text-white">
                    {analytics.pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ─── INBOX TAB ─── */}
          {activeTab === "inbox" && (
            <div className="space-y-4">
              {/* Filters bar */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
                  <input
                    type="text"
                    placeholder="Rechercher par expéditeur, sujet, entreprise..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 transition-all"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px] h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="interview">Entretiens</SelectItem>
                    <SelectItem value="rejection">Refus</SelectItem>
                    <SelectItem value="offer">Offres</SelectItem>
                    <SelectItem value="update">Mises à jour</SelectItem>
                    <SelectItem value="other">Autres</SelectItem>
                  </SelectContent>
                </Select>

                {inbox.length > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      disabled={isActionLoading}
                      onClick={() => openInboxActionDialog("approve")}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Tout approuver
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                      disabled={isActionLoading}
                      onClick={() => openInboxActionDialog("deny")}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Tout ignorer
                    </Button>
                  </div>
                )}
              </div>

              {/* Inbox items */}
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 opacity-40" />
                  <p className="text-sm">Chargement de la boîte de réception...</p>
                </div>
              ) : filteredInbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/40 mb-4">
                    <Inbox className="h-7 w-7 opacity-30" />
                  </div>
                  <p className="text-sm font-medium">Aucun message en attente</p>
                  <p className="text-xs mt-1">
                    {inbox.length > 0
                      ? "Aucun résultat pour ce filtre"
                      : "Lancez une synchronisation pour récupérer vos emails"}
                  </p>
                  {!isConnected && (
                    <Button
                      size="sm"
                      className="mt-4 gap-1.5"
                      onClick={() => {
                        setActiveTab("settings");
                      }}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      Configurer la connexion
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredInbox.map((item) => {
                    const selectedAppliedJobId =
                      appliedJobByMessageId[item.message.id] ||
                      item.message.matchedJobId ||
                      "";

                    return (
                      <div
                        key={item.message.id}
                        className="group rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border/70 transition-all overflow-hidden"
                      >
                        <div className="flex items-start gap-3 p-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 border border-border/30">
                            {messageTypeIcon(item.message.messageType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold truncate">
                                {item.message.senderName || item.message.fromAddress.split("<")[0].trim() || "Expéditeur inconnu"}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", statusRunColor(item.message.messageType === "interview" ? "completed" : item.message.messageType === "rejection" ? "failed" : "running"))}>
                                {messageTypeLabel(item.message.messageType)}
                              </Badge>
                              {item.message.matchConfidence !== null && (
                                <span className={cn("text-[10px] tabular-nums", item.message.matchConfidence >= 80 ? "text-emerald-400" : item.message.matchConfidence >= 50 ? "text-amber-400" : "text-muted-foreground/60")}>
                                  {Math.round(item.message.matchConfidence)}%
                                </span>
                              )}
                              <span className="ml-auto text-[10px] text-muted-foreground/60 shrink-0">
                                {item.message.receivedAt ? relativeTime(item.message.receivedAt) : "n/a"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground truncate mb-1">{item.message.fromAddress}</p>
                            <p className="text-sm font-medium truncate">{item.message.subject}</p>
                            {item.message.snippet && (
                              <p className="text-xs text-muted-foreground/70 truncate mt-1">{item.message.snippet}</p>
                            )}
                            {!item.message.matchedJobId && (
                              <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Aucune correspondance automatique — sélectionnez le bon job
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions row */}
                        <div className="flex items-center gap-2 border-t border-border/30 bg-muted/10 px-4 py-2">
                          <div className="flex-1 min-w-0">
                            <EmailViewerList
                              items={[item]}
                              appliedJobs={appliedJobs}
                              appliedJobByMessageId={{ [item.message.id]: selectedAppliedJobId }}
                              onAppliedJobChange={handleAppliedJobChange}
                              onDecision={(innerItem, decision) =>
                                void handleDecision(innerItem, decision, "main_inbox")
                              }
                              isActionLoading={isActionLoading}
                              isAppliedJobsLoading={isAppliedJobsLoading}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ─── CANDIDATURES TAB ─── */}
          {activeTab === "candidatures" && (
            <div className="space-y-4">
              <div className="mb-4">
                <h2 className="text-base font-semibold">Base de données personnelle des candidatures</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Suivez l'état de chaque candidature, consultez l'historique et analysez les refus pour améliorer vos prochaines candidatures.
                </p>
              </div>
              <ApplicationsList />
            </div>
          )}

          {/* ─── TIMELINE TAB ─── */}
          {activeTab === "timeline" && (
            <div className="space-y-4">
          <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">Historique des synchronisations</h2>
                <span className="text-xs text-muted-foreground">{runs.length} synchro{runs.length !== 1 ? "s" : ""}</span>
          </div>

              {runs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <Clock className="h-8 w-8 opacity-30 mb-3" />
                  <p className="text-sm">Aucune synchronisation</p>
                  <p className="text-xs mt-1">Connectez votre boîte mail et lancez une synchro</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-5 top-0 bottom-0 w-px bg-border/30" />
                  <div className="space-y-3">
                    {runs.map((run, index) => (
                      <button
                        key={run.id}
                        type="button"
                        onClick={() => void handleOpenRunMessages(run)}
                        className="group w-full text-left relative pl-12 transition-colors"
                      >
                        <div className={cn(
                          "absolute left-3.5 top-4 h-3 w-3 rounded-full border-2 bg-background z-10",
                          run.status === "completed" ? "border-emerald-400" :
                          run.status === "failed" ? "border-red-400" :
                          run.status === "running" ? "border-blue-400" : "border-amber-400"
                        )} />

                        <div className="rounded-xl border border-border/50 bg-card/40 hover:bg-card/70 hover:border-border/70 p-4 transition-all">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={cn("text-[10px] h-5 border", statusRunColor(run.status))}>
                                {run.status === "completed" ? "Terminée" : run.status === "running" ? "En cours" : run.status === "failed" ? "Échouée" : "Annulée"}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatEpochMs(run.startedAt)}
                              </span>
                              {run.completedAt && (
                                <span className="text-[10px] text-muted-foreground/50">
                                  ({Math.round((run.completedAt - run.startedAt) / 1000)}s)
                                </span>
                              )}
                            </div>
                            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                          </div>

                          <div className="grid grid-cols-4 gap-3 text-xs">
                            <div>
                              <div className="text-muted-foreground/60">Découverts</div>
                              <div className="font-semibold tabular-nums">{run.messagesDiscovered}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground/60">Pertinents</div>
                              <div className="font-semibold tabular-nums">{run.messagesRelevant}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground/60">Correspondances</div>
                              <div className="font-semibold tabular-nums text-emerald-400">{run.messagesMatched}</div>
                            </div>
                            <div>
                              <div className="text-muted-foreground/60">Approuvés</div>
                              <div className="font-semibold tabular-nums text-green-400">{run.messagesApproved}</div>
                            </div>
                          </div>

                          {run.errorMessage && (
                            <p className="mt-2 text-[10px] text-red-400 truncate">{run.errorMessage}</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── ANALYTICS TAB ─── */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              <h2 className="text-base font-semibold">Vue d'ensemble</h2>

              {/* Main KPI cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Taux de correspondance", value: `${analytics.matchRate.toFixed(0)}%`, sub: `${analytics.totalMatched}/${analytics.totalRelevant}`, icon: TrendingUp, color: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/20", iconColor: "text-emerald-400" },
                  { label: "Taux d'approbation", value: `${analytics.approvalRate.toFixed(0)}%`, sub: `${analytics.totalApproved} approuvés`, icon: CheckCircle2, color: "from-green-500/20 to-green-500/5 border-green-500/20", iconColor: "text-green-400" },
                  { label: "Emails analysés", value: String(analytics.totalDiscovered), sub: `${analytics.totalRuns} synchro${analytics.totalRuns !== 1 ? "s" : ""}`, icon: Mail, color: "from-blue-500/20 to-blue-500/5 border-blue-500/20", iconColor: "text-blue-400" },
                  { label: "Dernière synchro", value: analytics.lastSync ? relativeTime(analytics.lastSync) : "Jamais", sub: `${analytics.successfulRuns} réussie${analytics.successfulRuns !== 1 ? "s" : ""}`, icon: RefreshCcw, color: "from-purple-500/20 to-purple-500/5 border-purple-500/20", iconColor: "text-purple-400" },
                ].map((card) => (
                  <div key={card.label} className={cn("rounded-xl border bg-gradient-to-br p-4 space-y-2", card.color)}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{card.label}</span>
                      <card.icon className={cn("h-4 w-4", card.iconColor)} />
                    </div>
                    <div className="text-2xl font-bold tabular-nums">{card.value}</div>
                    <div className="text-[10px] text-muted-foreground/60">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Type breakdown */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Répartition par type</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { type: "interview", label: "Entretiens", icon: MessageSquareText, color: "text-blue-400" },
                    { type: "rejection", label: "Refus", icon: MailX, color: "text-red-400" },
                    { type: "offer", label: "Offres", icon: Sparkles, color: "text-amber-400" },
                    { type: "update", label: "Mises à jour", icon: ArrowUpRight, color: "text-emerald-400" },
                    { type: "other", label: "Autres", icon: Mail, color: "text-muted-foreground" },
                  ].map((t) => (
                    <div key={t.type} className="flex items-center gap-2 rounded-lg bg-muted/20 border border-border/30 p-3">
                      <t.icon className={cn("h-4 w-4", t.color)} />
                      <div>
                        <div className="text-sm font-bold tabular-nums">{analytics.typeBreakdown[t.type] || 0}</div>
                        <div className="text-[10px] text-muted-foreground">{t.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline funnel */}
              <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-4">
                <h3 className="text-sm font-semibold">Entonnoir de traitement</h3>
              <div className="space-y-2">
                  {[
                    { label: "Découverts", value: analytics.totalDiscovered, color: "bg-blue-500" },
                    { label: "Pertinents", value: analytics.totalRelevant, color: "bg-indigo-500" },
                    { label: "Correspondances", value: analytics.totalMatched, color: "bg-emerald-500" },
                    { label: "Approuvés", value: analytics.totalApproved, color: "bg-green-500" },
                  ].map((step) => {
                    const maxVal = Math.max(analytics.totalDiscovered, 1);
                    const pct = (step.value / maxVal) * 100;
                    return (
                      <div key={step.label} className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-32 shrink-0 text-right">{step.label}</span>
                        <div className="flex-1 h-6 rounded-lg bg-muted/20 overflow-hidden">
                          <div
                            className={cn("h-full rounded-lg transition-all duration-700", step.color)}
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold tabular-nums w-10 text-right">{step.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ─── SETTINGS TAB ─── */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-2xl">
              <h2 className="text-base font-semibold">Configuration du fournisseur</h2>

              <div className="rounded-xl border border-border/50 bg-card/40 p-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="provider" className="text-xs">Fournisseur</Label>
                <Select
                  value={provider}
                  onValueChange={(value) =>
                    setProvider(value as PostApplicationProvider)
                  }
                >
                      <SelectTrigger id="provider" className="h-9">
                    <SelectValue placeholder="Provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                            {option === "gmail" ? "Gmail (OAuth)" : option.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                    <Label htmlFor="accountKey" className="text-xs">Clé de compte</Label>
                <Input
                  id="accountKey"
                  value={accountKey}
                  onChange={(event) => setAccountKey(event.target.value)}
                      className="h-9"
                />
              </div>
            </div>

                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Gmail utilise OAuth pour accéder à vos emails en lecture seule. Les identifiants sont stockés côté serveur. Aucune saisie manuelle de token nécessaire.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                    <Label htmlFor="maxMessages" className="text-xs">Messages max</Label>
                <Input
                  id="maxMessages"
                  inputMode="numeric"
                  value={maxMessages}
                  onChange={(event) => setMaxMessages(event.target.value)}
                      className="h-9"
                />
                    <p className="text-[10px] text-muted-foreground/40">1 à 500 messages par synchro</p>
              </div>
              <div className="space-y-2">
                    <Label htmlFor="searchDays" className="text-xs">Jours de recherche</Label>
                <Input
                  id="searchDays"
                  inputMode="numeric"
                  value={searchDays}
                  onChange={(event) => setSearchDays(event.target.value)}
                      className="h-9"
                />
                    <p className="text-[10px] text-muted-foreground/40">1 à 365 jours en arrière</p>
              </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-2 border-t border-border/30">
                {!isConnected ? (
                  <Button
                    onClick={() => void runProviderAction("connect")}
                    disabled={isActionLoading}
                      className="gap-2 bg-gradient-to-r from-[#E94560] to-[#D63B54] hover:from-[#D63B54] hover:to-[#C43048] text-white"
                  >
                      {activeAction === "connect" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                    <Link2 className="h-4 w-4" />
                      )}
                      Connecter Gmail
                  </Button>
                  ) : (
                    <>
                <Button
                  onClick={() => void runProviderAction("sync")}
                  disabled={isActionLoading || !isConnected}
                  className="gap-2"
                >
                  {activeAction === "sync" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                        {activeAction === "sync" ? "Synchronisation..." : "Synchroniser"}
                </Button>
                  <Button
                    onClick={() => void runProviderAction("disconnect")}
                    disabled={isActionLoading}
                    variant="outline"
                        className="gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Unplug className="h-4 w-4" />
                        Déconnecter
                  </Button>
                    </>
                  )}
            </div>

                {/* Connection details */}
                {status?.integration && (
                  <div className="rounded-lg bg-muted/20 border border-border/30 p-3 space-y-1.5">
                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Détails de connexion</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground/60">Statut :</span>{" "}
                        <span className={cn("font-medium", status.integration.status === "connected" ? "text-emerald-400" : status.integration.status === "error" ? "text-red-400" : "text-muted-foreground")}>{status.integration.status}</span>
            </div>
                      <div>
                        <span className="text-muted-foreground/60">Dernière synchro :</span>{" "}
                        <span className="font-medium">{formatEpochMs(status.integration.lastSyncedAt)}</span>
              </div>
                      <div>
                        <span className="text-muted-foreground/60">Connecté le :</span>{" "}
                        <span className="font-medium">{formatEpochMs(status.integration.lastConnectedAt)}</span>
              </div>
                      {status.integration.lastError && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground/60">Dernière erreur :</span>{" "}
                          <span className="text-red-400 text-[10px]">{status.integration.lastError}</span>
                        </div>
                      )}
                      </div>
                      </div>
                )}
                    </div>
              </div>
            )}
        </div>
      </div>

      {/* Run Messages Modal */}
      <Dialog
        open={isRunModalOpen}
        onOpenChange={(open) => {
          setIsRunModalOpen(open);
          if (!open) setSelectedRun(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Messages de la synchronisation
            </DialogTitle>
            <DialogDescription>
              {selectedRun
                ? `${selectedRun.messagesDiscovered} découverts · ${selectedRun.messagesRelevant} pertinents · ${selectedRun.messagesMatched} correspondances`
                : "Détails des messages capturés"}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-92px)] overflow-auto px-6 pb-6">
            {isRunMessagesLoading ? (
              <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Chargement...
              </div>
            ) : selectedRunItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Mail className="h-8 w-8 opacity-30 mb-2" />
                <p className="text-sm">Aucun message trouvé</p>
              </div>
            ) : (
              <EmailViewerList
                items={selectedRunItems}
                appliedJobs={appliedJobs}
                appliedJobByMessageId={appliedJobByMessageId}
                onAppliedJobChange={handleAppliedJobChange}
                onDecision={(item, decision) =>
                  void handleDecision(item, decision, "run_modal")
                }
                isActionLoading={isActionLoading}
                isAppliedJobsLoading={isAppliedJobsLoading}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation */}
      <AlertDialog
        open={inboxActionDialog.isOpen}
        onOpenChange={(open) =>
          setInboxActionDialog((previous) => ({ ...previous, isOpen: open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {inboxActionDialog.action === "approve"
                ? "Approuver tous les messages ?"
                : "Ignorer tous les messages ?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {inboxActionDialog.action === "approve"
                ? `${inboxActionDialog.itemCount} message${inboxActionDialog.itemCount === 1 ? "" : "s"} avec correspondance sera/seront approuvé(s). Les messages sans correspondance seront ignorés.`
                : `${inboxActionDialog.itemCount} message${inboxActionDialog.itemCount === 1 ? "" : "s"} en attente sera/seront ignoré(s).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (inboxActionDialog.action) {
                  void handleInboxAction(inboxActionDialog.action);
                }
              }}
            >
              {inboxActionDialog.action === "approve"
                ? "Tout approuver"
                : "Tout ignorer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
