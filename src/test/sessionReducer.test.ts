import { describe, expect, it } from "vitest";
import { sessionReducer } from "@/state/sessionReducer";
import { DEFAULT_CONSULTATION_SESSION_STATE } from "@/types/consultation";
import { appendAnchored } from "@/lib/editorBridge";

describe("session reducer editor history", () => {
  it("supports undo and redo", () => {
    let state = {
      ...DEFAULT_CONSULTATION_SESSION_STATE,
      editorText: "A",
    };
    state = sessionReducer(state, {
      type: "SET_EDITOR_TEXT_WITH_HISTORY",
      text: "AB",
    });
    state = sessionReducer(state, {
      type: "SET_EDITOR_TEXT_WITH_HISTORY",
      text: "ABC",
    });
    expect(state.editorText).toBe("ABC");

    state = sessionReducer(state, { type: "UNDO_EDITOR_TEXT" });
    expect(state.editorText).toBe("AB");
    state = sessionReducer(state, { type: "REDO_EDITOR_TEXT" });
    expect(state.editorText).toBe("ABC");
  });

  it("caps history depth at 50", () => {
    let state = { ...DEFAULT_CONSULTATION_SESSION_STATE };
    for (let i = 1; i <= 70; i += 1) {
      state = sessionReducer(state, {
        type: "SET_EDITOR_TEXT_WITH_HISTORY",
        text: `text-${i}`,
      });
    }
    expect(state.editorHistory.past.length).toBe(50);
  });

  it("recomputes anchor detached status after undo/redo", () => {
    const inserted = appendAnchored("", "assessment", "Assessment\nLine 1");
    let state = {
      ...DEFAULT_CONSULTATION_SESSION_STATE,
      editorText: inserted.nextText,
      editorAnchors: { assessment: inserted.anchor },
    };
    state = sessionReducer(state, {
      type: "SET_EDITOR_TEXT_WITH_HISTORY",
      text: state.editorText.replace("Line 1", "Line 1 edited"),
    });
    expect(state.editorAnchors.assessment.detached).toBe(true);

    state = sessionReducer(state, { type: "UNDO_EDITOR_TEXT" });
    expect(state.editorAnchors.assessment.detached).toBe(false);
  });
});
