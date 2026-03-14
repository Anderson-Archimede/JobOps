import type { JobListItem, PostApplicationInboxItem } from "@shared/types";
import { CheckCircle2, XCircle } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { SearchableDropdown } from "@/components/ui/searchable-dropdown";

export type EmailViewerListProps = {
  items: PostApplicationInboxItem[];
  appliedJobs: JobListItem[];
  appliedJobByMessageId: Record<string, string>;
  onAppliedJobChange: (messageId: string, value: string) => void;
  onDecision: (
    item: PostApplicationInboxItem,
    decision: "approve" | "deny",
  ) => void;
  isActionLoading: boolean;
  isAppliedJobsLoading: boolean;
};

function formatAppliedJobLabel(job: JobListItem): string {
  const employer = job.employer.trim();
  const title = job.title.trim();
  if (employer && title) return `${employer} - ${title}`;
  if (title) return title;
  if (employer) return employer;
  return job.id;
}

const EmailViewerRow: React.FC<{
  item: PostApplicationInboxItem;
  jobs: JobListItem[];
  selectedAppliedJobId: string;
  onAppliedJobChange: (jobId: string) => void;
  onApprove: () => void;
  onDeny: () => void;
  isActionLoading: boolean;
  isAppliedJobsLoading: boolean;
}> = ({
  item,
  jobs,
  selectedAppliedJobId,
  onAppliedJobChange,
  onApprove,
  onDeny,
  isActionLoading,
  isAppliedJobsLoading,
}) => {
  const isActionable = item.message.processingStatus === "pending_user";
  const canDecide = isActionable && !!selectedAppliedJobId;
  const appliedJobOptions = jobs.map((job) => ({
    value: job.id,
    label: formatAppliedJobLabel(job),
    searchText: `${job.employer} ${job.title} ${job.location ?? ""}`.trim(),
  }));

  return (
    <div className="flex items-center gap-2 w-full">
      <SearchableDropdown
        value={selectedAppliedJobId}
        options={appliedJobOptions}
        onValueChange={onAppliedJobChange}
        placeholder={isAppliedJobsLoading ? "Chargement..." : "Sélectionner le job"}
        searchPlaceholder="Rechercher un job..."
        emptyText={
          isAppliedJobsLoading ? "Chargement..." : "Aucun job trouvé."
        }
        disabled={isActionLoading}
        triggerClassName="min-w-0 flex-1 h-8 text-xs"
        contentClassName="w-[360px]"
        ariaLabel="Sélectionner le job"
      />

      <div className="flex shrink-0 items-center gap-1.5">
        <Button
          size="sm"
          aria-label="Approuver"
          title="Approuver la correspondance"
          onClick={onApprove}
          disabled={isActionLoading || !canDecide}
          className="h-7 w-7 p-0 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-label="Ignorer"
          title="Ignorer ce message"
          onClick={onDeny}
          disabled={isActionLoading || !isActionable}
          className="h-7 w-7 p-0 rounded-lg border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          <XCircle className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export const EmailViewerList: React.FC<EmailViewerListProps> = ({
  items,
  appliedJobs,
  appliedJobByMessageId,
  onAppliedJobChange,
  onDecision,
  isActionLoading,
  isAppliedJobsLoading,
}) => {
  return (
    <div className="space-y-1.5">
      {items.map((item) => {
        const selectedAppliedJobId =
          appliedJobByMessageId[item.message.id] ||
          item.message.matchedJobId ||
          "";

        return (
          <EmailViewerRow
            key={item.message.id}
            item={item}
            jobs={appliedJobs}
            selectedAppliedJobId={selectedAppliedJobId}
            onAppliedJobChange={(value) =>
              onAppliedJobChange(item.message.id, value)
            }
            onApprove={() => onDecision(item, "approve")}
            onDeny={() => onDecision(item, "deny")}
            isActionLoading={isActionLoading}
            isAppliedJobsLoading={isAppliedJobsLoading}
          />
        );
      })}
    </div>
  );
};
