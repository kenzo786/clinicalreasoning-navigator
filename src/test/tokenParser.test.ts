import { describe, it, expect } from "vitest";
import { parseTokens, applyResolutions } from "@/lib/tokenParser";

describe("tokenParser", () => {
  it("resolves date tokens", () => {
    const { textWithDatesResolved } = parseTokens("Review @date(+7d) if needed");
    expect(textWithDatesResolved).not.toContain("@date");
    expect(textWithDatesResolved).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("extracts choice tokens", () => {
    const { unresolvedTokens } = parseTokens("Pain: {mild|moderate*|severe}");
    expect(unresolvedTokens).toHaveLength(1);
    expect(unresolvedTokens[0].type).toBe("choice");
    if (unresolvedTokens[0].type === "choice") {
      expect(unresolvedTokens[0].options).toEqual(["mild", "moderate", "severe"]);
      expect(unresolvedTokens[0].defaultIndex).toBe(1);
    }
  });

  it("extracts variable tokens", () => {
    const { unresolvedTokens } = parseTokens("Duration: [Duration] days");
    expect(unresolvedTokens).toHaveLength(1);
    expect(unresolvedTokens[0].type).toBe("variable");
    if (unresolvedTokens[0].type === "variable") {
      expect(unresolvedTokens[0].name).toBe("Duration");
    }
  });

  it("applies resolutions correctly", () => {
    const result = applyResolutions(
      "Pain: {mild|moderate*|severe}, Duration: [Duration]",
      new Map([
        ["{mild|moderate*|severe}", "severe"],
        ["[Duration]", "3 days"],
      ])
    );
    expect(result).toBe("Pain: severe, Duration: 3 days");
  });

  it("handles content with no tokens", () => {
    const { textWithDatesResolved, unresolvedTokens } = parseTokens("Simple text with no tokens.");
    expect(textWithDatesResolved).toBe("Simple text with no tokens.");
    expect(unresolvedTokens).toHaveLength(0);
  });
});
