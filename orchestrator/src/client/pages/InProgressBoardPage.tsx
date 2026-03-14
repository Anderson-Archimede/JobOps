import { PageMain } from "@client/components/layout";
import {
  APPLICATION_STAGES,
  type ApplicationStage,
  type JobListItem,
  STAGE_LABELS,
  type StageEvent,
} from "@shared/types.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownAZ,
  BarChart3,
  Briefcase,
  ChevronRight,
  Columns3,
  ExternalLink,
  LayoutList,
  Loader2,
  MapPin,
  Plus,
  RefreshCcw,
  Search,
  TrendingUp,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useQueryErrorToast } from "@/client/hooks/useQueryErrorToast";
import { queryKeys } from "@/client/lib/queryKeys";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatTimestamp } from "@/lib/utils";
import * as api from "../api";

type BoardCard = {
  job: JobListItem;
  stage: ApplicationStage;
  latestEventAt: number | null;
};

type BoardStage = Exclude<ApplicationStage, "applied">;

type ViewTab = "kanban" | "list" | "pipeline";

const sortByRecent = (a: BoardCard, b: BoardCard) => {
  if (a.latestEventAt != null && b.latestEventAt != null) {
    return b.latestEventAt - a.latestEventAt;
  }
  if (a.latestEventAt != null) return -1;
  if (b.latestEventAt != null) return 1;
  return Date.parse(b.job.discoveredAt) - Date.parse(a.job.discoveredAt);
};

const sortByTitle = (a: BoardCard, b: BoardCard) =>
  a.job.title.localeCompare(b.job.title);

const sortByCompany = (a: BoardCard, b: BoardCard) =>
  a.job.employer.localeCompare(b.job.employer);

const BOARD_STAGES = APPLICATION_STAGES.filter(
  (stage) => stage !== "applied",
) as BoardStage[];

const STAGE_COLORS: Record<BoardStage, string> = {
  recruiter_screen: "from-blue-500/20 to-blue-600/5 border-blue-500/30",
  assessment: "from-violet-500/20 to-violet-600/5 border-violet-500/30",
  hiring_manager_screen: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/30",
  technical_interview: "from-amber-500/20 to-amber-600/5 border-amber-500/30",
  onsite: "from-orange-500/20 to-orange-600/5 border-orange-500/30",
  offer: "from-emerald-500/25 to-emerald-600/10 border-emerald-500/40",
  closed: "from-muted/30 to-muted/10 border-border/50",
};

const toBoardStage = (stage: ApplicationStage): BoardStage =>
  stage === "applied" ? "recruiter_screen" : stage;

const getCardAccentClass = (stage: ApplicationStage) => {
  if (stage === "technical_interview")
    return "border-l-[3px] border-l-amber-400";
  if (stage === "onsite") return "border-l-[3px] border-l-orange-400";
  if (stage === "offer")
    return "border-l-[3px] border-l-emerald-400 shadow-[0_0_20px_-8px_rgba(16,185,129,0.4)]";
  return "";
};

const resolveCurrentStage = (
  events: StageEvent[] | null,
): { stage: ApplicationStage; latestEventAt: number | null } => {
  const latest = events?.at(-1) ?? null;
  if (latest) {
    return { stage: latest.toStage, latestEventAt: latest.occurredAt };
  }
  return { stage: "applied", latestEventAt: null };
};

export const InProgressBoardPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [viewTab, setViewTab] = useState<ViewTab>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragging, setDragging] = React.useState<{
    jobId: string;
    fromStage: ApplicationStage;
  } | null>(null);
  const [dropTargetStage, setDropTargetStage] =
    React.useState<ApplicationStage | null>(null);
  const [movingJobId, setMovingJobId] = React.useState<string | null>(null);
  const [sortMode, setSortMode] = useState<
    "updated" | "title" | "company"
  >("updated");

  const boardQuery = useQuery({
    queryKey: queryKeys.jobs.inProgressBoard(),
    queryFn: async () => {
      const response = await api.getJobs({
        statuses: ["in_progress"],
        view: "list",
      });
      const jobs = response.jobs;
      const eventResults = await Promise.allSettled(
        jobs.map((job) => api.getJobStageEvents(job.id)),
      );
      return jobs.map((job, index) => {
        const result = eventResults[index];
        const events =
          result?.status === "fulfilled"
            ? [...result.value].sort((a, b) => a.occurredAt - b.occurredAt)
            : null;
        const resolved = resolveCurrentStage(events);
        return {
          job,
          stage: resolved.stage,
          latestEventAt: resolved.latestEventAt,
        };
      });
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({
      jobId,
      toStage,
    }: {
      jobId: string;
      toStage: ApplicationStage;
    }) =>
      api.transitionJobStage(jobId, {
        toStage,
        metadata: {
          actor: "user",
          eventType: "status_update",
          eventLabel: `Moved to ${STAGE_LABELS[toStage]}`,
        },
      }),
  });

  useQueryErrorToast(boardQuery.error, "Échec du chargement du board");

  const cards = boardQuery.data ?? [];
  const isLoading = boardQuery.isPending;

  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return cards;
    const q = searchQuery.toLowerCase();
    return cards.filter(
      (c) =>
        c.job.title.toLowerCase().includes(q) ||
        c.job.employer.toLowerCase().includes(q) ||
        (c.job.location ?? "").toLowerCase().includes(q),
    );
  }, [cards, searchQuery]);

  const lanes = useMemo(() => {
    const sortFn =
      sortMode === "title"
        ? sortByTitle
        : sortMode === "company"
          ? sortByCompany
          : sortByRecent;

    const grouped: Record<BoardStage, BoardCard[]> = {
      recruiter_screen: [],
      assessment: [],
      hiring_manager_screen: [],
      technical_interview: [],
      onsite: [],
      offer: [],
      closed: [],
    };

    for (const card of filteredCards) {
      grouped[toBoardStage(card.stage)].push(card);
    }

    for (const stage of BOARD_STAGES) {
      grouped[stage].sort(sortFn);
    }

    return grouped;
  }, [filteredCards, sortMode]);

  const pipelineStats = useMemo(() => {
    return BOARD_STAGES.map((stage) => ({
      stage,
      label: STAGE_LABELS[stage],
      count: lanes[stage].length,
    }));
  }, [lanes]);

  const handleDropToStage = useCallback(
    async (toStage: ApplicationStage) => {
      if (!dragging || dragging.fromStage === toStage) {
        setDropTargetStage(null);
        return;
      }

      const { jobId } = dragging;
      const previousCards =
        queryClient.getQueryData<BoardCard[]>(
          queryKeys.jobs.inProgressBoard(),
        ) ?? [];

      setMovingJobId(jobId);
      queryClient.setQueryData<BoardCard[]>(
        queryKeys.jobs.inProgressBoard(),
        (current) =>
          (current ?? []).map((card) =>
            card.job.id === jobId
              ? { ...card, stage: toStage, latestEventAt: Math.floor(Date.now() / 1000) }
              : card,
          ),
      );

      try {
        await transitionMutation.mutateAsync({ jobId, toStage });
        toast.success(`Déplacé vers ${STAGE_LABELS[toStage]}`);
        await queryClient.invalidateQueries({
          queryKey: queryKeys.jobs.inProgressBoard(),
        });
      } catch (error) {
        queryClient.setQueryData(
          queryKeys.jobs.inProgressBoard(),
          previousCards,
        );
        const message =
          error instanceof Error ? error.message : "Échec du déplacement";
        toast.error(message);
      } finally {
        setMovingJobId(null);
        setDragging(null);
        setDropTargetStage(null);
      }
    },
    [dragging, queryClient, transitionMutation],
  );

  const refresh = useCallback(() => {
    void boardQuery.refetch();
  }, [boardQuery]);

  const totalCards = filteredCards.length;
  const maxPipelineCount = Math.max(...pipelineStats.map((p) => p.count), 1);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 bg-background/80 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E94560]/20 to-[#E94560]/5 border border-[#E94560]/20">
              <Briefcase className="h-5 w-5 text-[#E94560]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Applications</h1>
              <p className="text-xs text-muted-foreground">
                Suivi des candidatures en cours par étape
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              disabled={isLoading}
              className="gap-1.5 h-8 text-xs"
            >
              {boardQuery.isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCcw className="h-3.5 w-3.5" />
              )}
              Rafraîchir
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1.5 bg-[#E94560] hover:bg-[#D63B54] text-xs"
              onClick={() => navigate("/jobs/ready")}
            >
              <Plus className="h-3.5 w-3.5" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/50">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <div className="text-sm font-bold tabular-nums">{totalCards}</div>
              <div className="text-[10px] text-muted-foreground">En cours</div>
            </div>
          </div>
          {pipelineStats.slice(0, 5).map(({ stage, label, count }) => (
            <div key={stage} className="flex items-center gap-2">
              <div className="text-sm font-bold tabular-nums">{count}</div>
              <div className="text-[10px] text-muted-foreground max-w-[80px] truncate" title={label}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Tabs + Search + Sort */}
        <div className="flex items-center gap-4 mt-4 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted/30 p-1">
            {[
              { id: "kanban" as ViewTab, label: "Kanban", icon: Columns3 },
              { id: "list" as ViewTab, label: "Liste", icon: LayoutList },
              { id: "pipeline" as ViewTab, label: "Pipeline", icon: BarChart3 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setViewTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  viewTab === tab.id
                    ? "bg-[#E94560]/10 text-[#E94560] shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="text"
              placeholder="Rechercher poste, entreprise..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 text-xs placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
            />
          </div>

          <Select
            value={sortMode}
            onValueChange={(v) =>
              setSortMode(v as "updated" | "title" | "company")
            }
          >
            <SelectTrigger className="h-8 w-[140px] rounded-lg border border-border/50 bg-background text-foreground text-xs">
              <ArrowDownAZ className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background text-foreground border-border">
              <SelectItem value="updated">Récents</SelectItem>
              <SelectItem value="title">Titre</SelectItem>
              <SelectItem value="company">Entreprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <PageMain className="flex-1 overflow-hidden max-w-[1800px]">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin mb-3 opacity-40" />
            <p className="text-sm">Chargement du board...</p>
          </div>
        ) : viewTab === "kanban" ? (
          <div className="overflow-x-auto pb-4 h-full">
            <div className="flex min-w-max items-stretch gap-4 h-full py-4">
              {BOARD_STAGES.map((stage) => {
                const laneCards = lanes[stage];
                return (
                  <section
                    key={stage}
                    aria-label={`${STAGE_LABELS[stage]} lane`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!dragging || dragging.fromStage === stage) return;
                      setDropTargetStage(stage);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      void handleDropToStage(stage);
                    }}
                    onDragLeave={() => {
                      if (dropTargetStage === stage) setDropTargetStage(null);
                    }}
                    className={cn(
                      "w-[300px] flex flex-col rounded-xl border bg-gradient-to-b shadow-lg transition-all",
                      STAGE_COLORS[stage],
                      dropTargetStage === stage &&
                        "ring-2 ring-[#E94560]/50 scale-[1.02]"
                    )}
                  >
                    <header className="flex items-center justify-between border-b border-border/40 px-4 py-3 shrink-0">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-foreground/90">
                        {STAGE_LABELS[stage]}
                      </h2>
                      <Badge
                        variant="secondary"
                        className="tabular-nums bg-background/60 text-foreground/80 border-0"
                      >
                        {laneCards.length}
                      </Badge>
                    </header>
                    <div className="flex-1 space-y-2 overflow-y-auto p-3 min-h-[200px]">
                      {laneCards.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-border/50 bg-background/30 flex items-center justify-center py-8 px-4 text-center">
                          <p className="text-[11px] text-muted-foreground">
                            Glissez une carte ici ou enregistrez une étape.
                          </p>
                        </div>
                      ) : (
                        laneCards.map(({ job, latestEventAt, stage: cardStage }) => (
                          <Link
                            key={job.id}
                            to={`/job/${job.id}`}
                            draggable={movingJobId !== job.id}
                            onDragStart={(e) => {
                              setDragging({ jobId: job.id, fromStage: cardStage });
                              e.dataTransfer.effectAllowed = "move";
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setDropTargetStage(null);
                            }}
                            className={cn(
                              "block rounded-xl border border-border/60 bg-card/90 p-3 shadow-sm transition-all hover:shadow-md hover:border-border",
                              getCardAccentClass(cardStage),
                              movingJobId === job.id && "opacity-60 cursor-grabbing"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <span className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
                                {job.title}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {job.employer}
                            </p>
                            {cardStage === "closed" && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {job.outcome && (
                                  <Badge variant="outline" className="text-[10px] capitalize">
                                    {job.outcome.replaceAll("_", " ")}
                                  </Badge>
                                )}
                              </div>
                            )}
                            <p className="mt-2 text-[10px] text-muted-foreground/80">
                              {latestEventAt != null
                                ? `MAJ ${formatTimestamp(latestEventAt)}`
                                : "Aucune étape"}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        ) : viewTab === "list" ? (
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <LayoutList className="h-12 w-12 opacity-30 mb-3" />
                <p className="text-sm font-medium">Aucune candidature en cours</p>
                <p className="text-xs mt-1">
                  Ajoutez des candidatures depuis les offres prêtes.
                </p>
                <Button
                  size="sm"
                  className="mt-4 gap-1.5"
                  onClick={() => navigate("/jobs/ready")}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Voir les offres prêtes
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredCards
                  .sort(
                    sortMode === "title"
                      ? sortByTitle
                      : sortMode === "company"
                        ? sortByCompany
                        : sortByRecent
                  )
                  .map(({ job, stage, latestEventAt }) => (
                    <Link
                      key={job.id}
                      to={`/job/${job.id}`}
                      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">
                          {job.title}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="truncate">{job.employer}</span>
                          {job.location && (
                            <span className="flex items-center gap-1 shrink-0">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "shrink-0 text-[10px]",
                          stage === "offer" && "border-emerald-500/40 text-emerald-400",
                          stage === "technical_interview" && "border-amber-500/40 text-amber-400"
                        )}
                      >
                        {STAGE_LABELS[stage]}
                      </Badge>
                      <div className="shrink-0 text-[11px] text-muted-foreground w-24 text-right">
                        {latestEventAt != null
                          ? formatTimestamp(latestEventAt)
                          : "—"}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                    </Link>
                  ))}
              </div>
            )}
          </div>
        ) : (
          /* Pipeline */
          <div className="space-y-6 py-6">
            <div className="rounded-xl border border-border/50 bg-card/30 p-6">
              <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[#E94560]/80" />
                Répartition par étape
              </h2>
              <div className="space-y-3">
                {pipelineStats.map(({ stage, label, count }) => (
                  <div key={stage} className="flex items-center gap-4">
                    <span className="text-xs font-medium text-muted-foreground w-36 shrink-0">
                      {label}
                    </span>
                    <div className="flex-1 h-8 rounded-lg bg-muted/30 overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-lg transition-all duration-500",
                          stage === "offer" && "bg-emerald-500",
                          stage === "technical_interview" && "bg-amber-500",
                          stage === "onsite" && "bg-orange-500",
                          stage === "recruiter_screen" && "bg-blue-500",
                          stage === "assessment" && "bg-violet-500",
                          stage === "hiring_manager_screen" && "bg-indigo-500",
                          stage === "closed" && "bg-muted-foreground/40"
                        )}
                        style={{
                          width: `${Math.max((count / maxPipelineCount) * 100, count > 0 ? 8 : 0)}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold tabular-nums w-8 text-right">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pipelineStats.map(({ stage, label, count }) => (
                <div
                  key={stage}
                  className={cn(
                    "rounded-xl border p-4 bg-gradient-to-br",
                    STAGE_COLORS[stage]
                  )}
                >
                  <div className="text-2xl font-bold tabular-nums">{count}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PageMain>
    </div>
  );
};
