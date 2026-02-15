import type { TopicRuntime } from "@/types/topic";
import type { ConsultationState } from "@/types/consultation";
import type {
  ComposerDisplayLinkState,
  ComposerLinkState,
  ComposerLinkStateTone,
  ComposerSection,
} from "@/types/composer";
import { composeOutput, getComposedSections } from "@/lib/outputComposer";
import { hashString } from "@/lib/editorBridge";

const LINK_START_RE = /^\[CRx linked:.*?\]\n?/gm;
const LINK_END_RE = /^\[\/CRx linked\]\n?/gm;

function deriveLinkState(
  state: ConsultationState,
  sectionId: string
): ComposerLinkState {
  const anchor = state.editorAnchors[sectionId];
  if (!anchor) return "not_linked";
  if (anchor.detached) return "linked_modified";
  if (!state.editorText.includes(anchor.startTag) || !state.editorText.includes(anchor.endTag)) {
    return "linked_missing";
  }
  return "linked_clean";
}

export function getComposerLinkStatePresentation(
  state: ComposerLinkState
): { label: ComposerDisplayLinkState; tone: ComposerLinkStateTone } {
  switch (state) {
    case "linked_clean":
      return { label: "Linked", tone: "success" };
    case "linked_modified":
      return { label: "Modified after insert", tone: "warning" };
    case "linked_missing":
      return { label: "Link missing", tone: "danger" };
    case "not_linked":
    default:
      return { label: "Not inserted", tone: "neutral" };
  }
}

export function stripComposerMarkers(text: string): string {
  return text
    .replace(LINK_START_RE, "")
    .replace(LINK_END_RE, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildComposerSections(
  topic: TopicRuntime,
  state: ConsultationState
): ComposerSection[] {
  return getComposedSections(topic, state).map((section) => ({
    id: section.id,
    title: section.title,
    source: section.source,
    content: section.content,
    contentHash: hashString(section.content),
    includeByDefault:
      topic.outputTemplate.sections.find((x) => x.id === section.id)?.includeByDefault ?? true,
    included: section.included,
    linkState: deriveLinkState(state, section.id),
  }));
}

export function buildExportText(topic: TopicRuntime, state: ConsultationState): string {
  if (!state.exportDraft.isDerived && state.exportDraft.text.trim().length > 0) {
    return stripComposerMarkers(state.exportDraft.text);
  }
  return stripComposerMarkers(composeOutput(topic, state));
}
