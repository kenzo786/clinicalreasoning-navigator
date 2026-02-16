import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { StructuredTab } from "@/components/structured/StructuredTab";
import type { TopicRuntime } from "@/types/topic";

const dispatch = vi.fn();

vi.mock("@/context/ConsultationProvider", () => ({
  useConsultation: () => ({
    state: {
      structuredResponses: {},
      uiPrefs: {
        compactStructured: false,
      },
    },
    dispatch,
  }),
}));

const topic: TopicRuntime = {
  version: "runtime",
  metadata: {
    id: "fixture",
    slug: "fixture",
    displayName: "Fixture",
    specialty: "GP",
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
      id: "assessment",
      title: "Assessment",
      fields: [
        { id: "score", label: "Centor Score", type: "select", options: ["0", "1", "2", "3", "4"] },
        { id: "exam-status", label: "Exam status", type: "select", options: ["normal", "abnormal"] },
        { id: "binary", label: "Binary", type: "select", options: ["yes", "no"] },
      ],
    },
  ],
  outputTemplate: { sections: [] },
  review: {
    illnessScript: { summary: "" },
    mustNotMiss: [],
    discriminators: [],
    historyPrompts: [],
    examSections: [],
    diagnoses: { common: [], mustNotMiss: [], oftenMissed: [] },
    investigations: { whenHelpful: [], whenNotNeeded: [], limitations: [] },
    managementConsiderations: {
      selfCare: [],
      pharmacologicalConcepts: [],
      delayedStrategies: [],
      followUpLogic: [],
    },
    safetyNetting: { returnAdvice: [], escalationTriggers: [] },
  },
  jitl: { termMap: [], linkProviders: [] },
  ddx: { evidencePrompts: [], compareEnabled: true },
  qa: {
    status: "approved",
    clinicalReviewer: "QA",
    reviewedAt: "2026-02-16",
    version: "1.0.0",
  },
};

describe("StructuredTab neutral defaults", () => {
  beforeEach(() => {
    dispatch.mockClear();
  });

  it("applies only neutral defaults and does not prefill score fields", async () => {
    render(<StructuredTab topic={topic} />);

    await waitFor(() =>
      expect(dispatch).toHaveBeenCalledWith({
        type: "SET_STRUCTURED_SECTION_DEFAULTS",
        values: {
          "exam-status": "normal",
        },
      })
    );
  });
});

