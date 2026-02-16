import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsultationProvider } from "@/context/ConsultationProvider";
import AppShell from "@/components/layout/AppShell";
import type { TopicRuntime } from "@/types/topic";
import { DEFAULT_USER_PREFS_STATE } from "@/types/consultation";

const topicFixture: TopicRuntime = {
  version: "runtime",
  metadata: {
    id: "sore-throat",
    slug: "sore-throat",
    displayName: "Sore Throat",
    specialty: "General Practice",
    triggers: [],
  },
  snippets: [
    {
      id: "s1",
      trigger: "hx",
      label: "History snippet",
      category: "History",
      content: "Sample snippet",
      tags: [],
    },
  ],
  reasoning: {
    discriminators: ["Duration"],
    mustNotMiss: ["Quinsy"],
    redFlags: ["Stridor"],
    references: [],
  },
  structuredFields: [
    { id: "history", title: "History", fields: [{ id: "duration", label: "Duration", type: "text" }] },
    { id: "exam", title: "Exam", fields: [{ id: "tonsils", label: "Tonsils", type: "text" }] },
    { id: "assessment", title: "Assessment", fields: [{ id: "impression", label: "Impression", type: "text" }] },
    { id: "plan", title: "Plan", fields: [{ id: "plan", label: "Plan", type: "text" }] },
    { id: "safety-net", title: "Safety Net", fields: [{ id: "safety", label: "Safety", type: "text" }] },
  ],
  outputTemplate: {
    sections: [
      { id: "editor", title: "Clinical Notes", source: "editor", includeByDefault: true },
      { id: "history", title: "History", source: "structured", structuredSectionId: "history", includeByDefault: true },
      { id: "exam", title: "Exam", source: "structured", structuredSectionId: "exam", includeByDefault: true },
      { id: "assessment", title: "Assessment", source: "structured", structuredSectionId: "assessment", includeByDefault: true },
      { id: "plan", title: "Plan", source: "structured", structuredSectionId: "plan", includeByDefault: true },
      { id: "safety-net", title: "Safety Net", source: "structured", structuredSectionId: "safety-net", includeByDefault: true },
      { id: "reasoning", title: "Clinical Reasoning", source: "reasoning", includeByDefault: false },
      { id: "ddx-assessment", title: "Working Differential", source: "ddx", includeByDefault: true },
    ],
  },
  review: {
    illnessScript: { summary: "Summary" },
    mustNotMiss: [{ condition: "Quinsy", redFlags: ["Stridor"], whyDangerous: "Danger", escalationConcern: "Escalate" }],
    discriminators: [{ question: "Duration", reasoning: "Reasoning", clinicalValue: "Value" }],
    historyPrompts: [{ category: "Core History", prompts: [{ id: "hx-1", label: "Duration", mode: "text" }] }],
    examSections: [{ id: "exam", title: "Exam", prompts: [{ id: "ex-1", label: "Tonsils", significance: "Significance" }] }],
    diagnoses: {
      common: [{ name: "Viral pharyngitis" }],
      mustNotMiss: [{ name: "Peritonsillar abscess" }],
      oftenMissed: [{ name: "Atypical strep throat" }],
    },
    investigations: {
      whenHelpful: [{ test: "CRP", rationale: "If uncertainty remains" }],
      whenNotNeeded: [],
      limitations: [],
    },
    managementConsiderations: {
      selfCare: ["Fluids"],
      pharmacologicalConcepts: [],
      delayedStrategies: [],
      followUpLogic: ["Review if worse"],
    },
    safetyNetting: { returnAdvice: ["Return if worse"], escalationTriggers: ["Stridor"] },
  },
  jitl: {
    termMap: [],
    linkProviders: [{ row: 1, label: "Google", hrefTemplate: "https://google.com?q=SEARCH_TERM" }],
  },
  ddx: { evidencePrompts: ["Duration"], compareEnabled: true },
  qa: {
    status: "approved",
    clinicalReviewer: "QA",
    reviewedAt: "2026-02-15",
    version: "1.0.0",
  },
};

vi.mock("@/hooks/useTopicLoader", () => ({
  useTopicLoader: () => ({
    topic: topicFixture,
    loading: false,
    error: null,
    availableTopics: [{ id: "sore-throat", displayName: "Sore Throat" }],
    reload: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

function renderShell() {
  return render(
    <TooltipProvider>
      <ConsultationProvider>
        <AppShell />
      </ConsultationProvider>
    </TooltipProvider>
  );
}

describe("AppShell integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows quick start on first load and can dismiss it", () => {
    renderShell();
    expect(screen.getByText("Quick Start: 10-minute consultation flow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss quick start" }));
    expect(screen.queryByText("Quick Start: 10-minute consultation flow")).not.toBeInTheDocument();
  });

  it("keeps refresh links disabled before any section is inserted", () => {
    renderShell();
    expect(screen.getByRole("button", { name: "Sync Inserted Sections" })).toBeDisabled();
  });

  it("silently restores saved preferences without showing a restore prompt", () => {
    localStorage.setItem(
      "crx-navigator-prefs-v1",
      JSON.stringify({
        ...DEFAULT_USER_PREFS_STATE,
        uiPrefs: {
          ...DEFAULT_USER_PREFS_STATE.uiPrefs,
          onboardingDismissed: true,
          rightPaneTab: "review",
        },
      })
    );

    renderShell();
    expect(screen.queryByText("Restore saved workspace preferences?")).not.toBeInTheDocument();
    expect(screen.getByText("Review checklist")).toBeInTheDocument();
  });

  it("supports collapsible library search and DDx control labels", () => {
    renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Toggle snippet search" }));
    expect(screen.getByPlaceholderText("Search snippets...")).toBeInTheDocument();

    const ddxSectionToggle = screen.getByRole("button", { name: /Working Diagnosis Builder/i });
    fireEvent.click(ddxSectionToggle);
    expect(screen.getByText("Differential list")).toBeInTheDocument();
    fireEvent.click(ddxSectionToggle);
    expect(screen.queryByText("Differential list")).not.toBeInTheDocument();
    fireEvent.click(ddxSectionToggle);
    fireEvent.click(screen.getAllByRole("button", { name: /Viral pharyngitis/i })[0]);
    expect(screen.getByLabelText("Set Viral pharyngitis as primary diagnosis")).toBeInTheDocument();
  });

  it("supports full-width review section toggles and keeps send action isolated", () => {
    localStorage.setItem(
      "crx-navigator-prefs-v1",
      JSON.stringify({
        ...DEFAULT_USER_PREFS_STATE,
        uiPrefs: {
          ...DEFAULT_USER_PREFS_STATE.uiPrefs,
          onboardingDismissed: true,
          rightPaneTab: "review",
        },
      })
    );
    renderShell();

    const illnessToggle = screen.getByTestId("review-section-toggle-illness");
    expect(screen.getByTestId("review-section-content-illness")).toBeInTheDocument();

    fireEvent.click(illnessToggle);
    expect(screen.queryByTestId("review-section-content-illness")).not.toBeInTheDocument();

    fireEvent.keyDown(illnessToggle, { key: "Enter" });
    expect(screen.getByTestId("review-section-content-illness")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("review-section-send-illness"));
    expect(screen.getByTestId("review-section-content-illness")).toBeInTheDocument();
  });
});
