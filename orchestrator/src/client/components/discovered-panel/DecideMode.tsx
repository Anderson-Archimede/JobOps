import type { Job } from "@shared/types.js";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  Loader2,
  MapPin,
  RefreshCcw,
  Send,
  Sparkles,
  Star,
  TrendingUp,
  XCircle,
  Building2,
  Clock,
  Banknote,
  Briefcase,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { FitAssessment, JobHeader, TailoredSummary } from "..";
import { KbdHint } from "../KbdHint";
import { CollapsibleSection } from "./CollapsibleSection";
import { getPlainDescription } from "./helpers";

interface DecideModeProps {
  job: Job;
  onTailor: () => void;
  onSkip: () => void;
  isSkipping: boolean;
  onRescore: () => void;
  isRescoring: boolean;
  onEditDetails: () => void;
  onCheckSponsor?: () => Promise<void>;
}

function getScoreGradient(score: number): string {
  if (score >= 75) return "from-emerald-500 to-green-400";
  if (score >= 55) return "from-blue-500 to-cyan-400";
  if (score >= 35) return "from-amber-500 to-yellow-400";
  return "from-red-500 to-orange-400";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent match";
  if (score >= 65) return "Très bon match";
  if (score >= 50) return "Bon match";
  if (score >= 35) return "Match partiel";
  return "Match faible";
}

export const DecideMode: React.FC<DecideModeProps> = ({
  job,
  onTailor,
  onSkip,
  isSkipping,
  onRescore,
  isRescoring,
  onEditDetails,
  onCheckSponsor,
}) => {
  const [showDescription, setShowDescription] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const jobLink = job.applicationLink || job.jobUrl;
  const score = job.suitabilityScore ?? 0;
  const hasScore = job.suitabilityScore != null;

  const description = useMemo(
    () => getPlainDescription(job.jobDescription),
    [job.jobDescription],
  );

  const skills = useMemo(() => {
    if (!job.skills) return [];
    return job.skills.split(",").map((s) => s.trim()).filter(Boolean);
  }, [job.skills]);

  return (
    <div className="flex flex-col h-full">
      <div className="space-y-4 pb-3">
        <JobHeader job={job} onCheckSponsor={onCheckSponsor} />

        {/* Score & Quick Info */}
        {hasScore && (
          <div className="rounded-xl border border-border/40 bg-gradient-to-r from-muted/10 to-muted/5 p-3">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${getScoreGradient(score)} text-white font-bold text-lg shadow-lg`}>
                {Math.round(score)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-sm font-semibold">{getScoreLabel(score)}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {job.suitabilityReason || "Score calculé à partir de votre profil et de l'offre."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Job metadata cards */}
        <div className="grid grid-cols-2 gap-2">
          {job.location && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <MapPin className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{job.location}</span>
            </div>
          )}
          {job.salary && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <Banknote className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{job.salary}</span>
            </div>
          )}
          {job.jobType && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <Briefcase className="h-3.5 w-3.5 text-violet-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{job.jobType}</span>
            </div>
          )}
          {job.jobLevel && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{job.jobLevel}</span>
            </div>
          )}
          {job.companyIndustry && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <Building2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{job.companyIndustry}</span>
            </div>
          )}
          {job.discoveredAt && (
            <div className="flex items-center gap-2 rounded-lg border border-border/30 bg-muted/5 px-2.5 py-2">
              <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">
                {new Date(job.discoveredAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </div>
          )}
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col gap-2 sm:flex-row">
          {jobLink && (
            <Button
              asChild
              size="default"
              className="flex-1 h-11 text-sm bg-gradient-to-r from-blue-600 to-blue-500 text-white hover:from-blue-700 hover:to-blue-600 shadow-md shadow-blue-500/20 sm:h-10 sm:text-xs"
            >
              <a href={jobLink} target="_blank" rel="noopener noreferrer">
                <Send className="mr-2 h-4 w-4" />
                Postuler maintenant
              </a>
            </Button>
          )}
          <Button
            size="default"
            onClick={onTailor}
            className="flex-1 h-11 text-sm bg-gradient-to-r from-violet-600 to-purple-500 text-white hover:from-violet-700 hover:to-purple-600 shadow-md shadow-violet-500/20 sm:h-10 sm:text-xs"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Adapter mon CV
            <KbdHint shortcut="t" className="ml-1.5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSkip}
            disabled={isSkipping}
            className="flex-1 h-9 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/30"
          >
            {isSkipping ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <XCircle className="mr-1.5 h-3.5 w-3.5" />}
            Passer
            <KbdHint shortcut="s" className="ml-1" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onRescore}
            disabled={isRescoring}
            className="flex-1 h-9 text-xs text-muted-foreground"
          >
            <RefreshCcw className={`mr-1.5 h-3.5 w-3.5 ${isRescoring ? "animate-spin" : ""}`} />
            {isRescoring ? "Calcul..." : "Recalculer"}
          </Button>
        </div>
      </div>

      <Separator className="opacity-40" />

      <div className="flex-1 py-4 space-y-4 overflow-y-auto">
        <FitAssessment job={job} />
        <TailoredSummary job={job} />

        {/* Skills */}
        {skills.length > 0 && (
          <CollapsibleSection
            isOpen={showSkills}
            onToggle={() => setShowSkills((prev) => !prev)}
            label={`Compétences demandées (${skills.length})`}
          >
            <div className="flex flex-wrap gap-1.5 mt-2">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Description */}
        <CollapsibleSection
          isOpen={showDescription}
          onToggle={() => setShowDescription((prev) => !prev)}
          label={`${showDescription ? "Masquer" : "Voir"} la description complète`}
        >
          <div className="rounded-xl border border-border/40 bg-muted/5 p-4 mt-2 max-h-[400px] overflow-y-auto shadow-inner">
            <p className="text-xs text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">
              {description}
            </p>
          </div>
        </CollapsibleSection>
      </div>

      <Separator className="opacity-40" />

      <div className="pt-3 pb-1 space-y-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 gap-2 text-xs text-muted-foreground hover:text-foreground justify-center"
            >
              Plus d&apos;actions
              <ChevronUp className="h-3 w-3 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-56">
            <DropdownMenuItem onSelect={onEditDetails}>
              <Edit2 className="mr-2 h-4 w-4" />
              Modifier les détails
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onRescore} disabled={isRescoring}>
              <RefreshCcw className={isRescoring ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {isRescoring ? "Recalcul en cours..." : "Recalculer le score"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {jobLink && (
          <div className="flex justify-center">
            <a
              href={jobLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Voir l&apos;offre originale
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
