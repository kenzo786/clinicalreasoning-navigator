import type { ReactNode } from "react";
import type { TopicRuntime, JitlContextType } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { JitlTerm } from "@/components/jitl/JitlTerm";
import {
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Lightbulb,
  Pill,
  ShieldAlert,
  Stethoscope,
  TestTube,
} from "lucide-react";

interface ReviewTabProps {
  topic: TopicRuntime;
  onPromote: (title: string, text: string) => void;
  onOpenJitl: (term: string, contextType: JitlContextType) => void;
}

const DEFAULT_REVIEW_EXPANDED: Record<string, boolean> = {
  illness: true,
  "must-not-miss": true,
  discriminators: true,
  "history-prompts": false,
  "exam-focus": false,
  differentials: false,
  investigations: false,
  management: false,
  safety: true,
  mindset: false,
};

function formatReviewSummary(topic: TopicRuntime, sectionId: string): string {
  const r = topic.review;
  switch (sectionId) {
    case "illness":
      return r.illnessScript.summary;
    case "must-not-miss":
      return r.mustNotMiss
        .map((m) => `${m.condition}: ${m.escalationConcern}`)
        .join("\n");
    case "discriminators":
      return r.discriminators
        .map((d) => `${d.question} - ${d.clinicalValue}`)
        .join("\n");
    case "safety":
      return [
        "Return advice:",
        ...r.safetyNetting.returnAdvice.map((x) => `- ${x}`),
        "",
        "Escalation triggers:",
        ...r.safetyNetting.escalationTriggers.map((x) => `- ${x}`),
      ].join("\n");
    default:
      return "";
  }
}

function Section({
  id,
  title,
  icon,
  children,
  onPromote,
}: {
  id: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
  onPromote?: () => void;
}) {
  const { state, dispatch } = useConsultation();
  const expanded = state.reviewUi.expandedSections[id] ?? (DEFAULT_REVIEW_EXPANDED[id] ?? false);
  const contentId = `review-section-content-${id}`;
  const toggleSection = () => dispatch({ type: "TOGGLE_REVIEW_SECTION", sectionId: id });
  return (
    <section className="border rounded-md overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        data-testid={`review-section-toggle-${id}`}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={toggleSection}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleSection();
          }
        }}
        className="flex cursor-pointer items-center justify-between px-3 py-2 bg-muted/40 border-b transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
        {onPromote && (
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPromote();
            }}
            data-testid={`review-section-send-${id}`}
            className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent"
          >
            Send to editor
          </button>
        )}
      </div>
      {expanded && (
        <div id={contentId} data-testid={contentId} className="p-3">
          {children}
        </div>
      )}
    </section>
  );
}

export function ReviewTab({ topic, onPromote, onOpenJitl }: ReviewTabProps) {
  const { state, dispatch } = useConsultation();
  const review = topic.review;
  const trackedChecklist = [
    "illness",
    "must-not-miss",
    "discriminators",
    "investigations",
    "management",
    "safety",
  ];

  const markReviewed = (id: string, source: "must-not-miss" | "discriminator" | "safety" | "investigation" | "management") => {
    dispatch({ type: "SET_REVIEW_ITEM_STATUS", id, source, status: "reviewed" });
  };

  const markInserted = (id: string, source: "must-not-miss" | "discriminator" | "safety" | "investigation" | "management") => {
    dispatch({ type: "SET_REVIEW_ITEM_STATUS", id, source, status: "inserted" });
  };

  const statusLabel = (id: string) => state.reviewChecklist[id]?.status ?? "pending";
  const statusClass = (status: string) =>
    status === "inserted"
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : status === "reviewed"
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : "bg-secondary text-muted-foreground border-border";

  const progress = trackedChecklist.reduce(
    (acc, id) => {
      const status = statusLabel(id);
      if (status === "inserted") acc.inserted += 1;
      else if (status === "reviewed") acc.reviewed += 1;
      else acc.pending += 1;
      return acc;
    },
    { pending: 0, reviewed: 0, inserted: 0 }
  );

  const hasHistoryPrompts = review.historyPrompts.some((group) => group.prompts.length > 0);
  const hasExamSections = review.examSections.some((group) => group.prompts.length > 0);
  const hasDifferentials =
    review.diagnoses.common.length > 0 ||
    review.diagnoses.mustNotMiss.length > 0 ||
    review.diagnoses.oftenMissed.length > 0;
  const hasInvestigations = review.investigations.whenHelpful.length > 0;
  const hasManagement = review.managementConsiderations.followUpLogic.length > 0;

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-md border border-amber-300 bg-amber-50/70 p-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">Review checklist</p>
        <p className="mt-1 text-[11px] text-amber-900/90">
          Confirm safety-critical findings and mark what has been reviewed or inserted into documentation.
        </p>
        <p className="mt-1 text-[10px] text-amber-800/90">Click any section header to expand or collapse.</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px]">
        <div className="rounded border bg-secondary px-2 py-1 text-muted-foreground">
          Pending: {progress.pending}
        </div>
        <div className="rounded border bg-amber-100 border-amber-300 px-2 py-1 text-amber-700">
          Reviewed: {progress.reviewed}
        </div>
        <div className="rounded border bg-emerald-100 border-emerald-300 px-2 py-1 text-emerald-700">
          Inserted: {progress.inserted}
        </div>
      </div>

      <Section
        id="illness"
        title="Illness Script"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        onPromote={() => {
          onPromote("Illness Script", formatReviewSummary(topic, "illness"));
          markInserted("illness", "management");
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("illness"))}`}>
            {statusLabel("illness")}
          </span>
          <button onClick={() => markReviewed("illness", "management")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
        </div>
        <p className="text-sm leading-relaxed">{review.illnessScript.summary}</p>
      </Section>

      <Section
        id="must-not-miss"
        title="Must Not Miss"
        icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        onPromote={() => {
          onPromote("Must Not Miss", formatReviewSummary(topic, "must-not-miss"));
          markInserted("must-not-miss", "must-not-miss");
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("must-not-miss"))}`}>
            {statusLabel("must-not-miss")}
          </span>
          <button onClick={() => markReviewed("must-not-miss", "must-not-miss")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
        </div>
        <div className="space-y-2">
          {review.mustNotMiss.map((item) => (
            <div key={item.condition} className="rounded border bg-destructive/5 p-2">
              <p className="text-sm font-medium">
                <JitlTerm term={item.condition} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">{item.whyDangerous}</p>
              <p className="text-xs text-destructive mt-1">{item.escalationConcern}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        id="discriminators"
        title="Key Discriminators"
        icon={<Lightbulb className="h-3.5 w-3.5" />}
        onPromote={() => {
          onPromote("Discriminators", formatReviewSummary(topic, "discriminators"));
          markInserted("discriminators", "discriminator");
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("discriminators"))}`}>
            {statusLabel("discriminators")}
          </span>
          <button onClick={() => markReviewed("discriminators", "discriminator")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
        </div>
        <div className="space-y-2">
          {review.discriminators.map((d) => (
            <div key={d.question} className="rounded border p-2">
              <p className="text-sm font-medium">
                <JitlTerm term={d.question} config={topic.jitl} defaultContextType="clinical" onOpen={onOpenJitl} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">{d.reasoning}</p>
              <p className="text-xs text-primary mt-1">{d.clinicalValue}</p>
            </div>
          ))}
        </div>
      </Section>

      {hasHistoryPrompts && (
        <Section id="history-prompts" title="History Prompts" icon={<ClipboardList className="h-3.5 w-3.5" />}>
          <div className="space-y-2">
            {review.historyPrompts.map((group) => (
              <div key={group.category}>
                <p className="text-xs font-semibold mb-1">{group.category}</p>
                <ul className="space-y-1">
                  {group.prompts.map((prompt) => (
                    <li key={prompt.id} className="text-xs text-muted-foreground">
                      <JitlTerm term={prompt.label} config={topic.jitl} defaultContextType="clinical" onOpen={onOpenJitl} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasExamSections && (
        <Section id="exam-focus" title="Exam Focus" icon={<Stethoscope className="h-3.5 w-3.5" />}>
          <div className="space-y-2">
            {review.examSections.map((section) => (
              <div key={section.id}>
                <p className="text-xs font-semibold mb-1">{section.title}</p>
                <div className="space-y-1">
                  {section.prompts.map((prompt) => (
                    <div key={prompt.id} className="text-xs rounded border p-2">
                      <p>
                        <JitlTerm term={prompt.label} config={topic.jitl} defaultContextType="clinical" onOpen={onOpenJitl} />
                      </p>
                      <p className="text-muted-foreground mt-1">{prompt.significance}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasDifferentials && (
        <Section id="differentials" title="Differentials" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
          <div className="space-y-2">
            {(["common", "mustNotMiss", "oftenMissed"] as const).map((group) => (
              <div key={group}>
                <p className="text-xs font-semibold mb-1">
                  {group === "common" ? "Common" : group === "mustNotMiss" ? "Must Not Miss" : "Often Missed"}
                </p>
                <ul className="space-y-1">
                  {review.diagnoses[group].map((d) => (
                    <li key={d.name} className="text-xs">
                      <JitlTerm term={d.name} config={topic.jitl} defaultContextType="ddx" onOpen={onOpenJitl} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasInvestigations && (
        <Section id="investigations" title="Investigations" icon={<TestTube className="h-3.5 w-3.5" />}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("investigations"))}`}>
              {statusLabel("investigations")}
            </span>
            <button onClick={() => markReviewed("investigations", "investigation")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
          </div>
          <div className="space-y-2">
            {review.investigations.whenHelpful.map((item) => (
              <div key={item.test} className="rounded border p-2">
                <p className="text-xs font-medium">{item.test}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {hasManagement && (
        <Section id="management" title="Management" icon={<Pill className="h-3.5 w-3.5" />}>
          <div className="flex justify-between items-center mb-2">
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("management"))}`}>
              {statusLabel("management")}
            </span>
            <button onClick={() => markReviewed("management", "management")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
          </div>
          <ul className="space-y-1">
            {review.managementConsiderations.followUpLogic.map((x) => (
              <li key={x} className="text-xs text-muted-foreground">{x}</li>
            ))}
          </ul>
        </Section>
      )}

      <Section
        id="safety"
        title="Safety Net"
        icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        onPromote={() => {
          onPromote("Safety Net", formatReviewSummary(topic, "safety"));
          markInserted("safety", "safety");
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusClass(statusLabel("safety"))}`}>
            {statusLabel("safety")}
          </span>
          <button onClick={() => markReviewed("safety", "safety")} className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent">Mark reviewed</button>
        </div>
        <ul className="space-y-1">
          {review.safetyNetting.returnAdvice.map((x) => (
            <li key={x} className="text-xs text-muted-foreground">{x}</li>
          ))}
        </ul>
      </Section>

      {review.mindset && (
        <Section id="mindset" title="Consultation Mindset" icon={<Lightbulb className="h-3.5 w-3.5" />}>
          <p className="text-sm italic text-muted-foreground">{review.mindset}</p>
        </Section>
      )}
    </div>
  );
}
