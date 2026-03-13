import type { JobListItem } from "@shared/types.js";
import { Loader2, SearchX, Sparkles } from "lucide-react";
import type React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FilterTab } from "./constants";
import { defaultStatusToken, emptyStateCopy, statusTokens } from "./constants";
import { JobRowContent } from "./JobRowContent";

interface JobListPanelProps {
  isLoading: boolean;
  jobs: JobListItem[];
  activeJobs: JobListItem[];
  selectedJobId: string | null;
  selectedJobIds: Set<string>;
  activeTab: FilterTab;
  onSelectJob: (jobId: string) => void;
  onToggleSelectJob: (jobId: string) => void;
  onToggleSelectAll: (checked: boolean) => void;
}

const emptyStateIcons: Record<FilterTab, React.ElementType> = {
  ready: Sparkles,
  discovered: SearchX,
  applied: SearchX,
  all: SearchX,
};

export const JobListPanel: React.FC<JobListPanelProps> = ({
  isLoading,
  jobs,
  activeJobs,
  selectedJobId,
  selectedJobIds,
  activeTab,
  onSelectJob,
  onToggleSelectJob,
  onToggleSelectAll,
}) => {
  const EmptyIcon = emptyStateIcons[activeTab] ?? SearchX;

  return (
    <div className="min-w-0 rounded-xl border border-border/50 bg-card shadow-sm">
      {isLoading && jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
          </div>
          <div className="text-sm font-medium text-muted-foreground">Chargement des offres...</div>
        </div>
      ) : activeJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/30">
            <EmptyIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <div className="text-base font-semibold">Aucune offre trouvée</div>
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {emptyStateCopy[activeTab]}
            </p>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between gap-3 border-b border-border/30 px-4 py-2.5">
            <label
              htmlFor="job-list-select-all"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <Checkbox
                id="job-list-select-all"
                checked={
                  activeJobs.length > 0 &&
                  activeJobs.every((job) => selectedJobIds.has(job.id))
                }
                onCheckedChange={() => {
                  const allSelected =
                    activeJobs.length > 0 &&
                    activeJobs.every((job) => selectedJobIds.has(job.id));
                  onToggleSelectAll(!allSelected);
                }}
                aria-label="Sélectionner tout"
              />
              Tout sélectionner
            </label>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {selectedJobIds.size > 0
                ? `${selectedJobIds.size} sélectionné${selectedJobIds.size > 1 ? "s" : ""}`
                : `${activeJobs.length} offre${activeJobs.length > 1 ? "s" : ""}`}
            </span>
          </div>
          <div className="divide-y divide-border/20">
            {activeJobs.map((job) => {
              const isSelected = job.id === selectedJobId;
              const isChecked = selectedJobIds.has(job.id);
              const statusToken = statusTokens[job.status] ?? defaultStatusToken;
              return (
                <div
                  key={job.id}
                  data-job-id={job.id}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3 transition-all cursor-pointer",
                    isChecked && "bg-primary/10",
                    isSelected
                      ? "bg-primary/15 border-l-2 border-l-blue-500"
                      : "border-l-2 border-l-transparent hover:bg-muted/15 hover:border-l-muted-foreground/20",
                    isChecked && isSelected && "bg-primary/20",
                  )}
                >
                  <div className="relative h-4 w-4 shrink-0">
                    <span
                      className={cn(
                        "absolute inset-0 m-auto h-2 w-2 rounded-full transition-opacity duration-150 ease-out",
                        statusToken.dot,
                        isChecked || isSelected
                          ? "opacity-0"
                          : "opacity-100 group-hover:opacity-0",
                      )}
                      title={statusToken.label}
                    />
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => onToggleSelectJob(job.id)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Sélectionner ${job.title}`}
                      className={cn(
                        "absolute inset-0 m-0 border-border/80 cursor-pointer text-muted-foreground/70 transition-opacity duration-150 ease-out",
                        "data-[state=checked]:border-primary data-[state=checked]:bg-primary/20 data-[state=checked]:text-primary",
                        "data-[state=checked]:shadow-[0_0_0_1px_hsl(var(--primary)/0.35)]",
                        isChecked || isSelected
                          ? "opacity-100 pointer-events-auto"
                          : "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onSelectJob(job.id)}
                    data-testid={`select-${job.id}`}
                    className="flex min-w-0 flex-1 cursor-pointer text-left"
                    aria-pressed={isSelected}
                  >
                    <JobRowContent
                      job={job}
                      isSelected={isSelected}
                      showStatusDot={false}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
