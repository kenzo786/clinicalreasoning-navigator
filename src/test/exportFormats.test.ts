import { describe, it, expect } from "vitest";
import { buildExportForFormat } from "@/lib/exportFormats";
import { normalizeTopic } from "@/lib/topicSchema";
import type { TopicSource } from "@/types/topic";
import { DEFAULT_CONSULTATION_STATE } from "@/types/consultation";

const topicFixture = {
  version: "2.1",
  metadata: {
    id: "fixture",
    slug: "fixture",
    displayName: "Fixture Topic",
    specialty: "General Practice",
    triggers: [],
  },
  snippets: [],
  reasoning: {
    discriminators: [],
    mustNotMiss: [],
    redFlags: [],
    references: [],
  },
  structuredFields: [
    {
      id: "history",
      title: "History",
      fields: [
        { id: "hx", label: "History detail", type: "text" },
      ],
    },
    {
      id: "exam",
      title: "Exam",
      fields: [
        { id: "ex", label: "Exam detail", type: "text" },
      ],
    },
    {
      id: "assessment",
      title: "Assessment",
      fields: [
        { id: "ax", label: "Assessment detail", type: "text" },
      ],
    },
    {
      id: "plan",
      title: "Plan",
      fields: [
        { id: "px", label: "Plan detail", type: "text" },
      ],
    },
    {
      id: "safety-net",
      title: "Safety Net",
      fields: [
        { id: "sx", label: "Safety detail", type: "text" },
      ],
    },
  ],
  outputTemplate: {
    sections: [
      { id: "editor", title: "Clinical Notes", source: "editor", includeByDefault: true },
      { id: "history", title: "History", source: "structured", structuredSectionId: "history", includeByDefault: true },
      { id: "exam", title: "Exam", source: "structured", structuredSectionId: "exam", includeByDefault: true },
      { id: "assessment", title: "Assessment", source: "structured", structuredSectionId: "assessment", includeByDefault: true },
      { id: "plan", title: "Plan", source: "structured", structuredSectionId: "plan", includeByDefault: true },
      { id: "safety-net", title: "Safety Net", source: "structured", structuredSectionId: "safety-net", includeByDefault: true },
      { id: "reasoning", title: "Reasoning", source: "reasoning", includeByDefault: true },
    ],
  },
  review: {
    illnessScript: { summary: "summary" },
    mustNotMiss: [],
    discriminators: [],
    historyPrompts: [
      {
        category: "History",
        prompts: [{ id: "p1", label: "Prompt 1", mode: "text" }],
      },
    ],
    examSections: [
      {
        id: "exam",
        title: "Exam",
        prompts: [{ id: "e1", label: "Exam prompt", significance: "significance" }],
      },
    ],
    diagnoses: { common: [], mustNotMiss: [], oftenMissed: [] },
    investigations: {
      whenHelpful: [{ test: "Urinalysis", rationale: "Helps stratify risk" }],
      whenNotNeeded: [],
      limitations: [],
    },
    managementConsiderations: {
      selfCare: ["Hydration"],
      pharmacologicalConcepts: [],
      delayedStrategies: [],
      followUpLogic: ["Review in 48 hours"],
    },
    safetyNetting: {
      returnAdvice: ["Return if worse"],
      escalationTriggers: ["Escalating pain"],
    },
    mindset: "mindset",
  },
  jitl: {
    termMap: [],
    linkProviders: [{ row: 1, label: "Google", hrefTemplate: "https://google.com?q=SEARCH_TERM" }],
  },
  ddx: {
    evidencePrompts: [],
    compareEnabled: true,
  },
  qa: {
    status: "approved",
    clinicalReviewer: "reviewer",
    reviewedAt: "2026-02-15",
    version: "1.0.0",
  },
} satisfies TopicSource;

describe("export formats", () => {
  it("builds SOAP and SBAR exports", () => {
    const topic = normalizeTopic(topicFixture);
    const state = {
      ...DEFAULT_CONSULTATION_STATE,
      editorText: "Patient presents with symptoms.",
      structuredResponses: {
        hx: "2 day history",
        ex: "afebrile",
        ax: "viral syndrome",
        px: "supportive care",
        sx: "return if worsening",
      },
    };
    const soap = buildExportForFormat("soap", topic, state);
    const sbar = buildExportForFormat("sbar", topic, state);

    expect(soap).toContain("S: Subjective");
    expect(soap).toContain("P: Plan");
    expect(sbar).toContain("Situation");
    expect(sbar).toContain("Recommendation");
  });
});
