import type { TopicV1 } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { evaluateShowIf } from "@/lib/showIf";
import { DynamicField } from "./DynamicField";

interface StructuredTabProps {
  topic: TopicV1;
}

export function StructuredTab({ topic }: StructuredTabProps) {
  const { state, dispatch } = useConsultation();

  return (
    <div className="p-3 space-y-4">
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
