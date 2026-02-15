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
  return (
    <section className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-muted/40 border-b">
        <button
          onClick={() => dispatch({ type: "TOGGLE_REVIEW_SECTION", sectionId: id })}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {icon}
          {title}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {onPromote && (
          <button
            onClick={onPromote}
            className="text-[10px] px-2 py-1 rounded border bg-secondary hover:bg-accent"
          >
            Send to editor
          </button>
        )}
      </div>
      {expanded && <div className="p-3">{children}</div>}
    </section>
  );
}

export function ReviewTab({ topic, onPromote, onOpenJitl }: ReviewTabProps) {
  const review = topic.review;

  return (
    <div className="p-3 space-y-3">
      <Section
        id="illness"
        title="Illness Script"
        icon={<BookOpen className="h-3.5 w-3.5" />}
        onPromote={() => onPromote("Illness Script", formatReviewSummary(topic, "illness"))}
      >
        <p className="text-sm leading-relaxed">{review.illnessScript.summary}</p>
      </Section>

      <Section
        id="must-not-miss"
        title="Must Not Miss"
        icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        onPromote={() => onPromote("Must Not Miss", formatReviewSummary(topic, "must-not-miss"))}
      >
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
        onPromote={() => onPromote("Discriminators", formatReviewSummary(topic, "discriminators"))}
      >
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

      <Section id="investigations" title="Investigations" icon={<TestTube className="h-3.5 w-3.5" />}>
        <div className="space-y-2">
          {review.investigations.whenHelpful.map((item) => (
            <div key={item.test} className="rounded border p-2">
              <p className="text-xs font-medium">{item.test}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.rationale}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="management" title="Management" icon={<Pill className="h-3.5 w-3.5" />}>
        <ul className="space-y-1">
          {review.managementConsiderations.followUpLogic.map((x) => (
            <li key={x} className="text-xs text-muted-foreground">{x}</li>
          ))}
        </ul>
      </Section>

      <Section
        id="safety"
        title="Safety Net"
        icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
        onPromote={() => onPromote("Safety Net", formatReviewSummary(topic, "safety"))}
      >
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
