import type { JobListItem } from "@shared/types.js";
import { cn } from "@/lib/utils";
import { defaultStatusToken, statusTokens } from "./constants";

interface JobRowContentProps {
  job: JobListItem;
  isSelected?: boolean;
  showStatusDot?: boolean;
  statusDotClassName?: string;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "from-emerald-500 to-green-400 text-emerald-50";
  if (score >= 60) return "from-blue-500 to-cyan-400 text-blue-50";
  if (score >= 40) return "from-amber-500 to-yellow-400 text-amber-50";
  return "from-gray-500 to-gray-400 text-gray-50";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Bon";
  if (score >= 40) return "Moyen";
  return "Faible";
}

function getInitials(name: string): string {
  return name
    .split(/[\s-]+/)
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase();
}

function timeSince(dateStr: string | Date | undefined | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "< 1h";
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}j`;
  return `${Math.floor(d / 7)}sem`;
}

export const JobRowContent = ({
  job,
  isSelected = false,
  showStatusDot = true,
  statusDotClassName,
  className,
}: JobRowContentProps) => {
  const hasScore = job.suitabilityScore != null;
  const statusToken = statusTokens[job.status] ?? defaultStatusToken;
  const score = job.suitabilityScore ?? 0;

  return (
    <div className={cn("flex min-w-0 flex-1 items-center gap-3", className)}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/30 text-xs font-bold text-muted-foreground">
        {getInitials(job.employer || "?")}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0",
              statusToken.dot,
              !isSelected && "opacity-70",
              statusDotClassName,
              !showStatusDot && "hidden",
            )}
            title={statusToken.label}
          />
          <span
            className={cn(
              "truncate text-sm leading-tight",
              isSelected ? "font-semibold" : "font-medium",
            )}
          >
            {job.title}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate font-medium">{job.employer}</span>
          {job.location && (
            <>
              <span className="text-border">·</span>
              <span className="truncate">{job.location}</span>
            </>
          )}
          {(job as any).discoveredAt && (
            <>
              <span className="text-border">·</span>
              <span className="shrink-0">{timeSince((job as any).discoveredAt)}</span>
            </>
          )}
        </div>
        {job.salary?.trim() && (
          <div className="mt-0.5 inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
            {job.salary}
          </div>
        )}
      </div>

      {hasScore && (
        <div className="shrink-0 text-right">
          <div
            className={cn(
              "inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-xs font-bold",
              getScoreColor(score),
            )}
            title={`Score: ${score} — ${getScoreLabel(score)}`}
          >
            {score}
          </div>
        </div>
      )}
    </div>
  );
};
