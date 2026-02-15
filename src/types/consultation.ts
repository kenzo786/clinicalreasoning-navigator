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

export interface ReviewChecklistItem {
  id: string;
  source: "must-not-miss" | "discriminator" | "safety" | "investigation" | "management";
  status: "pending" | "reviewed" | "inserted";
}

export interface ExportDraftState {
  text: string;
  isDerived: boolean;
  updatedAt: number | null;
  lastDerivedHash: string | null;
}

export interface JitlOutboundEvent {
  term: string;
  contextType: string;
  provider: string;
  timestamp: number;
}

export interface ConsultationSessionState {
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
  reviewChecklist: Record<string, ReviewChecklistItem>;
  editorAnchors: Record<string, EditorAnchor>;
  sectionInclusions: Record<string, boolean>;
  recentInserts: { snippetId: string; timestamp: number }[];
  exportDraft: ExportDraftState;
  jitlSession: {
    outboundEvents: JitlOutboundEvent[];
  };
}

export interface UiPrefs {
  desktopPaneSizes: [number, number, number];
  mobileActivePane: "library" | "editor" | "reasoning";
  rightPaneTab: "review" | "reason" | "structured";
  theme: "light" | "dark";
  compactStructured: boolean;
  composerTrayCollapsed: boolean;
  lastTopicId: string;
}

export interface FeatureFlags {
  composerBridge: boolean;
  ddxBuilder: boolean;
  reviewJitl: boolean;
  reviewEnabled: boolean;
  jitlEnabled: boolean;
  topicV2Authoring: boolean;
}

export interface UserPrefsState {
  uiPrefs: UiPrefs;
  featureFlags: FeatureFlags;
}

export interface ConsultationState extends ConsultationSessionState {
  uiPrefs: UiPrefs;
  featureFlags: FeatureFlags;
}

export const DEFAULT_CONSULTATION_SESSION_STATE: ConsultationSessionState = {
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
  reviewChecklist: {},
  editorAnchors: {},
  sectionInclusions: {},
  recentInserts: [],
  exportDraft: {
    text: "",
    isDerived: true,
    updatedAt: null,
    lastDerivedHash: null,
  },
  jitlSession: {
    outboundEvents: [],
  },
};

export const DEFAULT_USER_PREFS_STATE: UserPrefsState = {
  uiPrefs: {
    desktopPaneSizes: [20, 45, 35],
    mobileActivePane: "editor",
    rightPaneTab: "reason",
    theme: "light",
    compactStructured: false,
    composerTrayCollapsed: false,
    lastTopicId: "sore-throat",
  },
  featureFlags: {
    composerBridge: true,
    ddxBuilder: true,
    reviewJitl: true,
    reviewEnabled: true,
    jitlEnabled: true,
    topicV2Authoring: false,
  },
};

export const DEFAULT_CONSULTATION_STATE: ConsultationState = {
  ...DEFAULT_CONSULTATION_SESSION_STATE,
  uiPrefs: DEFAULT_USER_PREFS_STATE.uiPrefs,
  featureFlags: DEFAULT_USER_PREFS_STATE.featureFlags,
};

export type SessionAction =
  | { type: "SET_TOPIC"; topicId: string }
  | { type: "SET_EDITOR_TEXT"; text: string }
  | { type: "SET_STRUCTURED_RESPONSE"; fieldId: string; value: string | number | boolean | string[] }
  | { type: "SET_STRUCTURED_SECTION_DEFAULTS"; values: Record<string, string | number | boolean | string[]> }
  | { type: "TOGGLE_RED_FLAG"; flagId: string }
  | { type: "TOGGLE_SECTION_INCLUSION"; sectionId: string }
  | { type: "ADD_RECENT_INSERT"; snippetId: string }
  | { type: "SET_EXPORT_DRAFT"; text: string | null; derivedHash?: string | null }
  | { type: "TOGGLE_REVIEW_SECTION"; sectionId: string }
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
  | { type: "SET_REVIEW_ITEM_STATUS"; id: string; source: ReviewChecklistItem["source"]; status: ReviewChecklistItem["status"] }
  | { type: "ADD_JITL_OUTBOUND_EVENT"; event: JitlOutboundEvent }
  | { type: "RESET_SESSION" }
  | { type: "SET_OUTPUT_OVERRIDE"; text: string | null };

export type PrefsAction =
  | {
      type: "SET_UI_PREF";
      key: keyof UiPrefs;
      value: UiPrefs[keyof UiPrefs];
    }
  | { type: "SET_PANE_SIZES"; sizes: [number, number, number] }
  | { type: "SET_FEATURE_FLAG"; key: keyof FeatureFlags; value: boolean }
  | { type: "RESTORE_PREFS"; prefs: UserPrefsState }
  | { type: "RESET_PREFS" };

export type ConsultationAction = SessionAction | PrefsAction;
