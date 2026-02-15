export interface ConsultationState {
  activeTopicId: string;
  editorText: string;
  structuredResponses: Record<string, string | number | boolean | string[]>;
  reasoningChecks: {
    redFlagsConfirmed: Record<string, boolean>;
  };
  sectionInclusions: Record<string, boolean>;
  recentInserts: { snippetId: string; timestamp: number }[];
  outputOverrideText: string | null;
  uiPrefs: {
    desktopPaneSizes: [number, number, number];
    mobileActivePane: "library" | "editor" | "reasoning";
    rightPaneTab: "reasoning" | "structured";
    theme: "light" | "dark";
  };
  autosaveMeta: {
    lastSavedAt: number | null;
  };
}

export const DEFAULT_CONSULTATION_STATE: ConsultationState = {
  activeTopicId: "sore-throat",
  editorText: "",
  structuredResponses: {},
  reasoningChecks: {
    redFlagsConfirmed: {},
  },
  sectionInclusions: {},
  recentInserts: [],
  outputOverrideText: null,
  uiPrefs: {
    desktopPaneSizes: [20, 45, 35],
    mobileActivePane: "editor",
    rightPaneTab: "reasoning",
    theme: "light",
  },
  autosaveMeta: {
    lastSavedAt: null,
  },
};

export type ConsultationAction =
  | { type: "SET_TOPIC"; topicId: string }
  | { type: "SET_EDITOR_TEXT"; text: string }
  | { type: "SET_STRUCTURED_RESPONSE"; fieldId: string; value: string | number | boolean | string[] }
  | { type: "TOGGLE_RED_FLAG"; flagId: string }
  | { type: "TOGGLE_SECTION_INCLUSION"; sectionId: string }
  | { type: "ADD_RECENT_INSERT"; snippetId: string }
  | { type: "SET_OUTPUT_OVERRIDE"; text: string | null }
  | { type: "SET_UI_PREF"; key: keyof ConsultationState["uiPrefs"]; value: any }
  | { type: "SET_PANE_SIZES"; sizes: [number, number, number] }
  | { type: "SET_AUTOSAVE_TIME"; timestamp: number }
  | { type: "RESTORE_STATE"; state: ConsultationState }
  | { type: "RESET" };
