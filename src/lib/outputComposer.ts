import type { TopicRuntime, OutputSection } from "@/types/topic";
import type { ConsultationState } from "@/types/consultation";
import { evaluateShowIf } from "@/lib/showIf";

function isMeaningful(value: string | number | boolean | string[] | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export function composeStructuredSection(topic: TopicRuntime, state: ConsultationState, structuredSectionId: string): string {
  const structSection = topic.structuredFields.find((s) => s.id === structuredSectionId);
  if (!structSection) return "";

  const lines: string[] = [];
  for (const field of structSection.fields) {
    if (field.showIf && !evaluateShowIf(field.showIf, state.structuredResponses)) {
      continue;
    }
    const val = state.structuredResponses[field.id];
    if (!isMeaningful(val)) continue;
    const display = Array.isArray(val) ? val.join(", ") : String(val);
    lines.push(`${field.label}: ${display}`);
  }
  return lines.join("\n");
}

export function composeReasoningSummary(topic: TopicRuntime, state: ConsultationState): string {
  const confirmedLabels = Object.entries(state.reasoningChecks.redFlagsConfirmed)
    .filter(([, v]) => v)
    .map(([key]) => {
      const match = key.match(/^rf-(\d+)$/);
      if (!match) return null;
      const index = Number(match[1]);
      return topic.reasoning.redFlags[index] ?? null;
    })
    .filter((label): label is string => Boolean(label));

  if (confirmedLabels.length === 0) return "";
  return `Red flags assessed: ${confirmedLabels.join(", ")}`;
}

export function composeDDx(state: ConsultationState): string {
  if (state.ddx.workingDiagnoses.length === 0) return "";

  const primary = state.ddx.workingDiagnoses.find((d) => d.isPrimary);
  const others = state.ddx.workingDiagnoses.filter((d) => !d.isPrimary);
  const ranked = [
    ...(primary ? [primary] : []),
    ...others,
  ];

  const lines: string[] = ["Working differentials:"];
  ranked.forEach((d, i) => {
    lines.push(`${i + 1}. ${d.name}${d.isPrimary ? " *" : ""}`);
  });

  for (const e of state.ddx.evidenceFor) {
    if (e.items.length) {
      lines.push("");
      lines.push(`Supports ${e.diagnosis}:`);
      e.items.forEach((item) => lines.push(`+ ${item}`));
    }
  }
  for (const e of state.ddx.evidenceAgainst) {
    if (e.items.length) {
      lines.push("");
      lines.push(`Against ${e.diagnosis}:`);
      e.items.forEach((item) => lines.push(`- ${item}`));
    }
  }

  return lines.join("\n");
}

export function composeSection(topic: TopicRuntime, state: ConsultationState, section: OutputSection): string {
  if (section.source === "editor") return state.editorText.trim();
  if (section.source === "structured" && section.structuredSectionId) {
    return composeStructuredSection(topic, state, section.structuredSectionId);
  }
  if (section.source === "reasoning") return composeReasoningSummary(topic, state);
  if (section.source === "ddx") return composeDDx(state);
  return "";
}

export function getComposedSections(topic: TopicRuntime, state: ConsultationState): Array<{
  id: string;
  title: string;
  source: OutputSection["source"];
  content: string;
  included: boolean;
}> {
  return topic.outputTemplate.sections.map((section) => {
    const included = state.sectionInclusions[section.id] ?? section.includeByDefault;
    return {
      id: section.id,
      title: section.title,
      source: section.source,
      content: composeSection(topic, state, section),
      included,
    };
  });
}

export function composeOutput(topic: TopicRuntime, state: ConsultationState): string {
  const sections: string[] = [];

  for (const section of topic.outputTemplate.sections) {
    const included = state.sectionInclusions[section.id] ?? section.includeByDefault;
    if (!included) continue;
    const content = composeSection(topic, state, section);
    if (content) {
      sections.push(`## ${section.title}\n${content}`);
    }
  }

  return sections.join("\n\n");
}

