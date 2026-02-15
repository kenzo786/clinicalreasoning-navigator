import { describe, it, expect } from "vitest";
import {
  appendAnchored,
  getDetachedAnchorIds,
  insertAnchoredAtCursor,
  refreshAnchoredBlock,
} from "@/lib/editorBridge";

describe("editor bridge anchors", () => {
  it("inserts anchored content at cursor", () => {
    const result = insertAnchoredAtCursor("abc", "history", "History text", 3, 3);
    expect(result.nextText).toContain("<!-- CRX:history:start -->");
    expect(result.nextText).toContain("History text");
  });

  it("refreshes anchored content when unchanged by user", () => {
    const inserted = appendAnchored("", "assessment", "old");
    const refreshed = refreshAnchoredBlock(inserted.nextText, inserted.anchor, "new");
    expect(refreshed.updated).toBe(true);
    expect(refreshed.nextText).toContain("new");
  });

  it("marks anchor detached when user edits anchored block", () => {
    const inserted = appendAnchored("", "assessment", "old");
    const edited = inserted.nextText.replace("old", "user edited");
    const detachedIds = getDetachedAnchorIds(edited, { assessment: inserted.anchor });
    expect(detachedIds).toEqual(["assessment"]);
  });
});

