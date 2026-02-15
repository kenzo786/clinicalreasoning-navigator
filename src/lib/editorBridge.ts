import type { EditorAnchor } from "@/types/consultation";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function sanitizeForTag(value: string): string {
  return value.replace(/[|[\]]/g, " ").trim();
}

function makeTags(
  sectionId: string,
  provenance?: { sectionTitle?: string; source?: string; timestamp?: number }
): { startTag: string; endTag: string } {
  const title = sanitizeForTag(provenance?.sectionTitle ?? sectionId);
  const source = sanitizeForTag(provenance?.source ?? "composed");
  const stamp = new Date(provenance?.timestamp ?? Date.now()).toISOString();
  return {
    startTag: `[CRx linked: ${title} | ${source} | ${stamp}]`,
    endTag: "[/CRx linked]",
  };
}

function findAnchor(text: string, anchor: Pick<EditorAnchor, "startTag" | "endTag">) {
  const start = text.indexOf(anchor.startTag);
  if (start === -1) return null;
  const end = text.indexOf(anchor.endTag, start + anchor.startTag.length);
  if (end === -1) return null;
  const bodyStart = start + anchor.startTag.length;
  const body = text.slice(bodyStart, end).replace(/^\n/, "").replace(/\n$/, "");
  return { start, end: end + anchor.endTag.length, body };
}

export function getDetachedAnchorIds(
  text: string,
  anchors: Record<string, EditorAnchor>
): string[] {
  const detached: string[] = [];
  for (const [sectionId, anchor] of Object.entries(anchors)) {
    if (anchor.detached) continue;
    const match = findAnchor(text, anchor);
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
): { nextText: string; nextCursor: number } {
  const before = text.slice(0, selectionStart);
  const after = text.slice(selectionEnd);
  const nextText = `${before}${insert}${after}`;
  return { nextText, nextCursor: before.length + insert.length };
}

export function insertAnchoredAtCursor(
  text: string,
  sectionId: string,
  sectionContent: string,
  selectionStart: number,
  selectionEnd: number,
  provenance?: { sectionTitle?: string; source?: string; timestamp?: number }
): { nextText: string; nextCursor: number; anchor: EditorAnchor } {
  const { startTag, endTag } = makeTags(sectionId, provenance);
  const block = `${startTag}\n${sectionContent}\n${endTag}\n`;
  const { nextText, nextCursor } = insertTextAtCursor(text, block, selectionStart, selectionEnd);
  return {
    nextText,
    nextCursor,
    anchor: {
      sectionId,
      startTag,
      endTag,
      detached: false,
      lastHash: hashString(sectionContent),
    },
  };
}

export function appendAnchored(
  text: string,
  sectionId: string,
  sectionContent: string,
  provenance?: { sectionTitle?: string; source?: string; timestamp?: number }
): { nextText: string; anchor: EditorAnchor } {
  const spacer = text.trim().length > 0 ? "\n\n" : "";
  const { startTag, endTag } = makeTags(sectionId, provenance);
  const block = `${spacer}${startTag}\n${sectionContent}\n${endTag}`;
  const nextText = `${text}${block}`;
  return {
    nextText,
    anchor: {
      sectionId,
      startTag,
      endTag,
      detached: false,
      lastHash: hashString(sectionContent),
    },
  };
}

export function refreshAnchoredBlock(
  text: string,
  anchor: EditorAnchor,
  newContent: string
): { nextText: string; anchor: EditorAnchor; updated: boolean } {
  if (anchor.detached) {
    return { nextText: text, anchor, updated: false };
  }
  const match = findAnchor(text, anchor);
  if (!match) {
    return {
      nextText: text,
      anchor: { ...anchor, detached: true },
      updated: false,
    };
  }
  if (hashString(match.body) !== anchor.lastHash) {
    return {
      nextText: text,
      anchor: { ...anchor, detached: true },
      updated: false,
    };
  }
  const replacement = `${anchor.startTag}\n${newContent}\n${anchor.endTag}`;
  const nextText = `${text.slice(0, match.start)}${replacement}${text.slice(match.end)}`;
  return {
    nextText,
    anchor: { ...anchor, lastHash: hashString(newContent) },
    updated: true,
  };
}

export function removeAnchoredBlock(text: string, anchor: EditorAnchor): string {
  const pattern = new RegExp(
    `${escapeRegExp(anchor.startTag)}[\\s\\S]*?${escapeRegExp(anchor.endTag)}\\n?`,
    "g"
  );
  return text.replace(pattern, "").replace(/\n{3,}/g, "\n\n");
}
