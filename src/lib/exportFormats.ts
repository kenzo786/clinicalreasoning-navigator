import type { ConsultationState } from "@/types/consultation";
import type { TopicRuntime } from "@/types/topic";
import type { ExportFormat } from "@/types/export";
import {
  composeDDx,
  composeReasoningSummary,
  composeStructuredSection,
} from "@/lib/outputComposer";
import { buildExportText } from "@/lib/composer";

function cleanBlock(value: string): string {
  return value.trim();
}

function joinLines(lines: string[]): string {
  return lines.filter((line) => line.trim().length > 0).join("\n");
}

function buildSoap(topic: TopicRuntime, state: ConsultationState): string {
  const subjective = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "history")),
    cleanBlock(state.editorText),
  ]);
  const objective = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "exam")),
    cleanBlock(composeStructuredSection(topic, state, "investigations")),
  ]);
  const assessment = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "assessment")),
    cleanBlock(composeDDx(state)),
    cleanBlock(composeReasoningSummary(topic, state)),
  ]);
  const plan = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "plan")),
    cleanBlock(composeStructuredSection(topic, state, "safety-net")),
  ]);

  return [
    "S: Subjective",
    subjective || "Not documented.",
    "",
    "O: Objective",
    objective || "Not documented.",
    "",
    "A: Assessment",
    assessment || "Not documented.",
    "",
    "P: Plan",
    plan || "Not documented.",
  ].join("\n");
}

function buildSbar(topic: TopicRuntime, state: ConsultationState): string {
  const history = cleanBlock(composeStructuredSection(topic, state, "history"));
  const exam = cleanBlock(composeStructuredSection(topic, state, "exam"));
  const assessment = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "assessment")),
    cleanBlock(composeDDx(state)),
    cleanBlock(composeReasoningSummary(topic, state)),
  ]);
  const recommendation = joinLines([
    cleanBlock(composeStructuredSection(topic, state, "plan")),
    cleanBlock(composeStructuredSection(topic, state, "safety-net")),
  ]);

  return [
    "Situation",
    cleanBlock(state.editorText) || "Not documented.",
    "",
    "Background",
    history || "Not documented.",
    "",
    "Assessment",
    joinLines([assessment, exam]) || "Not documented.",
    "",
    "Recommendation",
    recommendation || "Not documented.",
  ].join("\n");
}

export function buildExportForFormat(
  format: ExportFormat,
  topic: TopicRuntime,
  state: ConsultationState
): string {
  if (format === "soap") return buildSoap(topic, state);
  if (format === "sbar") return buildSbar(topic, state);
  return buildExportText(topic, state);
}

