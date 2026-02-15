import { describe, it, expect } from "vitest";
import { evaluateShowIf } from "@/lib/showIf";

describe("showIf evaluator", () => {
  it("evaluates == condition", () => {
    expect(evaluateShowIf("fever == yes", { fever: "yes" })).toBe(true);
    expect(evaluateShowIf("fever == yes", { fever: "no" })).toBe(false);
  });

  it("evaluates != condition", () => {
    expect(evaluateShowIf("antibiotics != none", { antibiotics: "penicillin" })).toBe(true);
    expect(evaluateShowIf("antibiotics != none", { antibiotics: "none" })).toBe(false);
  });

  it("evaluates contains condition", () => {
    expect(evaluateShowIf("symptoms contains dysuria", { symptoms: ["dysuria", "frequency"] })).toBe(true);
    expect(evaluateShowIf("symptoms contains fever", { symptoms: ["dysuria"] })).toBe(false);
  });

  it("evaluates && condition", () => {
    expect(evaluateShowIf("fever == yes && cough == yes", { fever: "yes", cough: "yes" })).toBe(true);
    expect(evaluateShowIf("fever == yes && cough == yes", { fever: "yes", cough: "no" })).toBe(false);
  });

  it("evaluates || condition", () => {
    expect(evaluateShowIf("fever == yes || cough == yes", { fever: "no", cough: "yes" })).toBe(true);
    expect(evaluateShowIf("fever == yes || cough == yes", { fever: "no", cough: "no" })).toBe(false);
  });

  it("returns true for empty expression", () => {
    expect(evaluateShowIf("", {})).toBe(true);
  });
});
