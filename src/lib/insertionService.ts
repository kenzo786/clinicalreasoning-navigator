import type { ConsultationState, EditorAnchor } from "@/types/consultation";
import {
  appendAnchored,
  insertAnchoredAtCursor,
  refreshAnchoredBlock,
} from "@/lib/editorBridge";

export interface InsertSectionIntent {
  sectionId: string;
  sectionTitle: string;
  source: string;
  content: string;
  mode: "cursor" | "append";
}

export interface InsertSectionResult {
  nextText: string;
  anchor: EditorAnchor;
  nextCursor: number | null;
  updatedExisting: boolean;
}

export function upsertLinkedSection(
  state: ConsultationState,
  intent: InsertSectionIntent,
  selection?: { start: number; end: number }
): InsertSectionResult | null {
  if (!intent.content.trim()) return null;

  const existingAnchor = state.editorAnchors[intent.sectionId];
  if (existingAnchor && !existingAnchor.detached) {
    const refreshed = refreshAnchoredBlock(state.editorText, existingAnchor, intent.content);
    if (refreshed.updated) {
      return {
        nextText: refreshed.nextText,
        anchor: refreshed.anchor,
        nextCursor: null,
        updatedExisting: true,
      };
    }
  }

  const provenance = {
    sectionTitle: intent.sectionTitle,
    source: intent.source,
    timestamp: Date.now(),
  };

  if (intent.mode === "append" || !selection) {
    const appended = appendAnchored(
      state.editorText,
      intent.sectionId,
      intent.content,
      provenance
    );
    return {
      nextText: appended.nextText,
      anchor: appended.anchor,
      nextCursor: null,
      updatedExisting: false,
    };
  }

  const inserted = insertAnchoredAtCursor(
    state.editorText,
    intent.sectionId,
    intent.content,
    selection.start,
    selection.end,
    provenance
  );
  return {
    nextText: inserted.nextText,
    anchor: inserted.anchor,
    nextCursor: inserted.nextCursor,
    updatedExisting: false,
  };
}
