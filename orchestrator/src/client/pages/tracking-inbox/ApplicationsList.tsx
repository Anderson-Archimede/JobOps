import type { JobListItem, JobOutcome, StageEvent } from "@shared/types";
import { APPLICATION_OUTCOMES } from "@shared/types";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  Lightbulb,
  Loader2,
  Mail,
  MapPin,
  Search,
  Sparkles,
  TrendingUp,
  User,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryErrorToast } from "@/client/hooks/useQueryErrorToast";
import { queryKeys } from "@/client/lib/queryKeys";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatDateTime } from "@/lib/utils";
import * as api from "../../api";
import { JobTimeline } from "../job/Timeline";

const OUTCOME_LABELS: Record<JobOutcome, string> = {
  offer_accepted: "Acceptée",
  offer_declined: "Offre refusée",
  rejected: "Refusée",
  withdrawn: "Retirée",
  no_response: "Sans réponse",
  ghosted: "Sans retour",
};

const OUTCOME_COLORS: Record<JobOutcome, string> = {
  offer_accepted: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  offer_declined: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  rejected: "text-red-400 bg-red-500/10 border-red-500/20",
  withdrawn: "text-muted-foreground bg-muted/30 border-border/50",
  no_response: "text-muted-foreground bg-muted/30 border-border/50",
  ghosted: "text-muted-foreground bg-muted/30 border-border/50",
};

const REJECTION_TIPS = [
  "Personnalisez votre lettre de motivation pour chaque offre — évitez les modèles génériques.",
  "Mettez en avant les compétences demandées dans l'annonce en priorité sur votre CV.",
  "Utilisez des verbes d'action et des chiffres concrets pour décrire vos réalisations.",
  "Relisez attentivement l'annonce et assurez-vous de répondre à tous les critères.",
  "Demandez un retour constructif au recruteur pour comprendre les points d'amélioration.",
  "Enrichissez votre profil LinkedIn et assurez la cohérence avec votre CV.",
  "Préparez des exemples STAR (Situation, Tâche, Action, Résultat) pour les entretiens.",
];

function parseEmails(emails: string | null): string[] {
  if (!emails?.trim()) return [];
  return emails
    .split(/[,;|\n]/)
    .map((e) => e.trim())
    .filter(Boolean);
}

export const ApplicationsList: React.FC = () => {
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<string>("timeline");

  const applicationsQuery = useQuery({
    queryKey: queryKeys.jobs.list({
      statuses: ["applied", "in_progress"],
      view: "list",
    }),
    queryFn: () =>
      api.getJobs({
        statuses: ["applied", "in_progress"],
        view: "list",
      }),
  });

  const selectedJobQuery = useQuery({
    queryKey: queryKeys.jobs.detail(selectedJobId ?? ""),
    queryFn: () => api.getJob(selectedJobId!),
    enabled: Boolean(selectedJobId),
  });

  const stageEventsQuery = useQuery({
    queryKey: queryKeys.jobs.stageEvents(selectedJobId ?? ""),
    queryFn: () => api.getJobStageEvents(selectedJobId!),
    enabled: Boolean(selectedJobId),
  });

  useQueryErrorToast(applicationsQuery.error, "Échec du chargement des candidatures");
  useQueryErrorToast(selectedJobQuery.error, "Échec du chargement du détail");
  useQueryErrorToast(stageEventsQuery.error, "Échec du chargement de la timeline");

  const jobs = applicationsQuery.data?.jobs ?? [];
  const selectedJob = selectedJobQuery.data ?? null;
  const stageEvents = (stageEventsQuery.data ?? []) as StageEvent[];

  const filteredJobs = useMemo(() => {
    let list = jobs;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      list = list.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.employer.toLowerCase().includes(q) ||
          (j.location ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((j) => {
        if (statusFilter === "applied") return j.status === "applied";
        if (statusFilter === "in_progress") return j.status === "in_progress";
        return true;
      });
    }
    if (outcomeFilter !== "all") {
      list = list.filter((j) => j.outcome === outcomeFilter);
    }
    return list.sort((a, b) => {
      const dateA = a.appliedAt ? Date.parse(a.appliedAt) : 0;
      const dateB = b.appliedAt ? Date.parse(b.appliedAt) : 0;
      return dateB - dateA;
    });
  }, [jobs, searchFilter, statusFilter, outcomeFilter]);

  const rejectionEvent = useMemo(() => {
    if (!selectedJob?.outcome || selectedJob.outcome !== "rejected") return null;
    const closedEvents = stageEvents.filter((e) => e.toStage === "closed");
    return closedEvents.at(-1) ?? null;
  }, [selectedJob?.outcome, stageEvents]);

  const rejectionReason = rejectionEvent?.metadata?.reasonCode ?? rejectionEvent?.metadata?.note ?? null;

  if (applicationsQuery.isPending) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-3 opacity-40" />
        <p className="text-sm">Chargement des candidatures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            type="text"
            placeholder="Rechercher par poste, entreprise, lieu..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 pl-9 pr-4 text-sm placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-lg border border-border/50 bg-background text-foreground">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent className="bg-background text-foreground border-border">
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="applied">Envoyée</SelectItem>
            <SelectItem value="in_progress">En cours</SelectItem>
          </SelectContent>
        </Select>
        <Select value={outcomeFilter} onValueChange={setOutcomeFilter}>
          <SelectTrigger className="h-9 w-[160px] rounded-lg border border-border/50 bg-background text-foreground">
            <SelectValue placeholder="Issue" />
          </SelectTrigger>
          <SelectContent className="bg-background text-foreground border-border">
            <SelectItem value="all">Toutes les issues</SelectItem>
            {APPLICATION_OUTCOMES.map((o) => (
              <SelectItem key={o} value={o}>
                {OUTCOME_LABELS[o]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{filteredJobs.length}</strong> candidature{filteredJobs.length !== 1 ? "s" : ""}
        </span>
        <span>
          {jobs.filter((j) => j.outcome === "rejected").length} refusée{jobs.filter((j) => j.outcome === "rejected").length !== 1 ? "s" : ""}
        </span>
        <span>
          {jobs.filter((j) => j.outcome === "offer_accepted").length} acceptée{jobs.filter((j) => j.outcome === "offer_accepted").length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/50 overflow-hidden">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Briefcase className="h-10 w-10 opacity-30 mb-3" />
            <p className="text-sm font-medium">Aucune candidature trouvée</p>
            <p className="text-xs mt-1">
              {jobs.length === 0
                ? "Vos candidatures apparaîtront ici une fois envoyées"
                : "Aucun résultat pour ces filtres"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => setSelectedJobId(job.id)}
                className="w-full text-left px-4 py-3 hover:bg-muted/30 transition-colors flex items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm truncate">{job.title}</span>
                    <span className="text-muted-foreground text-xs">·</span>
                    <span className="text-muted-foreground text-sm truncate">{job.employer}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {job.appliedAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(job.appliedAt) ?? job.appliedAt}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {job.outcome ? (
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
                        OUTCOME_COLORS[job.outcome],
                      )}
                    >
                      {OUTCOME_LABELS[job.outcome]}
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border text-blue-400 bg-blue-500/10 border-blue-500/20">
                      {job.status === "applied" ? "Envoyée" : "En cours"}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog
        open={Boolean(selectedJobId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJobId(null);
            setDetailTab("timeline");
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-hidden p-0">
          {selectedJob && (
            <>
              <DialogHeader className="border-b border-border/50 bg-card/50 px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <DialogTitle className="flex items-center gap-2">
                      <h2 className="text-lg font-bold truncate">{selectedJob.title}</h2>
                      {selectedJob.outcome && (
                        <span
                          className={cn(
                            "shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border",
                            OUTCOME_COLORS[selectedJob.outcome],
                          )}
                        >
                          {OUTCOME_LABELS[selectedJob.outcome]}
                        </span>
                      )}
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-foreground/80">{selectedJob.employer}</span>
                      {selectedJob.appliedAt && (
                        <span className="text-muted-foreground">
                          Envoyée le {formatDateTime(selectedJob.appliedAt)}
                        </span>
                      )}
                    </DialogDescription>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      to={`/job/${selectedJob.id}`}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                      title="Fiche complète"
                    >
                      <Briefcase className="h-4 w-4" />
                    </Link>
                    {selectedJob.jobUrl && (
                      <a
                        href={selectedJob.jobUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        title="Voir l'offre"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="flex flex-col flex-1 overflow-hidden">
                <div className="border-b border-border/50 px-6 py-2">
                  <TabsList className="h-9 w-full justify-start gap-1 bg-transparent p-0">
                    <TabsTrigger
                      value="timeline"
                      className="data-[state=active]:bg-[#E94560]/10 data-[state=active]:text-[#E94560] rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                      Suivi
                    </TabsTrigger>
                    <TabsTrigger
                      value="entreprise"
                      className="data-[state=active]:bg-[#E94560]/10 data-[state=active]:text-[#E94560] rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <Building2 className="h-3.5 w-3.5 mr-1.5" />
                      Entreprise
                    </TabsTrigger>
                    <TabsTrigger
                      value="contact"
                      className="data-[state=active]:bg-[#E94560]/10 data-[state=active]:text-[#E94560] rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <User className="h-3.5 w-3.5 mr-1.5" />
                      Contact
                    </TabsTrigger>
                    <TabsTrigger
                      value="offre"
                      className="data-[state=active]:bg-[#E94560]/10 data-[state=active]:text-[#E94560] rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1.5" />
                      Offre
                    </TabsTrigger>
                    {selectedJob.outcome === "rejected" && (
                      <TabsTrigger
                        value="refus"
                        className="data-[state=active]:bg-[#E94560]/10 data-[state=active]:text-[#E94560] rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
                        Analyse refus
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                <div className="overflow-y-auto flex-1 min-h-0">
                  <TabsContent value="timeline" className="mt-0 px-6 py-4">
                    {stageEventsQuery.isPending ? (
                      <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Chargement...
                      </div>
                    ) : stageEvents.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/50 p-6 text-center">
                        <TrendingUp className="h-10 w-10 opacity-30 mx-auto mb-3" />
                        <p className="text-sm font-medium">Aucune étape enregistrée</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Connectez votre boîte mail pour synchroniser automatiquement les mises à jour.
                        </p>
                        <Link
                          to="/tracking-inbox"
                          className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#E94560] hover:underline"
                        >
                          Configurer l'Inbox Tracker
                          <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    ) : (
                      <JobTimeline events={stageEvents} />
                    )}
                  </TabsContent>

                  <TabsContent value="entreprise" className="mt-0 px-6 py-4">
                    <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#E94560]/70" />
                        <h3 className="font-semibold">{selectedJob.employer}</h3>
                      </div>
                      {selectedJob.companyIndustry && (
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Secteur</div>
                          <p className="text-sm">{selectedJob.companyIndustry}</p>
                        </div>
                      )}
                      {selectedJob.companyDescription && (
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Description</div>
                          <p className="text-sm text-muted-foreground leading-relaxed">{selectedJob.companyDescription}</p>
                        </div>
                      )}
                      {selectedJob.companyAddresses && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Adresse</div>
                            <p className="text-sm">{selectedJob.companyAddresses}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-4">
                        {selectedJob.companyNumEmployees && (
                          <div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Effectif</div>
                            <p className="text-sm">{selectedJob.companyNumEmployees}</p>
                          </div>
                        )}
                        {selectedJob.companyUrlDirect && (
                          <a
                            href={selectedJob.companyUrlDirect}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-[#E94560] hover:underline"
                          >
                            Site web <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {!selectedJob.companyIndustry && !selectedJob.companyDescription && !selectedJob.companyAddresses && (
                        <p className="text-muted-foreground/60 text-sm py-8 text-center">
                          Informations non disponibles. Consultez l'offre pour plus de détails.
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="mt-0 px-6 py-4">
                    <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <User className="h-4 w-4 text-[#E94560]/70" />
                        Contact recrutement
                      </h3>
                      {parseEmails(selectedJob.emails).length > 0 ? (
                        <div className="space-y-2">
                          {parseEmails(selectedJob.emails).map((email, i) => (
                            <a
                              key={i}
                              href={`mailto:${email}`}
                              className="flex items-center gap-2 text-sm text-[#E94560] hover:underline py-2 px-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                            >
                              <Mail className="h-4 w-4 shrink-0" />
                              {email}
                            </a>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                          <Mail className="h-8 w-8 opacity-30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Aucun contact enregistré. Les coordonnées peuvent être ajoutées sur la fiche complète ou extraites des emails synchronisés.
                          </p>
                          <Link
                            to={`/job/${selectedJob.id}`}
                            className="inline-flex items-center gap-1.5 mt-3 text-xs text-[#E94560] hover:underline"
                          >
                            Modifier la fiche
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="offre" className="mt-0 px-6 py-4">
                    <div className="rounded-xl border border-border/50 bg-card/30 p-5 space-y-4">
                      <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#E94560]/70" />
                        Détails de l'offre
                      </h3>
                      <div className="grid gap-3 text-sm">
                        {selectedJob.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                            {selectedJob.location}
                          </div>
                        )}
                        {selectedJob.salary && (
                          <div>{selectedJob.salary}</div>
                        )}
                        {selectedJob.companyIndustry && (
                          <div className="text-muted-foreground">Secteur : {selectedJob.companyIndustry}</div>
                        )}
                        {selectedJob.jobUrl && (
                          <a
                            href={selectedJob.jobUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-[#E94560] hover:underline"
                          >
                            Voir l'annonce complète <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      {selectedJob.jobDescription && (
                        <div className="pt-4 border-t border-border/50">
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Description</div>
                          <p className="text-xs text-muted-foreground line-clamp-6">{selectedJob.jobDescription}</p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {selectedJob.outcome === "rejected" && (
                    <TabsContent value="refus" className="mt-0 px-6 py-4">
                      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5 space-y-4">
                        <h3 className="font-semibold flex items-center gap-2 text-red-400">
                          <Lightbulb className="h-4 w-4" />
                          Analyse du refus
                        </h3>
                        {rejectionReason && (
                          <div>
                            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Motif indiqué</div>
                            <p className="text-sm">{rejectionReason}</p>
                          </div>
                        )}
                        <div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Recommandations pour vos prochaines candidatures</div>
                          <ul className="space-y-2 text-sm">
                            {REJECTION_TIPS.map((tip, i) => (
                              <li key={i} className="flex items-start gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                {tip}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </TabsContent>
                  )}
                </div>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
