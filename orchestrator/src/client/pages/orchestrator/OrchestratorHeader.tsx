import { PageHeader, StatusIndicator } from "@client/components/layout";
import type { JobSource } from "@shared/types.js";
import { Loader2, Play, Square, Sparkles, Search, Zap, Globe } from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";

interface OrchestratorHeaderProps {
  navOpen: boolean;
  onNavOpenChange: (open: boolean) => void;
  isPipelineRunning: boolean;
  isCancelling: boolean;
  pipelineSources: JobSource[];
  onOpenAutomaticRun: () => void;
  onCancelPipeline: () => void;
}

export const OrchestratorHeader: React.FC<OrchestratorHeaderProps> = ({
  navOpen,
  onNavOpenChange,
  isPipelineRunning,
  isCancelling,
  pipelineSources,
  onOpenAutomaticRun,
  onCancelPipeline,
}) => {
  const actions = (
    <div className="flex items-center gap-2">
      {isPipelineRunning ? (
        <Button
          size="sm"
          onClick={onCancelPipeline}
          disabled={isCancelling}
          variant="destructive"
          className="gap-2"
        >
          {isCancelling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {isCancelling ? `Arrêt (${pipelineSources.length})` : `Arrêter`}
          </span>
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={onOpenAutomaticRun}
          className="gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white hover:from-blue-700 hover:to-violet-700"
        >
          <Play className="h-4 w-4" />
          <span className="hidden sm:inline">Lancer pipeline</span>
        </Button>
      )}
    </div>
  );

  return (
    <PageHeader
      icon={() => (
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
          <Globe className="h-5 w-5 text-white" />
        </div>
      )}
      title="Centre des Offres"
      subtitle="Recherche & Candidatures"
      navOpen={navOpen}
      onNavOpenChange={onNavOpenChange}
      statusIndicator={
        isPipelineRunning ? (
          <StatusIndicator label="Pipeline en cours" variant="amber" />
        ) : undefined
      }
      actions={actions}
    />
  );
};
