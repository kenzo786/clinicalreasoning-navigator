import { describe, it, expect } from "vitest";
import { normalizeTopic } from "@/lib/topicSchema";
import type { TopicV1, TopicV2 } from "@/types/topic";

describe("topic schema normalization", () => {
  it("normalizes v1 topic to runtime with review/jitl/ddx defaults", () => {
    const v1: TopicV1 = {
      version: "1.0",
      metadata: { id: "x", slug: "x", displayName: "X", specialty: "GP", triggers: [] },
      snippets: [],
      reasoning: { discriminators: ["Q1"], mustNotMiss: ["Danger"], redFlags: ["RF"], references: [] },
      structuredFields: [],
      outputTemplate: { sections: [] },
    };
    const runtime = normalizeTopic(v1);
    expect(runtime.version).toBe("runtime");
    expect(runtime.review.illnessScript.summary.length).toBeGreaterThan(0);
    expect(runtime.jitl.linkProviders.length).toBeGreaterThan(0);
    expect(runtime.ddx.compareEnabled).toBe(true);
  });

  it("normalizes v2 topic and preserves provided review/jitl/ddx", () => {
    const v2: TopicV2 = {
      version: "2.0",
      metadata: { id: "x", slug: "x", displayName: "X", specialty: "GP", triggers: [] },
      snippets: [],
      reasoning: { discriminators: [], mustNotMiss: [], redFlags: [], references: [] },
      structuredFields: [],
      outputTemplate: { sections: [] },
      review: {
        illnessScript: { summary: "Hello" },
        mustNotMiss: [],
        discriminators: [],
        historyPrompts: [],
        examSections: [],
        diagnoses: { common: [], mustNotMiss: [], oftenMissed: [] },
        investigations: { whenHelpful: [], whenNotNeeded: [], limitations: [] },
        managementConsiderations: { selfCare: [], pharmacologicalConcepts: [], delayedStrategies: [], followUpLogic: [] },
        safetyNetting: { returnAdvice: [], escalationTriggers: [] },
      },
      jitl: { termMap: [{ term: "X", style: "chip" }] },
      ddx: { evidencePrompts: ["feature 1"], compareEnabled: false },
    };
    const runtime = normalizeTopic(v2);
    expect(runtime.review.illnessScript.summary).toBe("Hello");
    expect(runtime.jitl.termMap[0].term).toBe("X");
    expect(runtime.ddx.compareEnabled).toBe(false);
  });
});

