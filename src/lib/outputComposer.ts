import type { TopicV1 } from "@/types/topic";
import type { ConsultationState } from "@/types/consultation";

export function composeOutput(topic: TopicV1, state: ConsultationState): string {
  const sections: string[] = [];

  for (const section of topic.outputTemplate.sections) {
    // Check inclusion
    const included = state.sectionInclusions[section.id] ?? section.includeByDefault;
    if (!included) continue;

    let content = "";

    if (section.source === "editor") {
      content = state.editorText.trim();
    } else if (section.source === "structured" && section.structuredSectionId) {
      const structSection = topic.structuredFields.find(
        (s) => s.id === section.structuredSectionId
      );
      if (structSection) {
        const lines: string[] = [];
        for (const field of structSection.fields) {
          const val = state.structuredResponses[field.id];
          if (val !== undefined && val !== "" && val !== false) {
            const display = Array.isArray(val) ? val.join(", ") : String(val);
            lines.push(`${field.label}: ${display}`);
          }
        }
        content = lines.join("\n");
      }
    } else if (section.source === "reasoning") {
      const confirmed = Object.entries(state.reasoningChecks.redFlagsConfirmed)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (confirmed.length > 0) {
        content = `Red flags assessed: ${confirmed.join(", ")}`;
      }
    }

    if (content) {
      sections.push(`## ${section.title}\n${content}`);
    }
  }

  return sections.join("\n\n");
}
