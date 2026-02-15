import { useEffect, useMemo, useState } from "react";
import type { JitlContextType, TopicRuntime } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { JitlTerm } from "@/components/jitl/JitlTerm";
import { composeDDx, composeReasoningSummary } from "@/lib/outputComposer";
import {
  AlertTriangle,
  ArrowUpDown,
  GitCompareArrows,
  GripVertical,
  Plus,
  Star,
  X,
  Zap,
} from "lucide-react";
import { DiagnosisCompareDialog } from "./DiagnosisCompareDialog";

interface ReasonTabProps {
  topic: TopicRuntime;
  onPromote: (title: string, text: string) => void;
  onOpenJitl: (term: string, contextType: JitlContextType) => void;
}

export function ReasonTab({ topic, onPromote, onOpenJitl }: ReasonTabProps) {
  const { state, dispatch } = useConsultation();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [selectedDiagnosisForEvidence, setSelectedDiagnosisForEvidence] = useState<string | null>(null);
  const [customFor, setCustomFor] = useState("");
  const [customAgainst, setCustomAgainst] = useState("");
  const [compareOpen, setCompareOpen] = useState(false);
  const [evidenceQuery, setEvidenceQuery] = useState("");
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);

  const allDiagnoses = useMemo(
    () => [
      ...topic.review.diagnoses.common.map((d) => ({ ...d, group: "Common" })),
      ...topic.review.diagnoses.mustNotMiss.map((d) => ({ ...d, group: "Must Not Miss" })),
      ...topic.review.diagnoses.oftenMissed.map((d) => ({ ...d, group: "Often Missed" })),
    ],
    [topic]
  );

  const evidencePrompts = useMemo(() => {
    const promptSet = new Set<string>(topic.ddx.evidencePrompts);
    allDiagnoses.forEach((d) => d.keyFeatures?.forEach((feature) => promptSet.add(feature)));
    topic.review.examSections.forEach((section) => {
      section.prompts.forEach((prompt) => promptSet.add(prompt.label));
    });
    topic.review.historyPrompts.forEach((section) => {
      section.prompts.forEach((prompt) => promptSet.add(prompt.label));
    });
    return [...promptSet];
  }, [topic, allDiagnoses]);

  const currentForItems = useMemo(
    () =>
      selectedDiagnosisForEvidence
        ? state.ddx.evidenceFor.find((e) => e.diagnosis === selectedDiagnosisForEvidence)?.items ?? []
        : [],
    [state.ddx.evidenceFor, selectedDiagnosisForEvidence]
  );
  const currentAgainstItems = useMemo(
    () =>
      selectedDiagnosisForEvidence
        ? state.ddx.evidenceAgainst.find((e) => e.diagnosis === selectedDiagnosisForEvidence)?.items ?? []
        : [],
    [state.ddx.evidenceAgainst, selectedDiagnosisForEvidence]
  );

  const filteredEvidencePrompts = useMemo(() => {
    const q = evidenceQuery.trim().toLowerCase();
    return evidencePrompts.filter((prompt) => {
      if (showAssignedOnly && !currentForItems.includes(prompt) && !currentAgainstItems.includes(prompt)) {
        return false;
      }
      if (!q) return true;
      return prompt.toLowerCase().includes(q);
    });
  }, [evidencePrompts, evidenceQuery, showAssignedOnly, currentForItems, currentAgainstItems]);

  useEffect(() => {
    if (!selectedDiagnosisForEvidence && state.ddx.workingDiagnoses.length > 0) {
      setSelectedDiagnosisForEvidence(state.ddx.workingDiagnoses[0].name);
    }
    if (
      selectedDiagnosisForEvidence &&
      !state.ddx.workingDiagnoses.some((d) => d.name === selectedDiagnosisForEvidence)
    ) {
      setSelectedDiagnosisForEvidence(state.ddx.workingDiagnoses[0]?.name ?? null);
    }
  }, [state.ddx.workingDiagnoses, selectedDiagnosisForEvidence]);

  const markExamNormal = () => {
    const defaults: Record<string, string> = {};
    const exam = topic.structuredFields.find((s) => s.id === "exam");
    if (!exam) return;
    for (const field of exam.fields) {
      if (field.type === "select" && field.options?.includes("normal")) {
        defaults[field.id] = "normal";
      }
    }
    dispatch({ type: "SET_STRUCTURED_SECTION_DEFAULTS", values: defaults });
  };

  const addCommonSafetyNet = () => {
    const topAdvice = topic.review.safetyNetting.returnAdvice.slice(0, 3).join("; ");
    dispatch({ type: "SET_STRUCTURED_RESPONSE", fieldId: "safety-advice", value: true });
    dispatch({ type: "SET_STRUCTURED_RESPONSE", fieldId: "safety-details", value: topAdvice });
  };

  const promoteAssessment = () => {
    const text = [composeDDx(state), composeReasoningSummary(topic, state)].filter(Boolean).join("\n\n");
    onPromote("Assessment", text);
  };

  return (
    <div className="p-3 space-y-4">
      <div className="rounded-md border p-2 bg-muted/20">
        <div className="flex flex-wrap gap-1">
          <button onClick={markExamNormal} className="text-xs px-2 py-1 rounded border bg-secondary hover:bg-accent">
            Mark all normal
          </button>
          <button onClick={addCommonSafetyNet} className="text-xs px-2 py-1 rounded border bg-secondary hover:bg-accent">
            Add common safety net
          </button>
          <button onClick={promoteAssessment} className="text-xs px-2 py-1 rounded border bg-primary/10 border-primary/30 text-primary hover:bg-primary/20">
            Promote to Assessment
          </button>
        </div>
      </div>

      <section>
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive mb-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Red Flags
        </h3>
        <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2">
          {topic.reasoning.redFlags.map((flag, i) => {
            const key = `rf-${i}`;
            const checked = state.reasoningChecks.redFlagsConfirmed[key] ?? false;
            return (
              <label key={key} className="flex items-start gap-2 py-1 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => dispatch({ type: "TOGGLE_RED_FLAG", flagId: key })}
                  className="mt-0.5 accent-destructive"
                />
                <span className={checked ? "line-through text-muted-foreground" : ""}>{flag}</span>
              </label>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Working Diagnosis Builder</h3>
          {state.ddx.compareSelection.length === 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="text-xs px-2 py-1 rounded border bg-secondary hover:bg-accent"
            >
              Compare selected
            </button>
          )}
        </div>

        {state.ddx.workingDiagnoses.length > 0 && (
          <div className="space-y-1">
            {state.ddx.workingDiagnoses.map((d, i) => (
              <div
                key={d.name}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (dragIndex === null || dragIndex === i) return;
                  dispatch({ type: "DDX_REORDER", from: dragIndex, to: i });
                  setDragIndex(i);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`flex items-center gap-2 p-2 rounded border ${dragIndex === i ? "bg-primary/5 border-primary/30" : "bg-card"}`}
              >
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-sm flex-1">
                  <JitlTerm term={d.name} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
                </span>
                <span className="text-[10px] px-1 py-0.5 rounded border bg-emerald-50 text-emerald-700">
                  +{state.ddx.evidenceFor.find((e) => e.diagnosis === d.name)?.items.length ?? 0}
                </span>
                <span className="text-[10px] px-1 py-0.5 rounded border bg-red-50 text-red-700">
                  -{state.ddx.evidenceAgainst.find((e) => e.diagnosis === d.name)?.items.length ?? 0}
                </span>
                <button onClick={() => dispatch({ type: "DDX_SET_PRIMARY", name: d.name })}>
                  <Star className={`h-3.5 w-3.5 ${d.isPrimary ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                </button>
                <button
                  onClick={() => dispatch({ type: "DDX_TOGGLE_COMPARE", name: d.name })}
                  className={state.ddx.compareSelection.includes(d.name) ? "text-primary" : "text-muted-foreground"}
                >
                  <GitCompareArrows className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => dispatch({ type: "DDX_REMOVE", name: d.name })}>
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={customDiagnosis}
            onChange={(e) => setCustomDiagnosis(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                dispatch({ type: "DDX_ADD_CUSTOM", name: customDiagnosis });
                setCustomDiagnosis("");
              }
            }}
            placeholder="Add custom diagnosis"
            className="h-8 flex-1 px-2 text-sm rounded border bg-background"
          />
          <button
            onClick={() => {
              dispatch({ type: "DDX_ADD_CUSTOM", name: customDiagnosis });
              setCustomDiagnosis("");
            }}
            className="h-8 px-2 rounded border bg-secondary hover:bg-accent text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>

        {(["Common", "Must Not Miss", "Often Missed"] as const).map((group) => (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{group}</p>
            <div className="space-y-1">
              {allDiagnoses
                .filter((d) => d.group === group)
                .map((d) => {
                  const selected = state.ddx.workingDiagnoses.some((x) => x.name === d.name);
                  return (
                    <button
                      key={d.name}
                      onClick={() => dispatch({ type: "DDX_TOGGLE_DIAGNOSIS", name: d.name })}
                      className={`w-full text-left p-2 rounded border text-sm ${
                        selected ? "bg-primary/5 border-primary/30 text-primary" : "bg-card hover:bg-accent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <JitlTerm term={d.name} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
                        <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </section>

      {state.ddx.workingDiagnoses.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Evidence For / Against</h3>
          <select
            value={selectedDiagnosisForEvidence ?? ""}
            onChange={(e) => setSelectedDiagnosisForEvidence(e.target.value || null)}
            className="h-8 w-full rounded border bg-background px-2 text-sm"
          >
            <option value="">Select diagnosis...</option>
            {state.ddx.workingDiagnoses.map((d) => (
              <option key={d.name} value={d.name}>{d.name}</option>
            ))}
          </select>

          {selectedDiagnosisForEvidence && (
            <div className="flex gap-2">
              <input
                value={evidenceQuery}
                onChange={(e) => setEvidenceQuery(e.target.value)}
                placeholder="Filter evidence prompts..."
                className="h-8 flex-1 rounded border bg-background px-2 text-xs"
              />
              <button
                onClick={() => setShowAssignedOnly((v) => !v)}
                className={`h-8 px-2 rounded border text-xs ${
                  showAssignedOnly ? "bg-primary/10 border-primary/30 text-primary" : "bg-secondary hover:bg-accent"
                }`}
              >
                Assigned only
              </button>
            </div>
          )}

          {selectedDiagnosisForEvidence && (
            <div className="space-y-1 max-h-56 overflow-y-auto border rounded p-2">
              {filteredEvidencePrompts.map((prompt) => {
                const isFor = currentForItems.includes(prompt);
                const isAgainst = currentAgainstItems.includes(prompt);
                return (
                  <div key={prompt} className="flex items-center justify-between gap-2 text-xs py-1 border-b last:border-0">
                    <span className="flex-1">{prompt}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          dispatch({
                            type: "DDX_ASSIGN_EVIDENCE",
                            diagnosis: selectedDiagnosisForEvidence,
                            item: prompt,
                            side: "for",
                            selected: !isFor,
                          })
                        }
                        className={`px-2 py-0.5 rounded border ${isFor ? "bg-emerald-100 border-emerald-300 text-emerald-700" : "bg-secondary"}`}
                      >
                        For
                      </button>
                      <button
                        onClick={() =>
                          dispatch({
                            type: "DDX_ASSIGN_EVIDENCE",
                            diagnosis: selectedDiagnosisForEvidence,
                            item: prompt,
                            side: "against",
                            selected: !isAgainst,
                          })
                        }
                        className={`px-2 py-0.5 rounded border ${isAgainst ? "bg-red-100 border-red-300 text-red-700" : "bg-secondary"}`}
                      >
                        Against
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredEvidencePrompts.length === 0 && (
                <p className="text-xs text-muted-foreground italic py-1">No evidence prompts match current filter.</p>
              )}
            </div>
          )}

          {selectedDiagnosisForEvidence && (
            <div className="grid grid-cols-1 gap-2">
              <div className="flex gap-1">
                <input
                  value={customFor}
                  onChange={(e) => setCustomFor(e.target.value)}
                  placeholder="Custom supporting evidence"
                  className="h-8 flex-1 px-2 rounded border text-xs"
                />
                <button
                  onClick={() => {
                    const item = customFor.trim();
                    if (!item || !selectedDiagnosisForEvidence) return;
                    dispatch({
                      type: "DDX_ASSIGN_EVIDENCE",
                      diagnosis: selectedDiagnosisForEvidence,
                      item,
                      side: "for",
                      selected: true,
                    });
                    setCustomFor("");
                  }}
                  className="h-8 px-2 rounded border text-xs bg-secondary hover:bg-accent"
                >
                  <Zap className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex gap-1">
                <input
                  value={customAgainst}
                  onChange={(e) => setCustomAgainst(e.target.value)}
                  placeholder="Custom contrary evidence"
                  className="h-8 flex-1 px-2 rounded border text-xs"
                />
                <button
                  onClick={() => {
                    const item = customAgainst.trim();
                    if (!item || !selectedDiagnosisForEvidence) return;
                    dispatch({
                      type: "DDX_ASSIGN_EVIDENCE",
                      diagnosis: selectedDiagnosisForEvidence,
                      item,
                      side: "against",
                      selected: true,
                    });
                    setCustomAgainst("");
                  }}
                  className="h-8 px-2 rounded border text-xs bg-secondary hover:bg-accent"
                >
                  <Zap className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {state.ddx.compareSelection.length === 2 && (
        <DiagnosisCompareDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          diagnosisA={state.ddx.compareSelection[0]}
          diagnosisB={state.ddx.compareSelection[1]}
          state={state}
        />
      )}
    </div>
  );
}
