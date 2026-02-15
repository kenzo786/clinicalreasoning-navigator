import { useEffect } from "react";
import type { TopicRuntime } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { evaluateShowIf } from "@/lib/showIf";
import { DynamicField } from "./DynamicField";

interface StructuredTabProps {
  topic: TopicRuntime;
}

export function StructuredTab({ topic }: StructuredTabProps) {
  const { state, dispatch } = useConsultation();

  useEffect(() => {
    const defaults: Record<string, string | number | boolean | string[]> = {};
    for (const section of topic.structuredFields) {
      for (const field of section.fields) {
        if (field.type === "select" && field.options?.length) {
          const preferred =
            field.options.find((o) => ["normal", "none", "no", "negative", "not tested"].includes(o.toLowerCase())) ??
            field.options[0];
          defaults[field.id] = preferred;
        }
      }
    }
    dispatch({ type: "SET_STRUCTURED_SECTION_DEFAULTS", values: defaults });
  }, [topic.metadata.id, topic.structuredFields, dispatch]);

  return (
    <div className="p-3 space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() =>
            dispatch({
              type: "SET_UI_PREF",
              key: "compactStructured",
              value: !state.uiPrefs.compactStructured,
            })
          }
          className="text-xs px-2 py-1 rounded border bg-secondary hover:bg-accent"
        >
          {state.uiPrefs.compactStructured ? "Comfortable mode" : "Compact mode"}
        </button>
      </div>
      {topic.structuredFields.map((section) => (
        <section key={section.id}>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {section.title}
          </h3>
          <div className="space-y-2">
            {section.fields.map((field) => {
              if (field.showIf && !evaluateShowIf(field.showIf, state.structuredResponses)) {
                return null;
              }
              return (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={state.structuredResponses[field.id]}
                  compact={state.uiPrefs.compactStructured}
                  onChange={(val) =>
                    dispatch({ type: "SET_STRUCTURED_RESPONSE", fieldId: field.id, value: val })
                  }
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
