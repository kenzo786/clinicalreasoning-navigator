import { X } from "lucide-react";
import type { ConsultationState } from "@/types/consultation";

interface DiagnosisCompareDialogProps {
  open: boolean;
  onClose: () => void;
  diagnosisA: string;
  diagnosisB: string;
  state: ConsultationState;
}

function getEvidence(state: ConsultationState, diagnosis: string, side: "for" | "against"): string[] {
  const entries = side === "for" ? state.ddx.evidenceFor : state.ddx.evidenceAgainst;
  return entries.find((e) => e.diagnosis === diagnosis)?.items ?? [];
}

export function DiagnosisCompareDialog({
  open,
  onClose,
  diagnosisA,
  diagnosisB,
  state,
}: DiagnosisCompareDialogProps) {
  if (!open) return null;

  const renderColumn = (name: string) => (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">{name}</h4>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Supports</p>
        <ul className="space-y-1">
          {getEvidence(state, name, "for").map((item) => (
            <li key={item} className="text-xs">+ {item}</li>
          ))}
          {getEvidence(state, name, "for").length === 0 && (
            <li className="text-xs text-muted-foreground italic">No supporting evidence</li>
          )}
        </ul>
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1">Against</p>
        <ul className="space-y-1">
          {getEvidence(state, name, "against").map((item) => (
            <li key={item} className="text-xs">- {item}</li>
          ))}
          {getEvidence(state, name, "against").length === 0 && (
            <li className="text-xs text-muted-foreground italic">No contrary evidence</li>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-card rounded-lg border shadow-xl overflow-hidden">
        <div className="h-11 px-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Compare Diagnoses</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderColumn(diagnosisA)}
          {renderColumn(diagnosisB)}
        </div>
      </div>
    </div>
  );
}

