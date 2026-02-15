import { describe, it, expect } from "vitest";
import { consultationReducer } from "@/context/ConsultationProvider";
import { DEFAULT_CONSULTATION_STATE } from "@/types/consultation";

describe("consultation reducer ddx actions", () => {
  it("adds and toggles diagnosis", () => {
    const s1 = consultationReducer(DEFAULT_CONSULTATION_STATE, { type: "DDX_TOGGLE_DIAGNOSIS", name: "UTI" });
    expect(s1.ddx.workingDiagnoses).toHaveLength(1);
    const s2 = consultationReducer(s1, { type: "DDX_TOGGLE_DIAGNOSIS", name: "UTI" });
    expect(s2.ddx.workingDiagnoses).toHaveLength(0);
  });

  it("sets a single primary diagnosis", () => {
    let s = consultationReducer(DEFAULT_CONSULTATION_STATE, { type: "DDX_ADD_CUSTOM", name: "A" });
    s = consultationReducer(s, { type: "DDX_ADD_CUSTOM", name: "B" });
    s = consultationReducer(s, { type: "DDX_SET_PRIMARY", name: "B" });
    expect(s.ddx.workingDiagnoses.find((d) => d.name === "B")?.isPrimary).toBe(true);
    expect(s.ddx.workingDiagnoses.find((d) => d.name === "A")?.isPrimary).toBe(false);
  });

  it("assigns and removes evidence", () => {
    let s = consultationReducer(DEFAULT_CONSULTATION_STATE, { type: "DDX_ADD_CUSTOM", name: "UTI" });
    s = consultationReducer(s, {
      type: "DDX_ASSIGN_EVIDENCE",
      diagnosis: "UTI",
      item: "Dysuria",
      side: "for",
      selected: true,
    });
    expect(s.ddx.evidenceFor[0].items).toContain("Dysuria");
    s = consultationReducer(s, {
      type: "DDX_ASSIGN_EVIDENCE",
      diagnosis: "UTI",
      item: "Dysuria",
      side: "for",
      selected: false,
    });
    expect(s.ddx.evidenceFor).toHaveLength(0);
  });
});

