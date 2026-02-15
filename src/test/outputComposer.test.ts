import { describe, it, expect } from "vitest";
import { composeOutput } from "@/lib/outputComposer";
import type { TopicV1 } from "@/types/topic";
import type { ConsultationState } from "@/types/consultation";
import { DEFAULT_CONSULTATION_STATE } from "@/types/consultation";

const mockTopic: TopicV1 = {
  version: "1.0",
  metadata: { id: "test", slug: "test", displayName: "Test", specialty: "GP", triggers: [] },
  snippets: [],
  reasoning: { discriminators: [], mustNotMiss: [], redFlags: ["Red flag 1"], references: [] },
  structuredFields: [
    {
      id: "history",
      title: "History",
      fields: [{ id: "duration", label: "Duration", type: "text" }],
    },
  ],
  outputTemplate: {
    sections: [
      { id: "editor", title: "Notes", source: "editor", includeByDefault: true },
      { id: "history", title: "History", source: "structured", structuredSectionId: "history", includeByDefault: true },
      { id: "reasoning", title: "Reasoning", source: "reasoning", includeByDefault: false },
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

  it("omits empty sections", () => {
    const output = composeOutput(mockTopic, DEFAULT_CONSULTATION_STATE);
    expect(output).toBe("");
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
  });
});
