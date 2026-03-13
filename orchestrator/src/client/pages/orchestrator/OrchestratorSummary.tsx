import { PipelineProgress } from "@client/components";
import { useWelcomeMessage } from "@client/hooks/useWelcomeMessage";
import type { JobStatus } from "@shared/types.js";
import { Briefcase, Eye, CheckCircle, Clock, TrendingUp, Zap } from "lucide-react";
import type React from "react";

interface OrchestratorSummaryProps {
  stats: Record<JobStatus, number>;
  isPipelineRunning: boolean;
}

const STAT_CARDS: Array<{
  key: JobStatus;
  label: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
}> = [
  { key: "discovered", label: "Découvertes", icon: Eye, gradient: "from-sky-500/15 to-blue-500/5", iconBg: "bg-sky-500/20 text-sky-400" },
  { key: "ready", label: "Prêtes", icon: Zap, gradient: "from-emerald-500/15 to-green-500/5", iconBg: "bg-emerald-500/20 text-emerald-400" },
  { key: "applied", label: "Postulées", icon: CheckCircle, gradient: "from-violet-500/15 to-purple-500/5", iconBg: "bg-violet-500/20 text-violet-400" },
  { key: "in_progress", label: "En cours", icon: Clock, gradient: "from-amber-500/15 to-orange-500/5", iconBg: "bg-amber-500/20 text-amber-400" },
];

export const OrchestratorSummary: React.FC<OrchestratorSummaryProps> = ({
  stats,
  isPipelineRunning,
}) => {
  const welcomeText = useWelcomeMessage();
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{welcomeText}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {total > 0 ? `${total} offre${total > 1 ? "s" : ""} dans votre pipeline` : "Aucune offre pour le moment"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAT_CARDS.map(({ key, label, icon: Icon, gradient, iconBg }) => (
          <div
            key={key}
            className={`relative overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br ${gradient} p-3 transition-all hover:border-border/60`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xl font-bold tabular-nums">{stats[key] ?? 0}</div>
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isPipelineRunning && (
        <div className="max-w-3xl">
          <PipelineProgress isRunning={isPipelineRunning} />
        </div>
      )}
    </section>
  );
};
