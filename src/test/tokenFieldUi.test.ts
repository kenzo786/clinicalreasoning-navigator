import { describe, expect, it } from "vitest";
import { parseTokens } from "@/lib/tokenParser";
import { buildTokenFieldModels } from "@/lib/tokenFieldUi";

describe("tokenFieldUi", () => {
  it("builds descriptive duration labels for numeric choices", () => {
    const content = "Return if not improving after {5|7+|10} days.";
    const parsed = parseTokens(content);
    const fields = buildTokenFieldModels(parsed.textWithDatesResolved, parsed.unresolvedTokens);
    const durationField = fields[0];
    if (!durationField || durationField.control === "text") {
      throw new Error("Expected a choice field");
    }
    expect(durationField.label).toBe("Duration (for documentation)");
    expect(durationField.options.map((option) => option.label)).toEqual([
      "5 days",
      "7+ days",
      "10 days",
    ]);
  });

  it("uses nearby context as a plain-language label", () => {
    const content = "Onset: {sudden|gradual*}.";
    const parsed = parseTokens(content);
    const fields = buildTokenFieldModels(parsed.textWithDatesResolved, parsed.unresolvedTokens);
    const onsetField = fields[0];
    if (!onsetField || onsetField.control === "text") {
      throw new Error("Expected a choice field");
    }
    expect(onsetField.label).toBe("Onset");
    expect(onsetField.defaultValue).toBe("gradual");
  });

  it("assigns text placeholders for free-text variables", () => {
    const content = "Aggravating: [Factors].";
    const parsed = parseTokens(content);
    const fields = buildTokenFieldModels(parsed.textWithDatesResolved, parsed.unresolvedTokens);
    const variableField = fields[0];
    if (!variableField || variableField.control !== "text") {
      throw new Error("Expected a variable text field");
    }
    expect(variableField.label).toBe("Aggravating");
    expect(variableField.placeholder).toBe("e.g., Lifting heavy boxes");
  });

  it("supports checkbox rendering for red-flag lists", () => {
    const content = "Red flags present: {History of cancer|IV drug use|Immunosuppression}.";
    const parsed = parseTokens(content);
    const fields = buildTokenFieldModels(parsed.textWithDatesResolved, parsed.unresolvedTokens);
    const redFlagField = fields[0];
    if (!redFlagField || redFlagField.control === "text") {
      throw new Error("Expected a choice field");
    }
    expect(redFlagField.control).toBe("checkboxes");
  });

  it("selects neutral normal-style defaults for quick normal insertion", () => {
    const content = "Range of movement: flexion {full|reduced*}.";
    const parsed = parseTokens(content);
    const fields = buildTokenFieldModels(parsed.textWithDatesResolved, parsed.unresolvedTokens);
    const movementField = fields[0];
    if (!movementField || movementField.control === "text") {
      throw new Error("Expected a choice field");
    }
    expect(movementField.normalValue).toBe("full");
  });
});

