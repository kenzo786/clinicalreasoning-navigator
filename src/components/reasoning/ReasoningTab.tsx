import type { TopicV1 } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { AlertTriangle, ExternalLink, ShieldAlert, Target, Eye } from "lucide-react";

interface ReasoningTabProps {
  topic: TopicV1;
}

export function ReasoningTab({ topic }: ReasoningTabProps) {
  const { state, dispatch } = useConsultation();
  const { reasoning } = topic;

  return (
    <div className="p-3 space-y-4">
      {/* Red Flags - prominent */}
      {reasoning.redFlags.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-destructive mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            Red Flags
          </h3>
          <div className="space-y-1 rounded-md border border-destructive/30 bg-destructive/5 p-2">
            {reasoning.redFlags.map((flag, i) => {
              const key = `rf-${i}`;
              const checked = state.reasoningChecks.redFlagsConfirmed[key] ?? false;
              return (
                <label
                  key={key}
                  className="flex items-start gap-2 py-1 text-sm cursor-pointer hover:bg-destructive/5 rounded px-1"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => dispatch({ type: "TOGGLE_RED_FLAG", flagId: key })}
                    className="mt-0.5 accent-destructive"
                  />
                  <span className={checked ? "text-muted-foreground line-through" : "text-foreground"}>
                    {flag}
                  </span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      {/* Must Not Miss */}
      {reasoning.mustNotMiss.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-warning mb-2">
            <ShieldAlert className="h-3.5 w-3.5" />
            Must Not Miss
          </h3>
          <ul className="space-y-1">
            {reasoning.mustNotMiss.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm px-1 py-0.5">
                <span className="text-warning mt-1 shrink-0">-</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Discriminators */}
      {reasoning.discriminators.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-2">
            <Target className="h-3.5 w-3.5" />
            Key Discriminators
          </h3>
          <ul className="space-y-1">
            {reasoning.discriminators.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm px-1 py-0.5">
                <span className="text-primary mt-1 shrink-0">-</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* References */}
      {reasoning.references.length > 0 && (
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Eye className="h-3.5 w-3.5" />
            References
          </h3>
          <div className="space-y-1">
            {reasoning.references.map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline px-1 py-0.5"
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                {ref.label}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
