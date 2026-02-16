import type { EditorAnchor } from "@/types/consultation";

export function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function findAllIndexes(text: string, needle: string): number[] {
  if (!needle) return [];
  const indexes: number[] = [];
  let from = 0;
  while (from < text.length) {
    const idx = text.indexOf(needle, from);
    if (idx === -1) break;
    indexes.push(idx);
    from = idx + needle.length;
  }
  return indexes;
}

function normalizeLinkedText(sectionContent: string): string {
  return sectionContent.endsWith("\n") ? sectionContent : `${sectionContent}\n`;
}

export interface AnchorMatch {
  start: number;
  end: number;
  body: string;
}

export function findAnchorMatch(text: string, anchor: Pick<EditorAnchor, "linkedText" | "lastKnownIndex">): AnchorMatch | null {
  const linkedText = anchor.linkedText;
  if (!linkedText) return null;

  if (
    anchor.lastKnownIndex >= 0 &&
    text.slice(anchor.lastKnownIndex, anchor.lastKnownIndex + linkedText.length) === linkedText
  ) {
    const start = anchor.lastKnownIndex;
    return { start, end: start + linkedText.length, body: linkedText };
  }

  const matches = findAllIndexes(text, linkedText);
  if (matches.length === 0) return null;

  const preferred = matches.reduce((best, current) => {
    if (best === null) return current;
    const bestDistance = Math.abs(best - anchor.lastKnownIndex);
    const currentDistance = Math.abs(current - anchor.lastKnownIndex);
    return currentDistance < bestDistance ? current : best;
  }, matches[0] ?? 0);

  return {
    start: preferred,
    end: preferred + linkedText.length,
    body: linkedText,
  };
}

export function getDetachedAnchorIds(
  text: string,
  anchors: Record<string, EditorAnchor>
): string[] {
  const detached: string[] = [];
  for (const [sectionId, anchor] of Object.entries(anchors)) {
    if (anchor.detached) continue;
    const match = findAnchorMatch(text, anchor);
    if (!match) {
      detached.push(sectionId);
      continue;
    }
    if (hashString(match.body) !== anchor.lastHash) {
      detached.push(sectionId);
    }
  }
  return detached;
}

export function insertTextAtCursor(
  text: string,
  insert: string,
  selectionStart: number,
  selectionEnd: number
): { nextText: string; nextCursor: number; insertedAt: number } {
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);
  const nextText = `${before}${insert}${after}`;
  return {
    nextText,
    nextCursor: before.length + insert.length,
    insertedAt: before.length,
  };
}

export function insertAnchoredAtCursor(
  text: string,
  sectionId: string,
  sectionContent: string,
  selectionStart: number,
  selectionEnd: number,
  provenance?: { sectionTitle?: string; source?: string; timestamp?: number }
): { nextText: string; nextCursor: number; anchor: EditorAnchor } {
  const linkedText = normalizeLinkedText(sectionContent);
  const inserted = insertTextAtCursor(text, linkedText, selectionStart, selectionEnd);
  return {
    nextText: inserted.nextText,
    nextCursor: inserted.nextCursor,
    anchor: {
      sectionId,
      detached: false,
      lastHash: hashString(linkedText),
      linkedText,
      lastKnownIndex: inserted.insertedAt,
      sectionTitle: provenance?.sectionTitle,
      source: provenance?.source,
      linkedAt: provenance?.timestamp ?? Date.now(),
    },
  };
}

export function appendAnchored(
  text: string,
  sectionId: string,
  sectionContent: string,
  provenance?: { sectionTitle?: string; source?: string; timestamp?: number }
): { nextText: string; anchor: EditorAnchor } {
  const linkedText = normalizeLinkedText(sectionContent);
  const spacer = text.trim().length > 0 ? "\n\n" : "";
  const insertion = `${spacer}${linkedText}`;
  const start = text.length + spacer.length;
  const nextText = `${text}${insertion}`;
  return {
    nextText,
    anchor: {
      sectionId,
      detached: false,
      lastHash: hashString(linkedText),
      linkedText,
      lastKnownIndex: start,
      sectionTitle: provenance?.sectionTitle,
      source: provenance?.source,
      linkedAt: provenance?.timestamp ?? Date.now(),
    },
  };
}

export function refreshAnchoredBlock(
  text: string,
  anchor: EditorAnchor,
  newContent: string
): { nextText: string; anchor: EditorAnchor; updated: boolean; status: "updated" | "unchanged" | "missing" | "detached" } {
  const linkedContent = normalizeLinkedText(newContent);
  if (anchor.detached) {
    return { nextText: text, anchor, updated: false, status: "detached" };
  }

  const match = findAnchorMatch(text, anchor);
  if (!match) {
    return {
      nextText: text,
      anchor: { ...anchor, detached: true },
      updated: false,
      status: "missing",
    };
  }

  if (hashString(match.body) !== anchor.lastHash) {
    return {
      nextText: text,
      anchor: { ...anchor, detached: true },
      updated: false,
      status: "detached",
    };
  }

  if (match.body === linkedContent) {
    return {
      nextText: text,
      anchor: {
        ...anchor,
        linkedText: linkedContent,
        lastHash: hashString(linkedContent),
        lastKnownIndex: match.start,
      },
      updated: true,
      status: "unchanged",
    };
  }

  const nextText = `${text.slice(0, match.start)}${linkedContent}${text.slice(match.end)}`;
  return {
    nextText,
    anchor: {
      ...anchor,
      linkedText: linkedContent,
      lastHash: hashString(linkedContent),
      lastKnownIndex: match.start,
    },
    updated: true,
    status: "updated",
  };
}

export function removeAnchoredBlock(text: string, anchor: EditorAnchor): string {
  const match = findAnchorMatch(text, anchor);
  if (!match) return text;
  return `${text.slice(0, match.start)}${text.slice(match.end)}`.replace(/\n{3,}/g, "\n\n");
}
