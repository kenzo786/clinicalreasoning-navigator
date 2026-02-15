import { describe, it, expect } from "vitest";
import { composeOutput, composeDDx } from "@/lib/outputComposer";
import type { TopicRuntime } from "@/types/topic";
import type { ConsultationState } from "@/types/consultation";
import { DEFAULT_CONSULTATION_STATE } from "@/types/consultation";

const mockTopic: TopicRuntime = {
  version: "runtime",
  metadata: { id: "test", slug: "test", displayName: "Test", specialty: "GP", triggers: [] },
  snippets: [],
  reasoning: { discriminators: [], mustNotMiss: [], redFlags: ["Red flag 1"], references: [] },
  review: {
    illnessScript: { summary: "Summary" },
    mustNotMiss: [],
    discriminators: [],
    historyPrompts: [],
    examSections: [],
    diagnoses: { common: [], mustNotMiss: [], oftenMissed: [] },
    investigations: { whenHelpful: [], whenNotNeeded: [], limitations: [] },
    managementConsiderations: { selfCare: [], pharmacologicalConcepts: [], delayedStrategies: [], followUpLogic: [] },
    safetyNetting: { returnAdvice: [], escalationTriggers: [] },
  },
  jitl: { termMap: [], linkProviders: [] },
  ddx: { evidencePrompts: [], compareEnabled: true },
  structuredFields: [
    {
      id: "history",
      title: "History",
      fields: [
        { id: "duration", label: "Duration", type: "text" },
        { id: "abx-detail", label: "ABX detail", type: "text", showIf: "abx == yes" },
      ],
    },
  ],
  outputTemplate: {
    sections: [
      { id: "editor", title: "Notes", source: "editor", includeByDefault: true },
      { id: "history", title: "History", source: "structured", structuredSectionId: "history", includeByDefault: true },
      { id: "reasoning", title: "Reasoning", source: "reasoning", includeByDefault: false },
      { id: "ddx", title: "Working Differential", source: "ddx", includeByDefault: true },
    ],
  },
};

describe("outputComposer", () => {
  it("includes editor text", () => {
    const state: ConsultationState = { ...DEFAULT_CONSULTATION_STATE, editorText: "Patient presents with sore throat." };
    const output = composeOutput(mockTopic, state);
    expect(output).toContain("Patient presents with sore throat.");
  });

  it("includes structured data", () => {
    const state: ConsultationState = { ...DEFAULT_CONSULTATION_STATE, structuredResponses: { duration: "3 days" } };
    const output = composeOutput(mockTopic, state);
    expect(output).toContain("Duration: 3 days");
  });

  it("omits structured fields when showIf is not satisfied", () => {
    const state: ConsultationState = {
      ...DEFAULT_CONSULTATION_STATE,
      structuredResponses: { duration: "3 days", "abx-detail": "Penicillin", abx: "no" },
    };
    const output = composeOutput(mockTopic, state);
    expect(output).toContain("Duration: 3 days");
    expect(output).not.toContain("ABX detail");
  });

  it("includes ddx section when diagnoses exist", () => {
    const state: ConsultationState = {
      ...DEFAULT_CONSULTATION_STATE,
      ddx: {
        ...DEFAULT_CONSULTATION_STATE.ddx,
        workingDiagnoses: [
          { name: "Viral pharyngitis", isPrimary: true },
          { name: "Peritonsillar abscess", isPrimary: false },
        ],
      },
    };
    const output = composeOutput(mockTopic, state);
    expect(output).toContain("Working differentials");
    expect(output).toContain("Viral pharyngitis");
  });

  it("respects section exclusions", () => {
    const state: ConsultationState = {
      ...DEFAULT_CONSULTATION_STATE,
      editorText: "Some notes",
      sectionInclusions: { editor: false },
    };
    const output = composeOutput(mockTopic, state);
    expect(output).not.toContain("Some notes");
  });

  it("includes reasoning when toggled on", () => {
    const state: ConsultationState = {
      ...DEFAULT_CONSULTATION_STATE,
      sectionInclusions: { reasoning: true },
      reasoningChecks: { redFlagsConfirmed: { "rf-0": true } },
    };
    const output = composeOutput(mockTopic, state);
    expect(output).toContain("Red flags assessed");
    expect(output).toContain("Red flag 1");
  });

  it("composes ddx evidence for and against", () => {
    const state: ConsultationState = {
      ...DEFAULT_CONSULTATION_STATE,
      ddx: {
        ...DEFAULT_CONSULTATION_STATE.ddx,
        workingDiagnoses: [{ name: "UTI", isPrimary: true }],
        evidenceFor: [{ diagnosis: "UTI", items: ["Dysuria"] }],
        evidenceAgainst: [{ diagnosis: "UTI", items: ["No fever"] }],
      },
    };
    const text = composeDDx(state);
    expect(text).toContain("Supports UTI");
    expect(text).toContain("Against UTI");
  });
});

