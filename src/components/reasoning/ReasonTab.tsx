import { useCallback, useEffect, useMemo, useState } from "react";
import type { JitlContextType, TopicRuntime } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { JitlTerm } from "@/components/jitl/JitlTerm";
import { composeDDx, composeReasoningSummary } from "@/lib/outputComposer";
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronDown,
  ChevronUp,
  GitCompareArrows,
  GripVertical,
  Plus,
  Star,
  X,
  Zap,
} from "lucide-react";
import { DiagnosisCompareDialog } from "./DiagnosisCompareDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ReasonTabProps {
  topic: TopicRuntime;
  onPromote: (title: string, text: string) => void;
  onOpenJitl: (term: string, contextType: JitlContextType) => void;
}

type ReasonSectionId = "red-flags" | "ddx" | "evidence";

interface SectionCardProps {
  id: ReasonSectionId;
  title: string;
  badge: string;
  expandedSection: ReasonSectionId | null;
  onExpand: (id: ReasonSectionId) => void;
  children: React.ReactNode;
}

function SectionCard({
  id,
  title,
  badge,
  expandedSection,
  onExpand,
  children,
}: SectionCardProps) {
  const expanded = expandedSection === id;
  return (
    <section className="rounded-md border">
      <button
        onClick={() => onExpand(id)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2 text-left"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="rounded border bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {badge}
          </span>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </span>
      </button>
      {expanded && <div className="p-3">{children}</div>}
    </section>
  );
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
  const [expandedSection, setExpandedSection] = useState<ReasonSectionId | null>("red-flags");
  const [confirmMarkNormalOpen, setConfirmMarkNormalOpen] = useState(false);

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

  const selectedRedFlags = useMemo(
    () => Object.values(state.reasoningChecks.redFlagsConfirmed).filter(Boolean).length,
    [state.reasoningChecks.redFlagsConfirmed]
  );
  const workingDdxCount = state.ddx.workingDiagnoses.length;
  const evidenceForCount = useMemo(
    () => state.ddx.evidenceFor.reduce((sum, e) => sum + e.items.length, 0),
    [state.ddx.evidenceFor]
  );
  const evidenceAgainstCount = useMemo(
    () => state.ddx.evidenceAgainst.reduce((sum, e) => sum + e.items.length, 0),
    [state.ddx.evidenceAgainst]
  );
  const assignedEvidenceCount = evidenceForCount + evidenceAgainstCount;

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

  const handleExpandSection = useCallback((id: ReasonSectionId) => {
    setExpandedSection((current) => (current === id ? null : id));
  }, []);

  return (
    <div className="p-3 space-y-4">
      <div className="rounded-md border border-primary/30 bg-primary/5 p-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Reasoning workspace</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Build and rank your differential, use drag handles (GripVertical icon) to reorder, then assign evidence for and against before inserting into the note.
        </p>
      </div>
      <div className="rounded-md border p-2 bg-muted/20">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setConfirmMarkNormalOpen(true)}
            className="text-xs px-2 py-1 rounded border bg-secondary hover:bg-accent"
          >
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

      <SectionCard
        id="red-flags"
        title="Red Flags"
        badge={`${selectedRedFlags} selected`}
        expandedSection={expandedSection}
        onExpand={handleExpandSection}
      >
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
      </SectionCard>

      <SectionCard
        id="ddx"
        title="Working Diagnosis Builder"
        badge={`${workingDdxCount} active`}
        expandedSection={expandedSection}
        onExpand={handleExpandSection}
      >
        <p className="mb-2 text-[10px] text-muted-foreground">
          Keyboard flow: Ctrl/Cmd+3 focus Reason, Ctrl/Cmd+Shift+I insert selected section.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Differential list</h3>
            {topic.ddx.compareEnabled && state.ddx.compareSelection.length === 2 && (
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex" aria-label="Drag to reorder diagnosis" title="Drag to reorder diagnosis">
                        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Drag to reorder diagnosis</TooltipContent>
                  </Tooltip>
                  <span className="text-sm flex-1">
                    <JitlTerm term={d.name} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="text-[10px] px-1 py-0.5 rounded border bg-emerald-50 text-emerald-700"
                        aria-label={`${d.name} supporting evidence count`}
                        title="Supporting evidence count"
                      >
                        +{state.ddx.evidenceFor.find((e) => e.diagnosis === d.name)?.items.length ?? 0}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Supporting evidence count</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="text-[10px] px-1 py-0.5 rounded border bg-red-50 text-red-700"
                        aria-label={`${d.name} contrary evidence count`}
                        title="Contrary evidence count"
                      >
                        -{state.ddx.evidenceAgainst.find((e) => e.diagnosis === d.name)?.items.length ?? 0}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Contrary evidence count</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => dispatch({ type: "DDX_SET_PRIMARY", name: d.name })}
                        aria-label={`Set ${d.name} as primary diagnosis`}
                      >
                        <Star className={`h-3.5 w-3.5 ${d.isPrimary ? "text-primary fill-primary" : "text-muted-foreground"}`} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Set primary diagnosis</TooltipContent>
                  </Tooltip>
                  {topic.ddx.compareEnabled && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => dispatch({ type: "DDX_TOGGLE_COMPARE", name: d.name })}
                          className={state.ddx.compareSelection.includes(d.name) ? "text-primary" : "text-muted-foreground"}
                          aria-label={`Toggle ${d.name} for comparison`}
                        >
                          <GitCompareArrows className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Add/remove from compare</TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => dispatch({ type: "DDX_REMOVE", name: d.name })}
                        aria-label={`Remove ${d.name} from differential`}
                      >
                        <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Remove diagnosis</TooltipContent>
                  </Tooltip>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    dispatch({ type: "DDX_ADD_CUSTOM", name: customDiagnosis });
                    setCustomDiagnosis("");
                  }}
                  className="h-8 px-2 rounded border bg-secondary hover:bg-accent text-xs"
                  aria-label="Add custom diagnosis"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add custom diagnosis</TooltipContent>
            </Tooltip>
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
                      <div
                        key={d.name}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (selected) return;
                          dispatch({ type: "DDX_TOGGLE_DIAGNOSIS", name: d.name });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            if (selected) return;
                            dispatch({ type: "DDX_TOGGLE_DIAGNOSIS", name: d.name });
                          }
                        }}
                        className={`w-full text-left p-2 rounded border text-sm cursor-pointer ${
                          selected
                            ? "bg-primary/5 border-primary/30 text-primary cursor-default"
                            : "bg-card hover:bg-accent"
                        }`}
                        aria-label={d.name}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <JitlTerm term={d.name} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
                          {selected ? (
                            <span className="inline-flex items-center gap-1 text-[10px] rounded border border-primary/40 px-1.5 py-0.5">
                              <Check className="h-3 w-3" />
                              Added
                            </span>
                          ) : (
                            <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        id="evidence"
        title="Evidence For / Against"
        badge={`${assignedEvidenceCount} assigned (${evidenceForCount} For, ${evidenceAgainstCount} Against)`}
        expandedSection={expandedSection}
        onExpand={handleExpandSection}
      >
        {state.ddx.workingDiagnoses.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Add a diagnosis to assign evidence.</p>
        ) : (
          <div className="space-y-2">
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
                          aria-label={`Mark "${prompt}" as supporting evidence`}
                          title="Mark as supporting evidence"
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
                          aria-label={`Mark "${prompt}" as contrary evidence`}
                          title="Mark as contrary evidence"
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
                    aria-label="Add custom supporting evidence"
                    title="Add custom supporting evidence"
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
                    aria-label="Add custom contrary evidence"
                    title="Add custom contrary evidence"
                    className="h-8 px-2 rounded border text-xs bg-secondary hover:bg-accent"
                  >
                    <Zap className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </SectionCard>

      {topic.ddx.compareEnabled && state.ddx.compareSelection.length === 2 && (
        <DiagnosisCompareDialog
          open={compareOpen}
          onClose={() => setCompareOpen(false)}
          diagnosisA={state.ddx.compareSelection[0]}
          diagnosisB={state.ddx.compareSelection[1]}
          state={state}
        />
      )}
      <AlertDialog open={confirmMarkNormalOpen} onOpenChange={setConfirmMarkNormalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark all normal findings?</AlertDialogTitle>
            <AlertDialogDescription>
              This fills all examination select fields that have a normal option.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                markExamNormal();
                setConfirmMarkNormalOpen(false);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
