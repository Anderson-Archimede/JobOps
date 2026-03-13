import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { Button } from "@/components/ui/button";

interface FloatingJobActionsBarProps {
  selectedCount: number;
  canMoveSelected: boolean;
  canSkipSelected: boolean;
  canRescoreSelected: boolean;
  jobActionInFlight: boolean;
  onMoveToReady: () => void;
  onSkipSelected: () => void;
  onRescoreSelected: () => void;
  onClear: () => void;
}

export const FloatingJobActionsBar: React.FC<FloatingJobActionsBarProps> = ({
  selectedCount,
  canMoveSelected,
  canSkipSelected,
  canRescoreSelected,
  jobActionInFlight,
  onMoveToReady,
  onSkipSelected,
  onRescoreSelected,
  onClear,
}) => {
  return (
    <AnimatePresence initial={false}>
      {selectedCount > 0 ? (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 flex justify-center px-3 sm:px-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="pointer-events-auto flex w-full max-w-md flex-col items-stretch gap-2 rounded-xl border border-blue-500/30 bg-card/95 px-4 py-3 shadow-2xl shadow-blue-500/10 backdrop-blur supports-[backdrop-filter]:bg-card/85 sm:w-auto sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center">
            <div className="text-xs font-medium text-foreground tabular-nums sm:mr-1">
              {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              {canMoveSelected && (
                <Button
                  type="button"
                  size="sm"
                  className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-500 text-white hover:from-emerald-700 hover:to-green-600"
                  disabled={jobActionInFlight}
                  onClick={onMoveToReady}
                >
                  Prêt a postuler
                </Button>
              )}
              {canSkipSelected && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={jobActionInFlight}
                  onClick={onSkipSelected}
                >
                  Passer
                </Button>
              )}
              {canRescoreSelected && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={jobActionInFlight}
                  onClick={onRescoreSelected}
                >
                  Recalculer le score
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={onClear}
                disabled={jobActionInFlight}
              >
                Annuler
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};
