import { describe, it, expect } from "vitest";
import { stripComposerMarkers } from "@/lib/composer";

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
});
