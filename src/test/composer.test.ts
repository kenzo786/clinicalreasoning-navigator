import { describe, it, expect } from "vitest";
import {
  getComposerLinkStatePresentation,
  stripComposerMarkers,
} from "@/lib/composer";

describe("composer", () => {
  it("strips linked markers from export text", () => {
    const raw = [
      "[CRx linked: Assessment | ddx | 2026-01-01T00:00:00.000Z]",
      "Assessment",
      "Content",
      "[/CRx linked]",
    ].join("\n");
    const cleaned = stripComposerMarkers(raw);
    expect(cleaned).toContain("Assessment");
    expect(cleaned).toContain("Content");
    expect(cleaned).not.toContain("[CRx linked:");
    expect(cleaned).not.toContain("[/CRx linked]");
  });

  it("maps internal link states to user-facing labels", () => {
    expect(getComposerLinkStatePresentation("not_linked")).toEqual({
      label: "Not inserted",
      tone: "neutral",
    });
    expect(getComposerLinkStatePresentation("linked_clean")).toEqual({
      label: "Linked",
      tone: "success",
    });
    expect(getComposerLinkStatePresentation("linked_modified")).toEqual({
      label: "Modified after insert",
      tone: "warning",
    });
    expect(getComposerLinkStatePresentation("linked_missing")).toEqual({
      label: "Link missing",
      tone: "danger",
    });
  });
});
