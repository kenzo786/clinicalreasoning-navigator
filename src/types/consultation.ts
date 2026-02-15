export interface WorkingDiagnosis {
  name: string;
  isPrimary: boolean;
}

export interface EvidenceEntry {
  diagnosis: string;
  items: string[];
}

export interface EditorAnchor {
  sectionId: string;
  startTag: string;
  endTag: string;
  detached: boolean;
  lastHash: string;
}

export interface ConsultationState {
  activeTopicId: string;
  editorText: string;
  structuredResponses: Record<string, string | number | boolean | string[]>;
  reasoningChecks: {
    redFlagsConfirmed: Record<string, boolean>;
  };
  ddx: {
    workingDiagnoses: WorkingDiagnosis[];
    evidenceFor: EvidenceEntry[];
    evidenceAgainst: EvidenceEntry[];
    compareSelection: string[];
  };
  reviewUi: {
    expandedSections: Record<string, boolean>;
  };
  editorAnchors: Record<string, EditorAnchor>;
  sectionInclusions: Record<string, boolean>;
  recentInserts: { snippetId: string; timestamp: number }[];
  outputOverrideText: string | null;
  uiPrefs: {
    desktopPaneSizes: [number, number, number];
    mobileActivePane: "library" | "editor" | "reasoning";
    rightPaneTab: "review" | "reason" | "structured";
    theme: "light" | "dark";
    compactStructured: boolean;
  };
  featureFlags: {
    composerBridge: boolean;
    ddxBuilder: boolean;
    reviewJitl: boolean;
    topicV2Authoring: boolean;
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
  ddx: {
    workingDiagnoses: [],
    evidenceFor: [],
    evidenceAgainst: [],
    compareSelection: [],
  },
  reviewUi: {
    expandedSections: {},
  },
  editorAnchors: {},
  sectionInclusions: {},
  recentInserts: [],
  outputOverrideText: null,
  uiPrefs: {
    desktopPaneSizes: [20, 45, 35],
    mobileActivePane: "editor",
    rightPaneTab: "reason",
    theme: "light",
    compactStructured: false,
  },
  featureFlags: {
    composerBridge: true,
    ddxBuilder: true,
    reviewJitl: true,
    topicV2Authoring: false,
  },
  autosaveMeta: {
    lastSavedAt: null,
  },
};

export type ConsultationAction =
  | { type: "SET_TOPIC"; topicId: string }
  | { type: "SET_EDITOR_TEXT"; text: string }
  | { type: "SET_STRUCTURED_RESPONSE"; fieldId: string; value: string | number | boolean | string[] }
  | { type: "SET_STRUCTURED_SECTION_DEFAULTS"; values: Record<string, string | number | boolean | string[]> }
  | { type: "TOGGLE_RED_FLAG"; flagId: string }
  | { type: "TOGGLE_SECTION_INCLUSION"; sectionId: string }
  | { type: "ADD_RECENT_INSERT"; snippetId: string }
  | { type: "SET_OUTPUT_OVERRIDE"; text: string | null }
  | {
      type: "SET_UI_PREF";
      key: keyof ConsultationState["uiPrefs"];
      value: ConsultationState["uiPrefs"][keyof ConsultationState["uiPrefs"]];
    }
  | { type: "SET_PANE_SIZES"; sizes: [number, number, number] }
  | { type: "SET_AUTOSAVE_TIME"; timestamp: number }
  | { type: "RESTORE_STATE"; state: ConsultationState }
  | { type: "TOGGLE_REVIEW_SECTION"; sectionId: string }
  | { type: "SET_FEATURE_FLAG"; key: keyof ConsultationState["featureFlags"]; value: boolean }
  | { type: "DDX_TOGGLE_DIAGNOSIS"; name: string }
  | { type: "DDX_SET_PRIMARY"; name: string }
  | { type: "DDX_REORDER"; from: number; to: number }
  | { type: "DDX_ADD_CUSTOM"; name: string }
  | { type: "DDX_REMOVE"; name: string }
  | { type: "DDX_TOGGLE_COMPARE"; name: string }
  | { type: "DDX_ASSIGN_EVIDENCE"; diagnosis: string; item: string; side: "for" | "against"; selected: boolean }
  | { type: "SET_EDITOR_ANCHOR"; sectionId: string; anchor: EditorAnchor }
  | { type: "MARK_EDITOR_ANCHOR_DETACHED"; sectionId: string }
  | { type: "REMOVE_EDITOR_ANCHOR"; sectionId: string }
  | { type: "RESET" };
