import { Briefcase } from "lucide-react";
import type React from "react";

export const EmptyState: React.FC = () => {
  return (
    <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 text-center px-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20">
        <Briefcase className="h-6 w-6 text-blue-400/60" />
      </div>
      <div className="text-sm font-medium text-muted-foreground">
        Aucune offre sélectionnée
      </div>
      <p className="text-xs text-muted-foreground/60 max-w-[220px]">
        Cliquez sur une offre pour voir les détails, le score de correspondance et les options de candidature.
      </p>
    </div>
  );
};
