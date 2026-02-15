import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  ConsultationState,
  ConsultationAction,
  DEFAULT_CONSULTATION_STATE,
  EvidenceEntry,
} from "@/types/consultation";
import { saveState, loadState, saveAutosave, loadAutosave, clearAutosave } from "@/lib/persistence";

function normalizeLoadedState(raw: ConsultationState | null): ConsultationState {
  if (!raw) return { ...DEFAULT_CONSULTATION_STATE };
  const maybeOldTab = raw.uiPrefs?.rightPaneTab;
  const normalizedRightTab =
    maybeOldTab === "reasoning" ? "reason" : maybeOldTab;

  return {
    ...DEFAULT_CONSULTATION_STATE,
    ...raw,
    reasoningChecks: {
      ...DEFAULT_CONSULTATION_STATE.reasoningChecks,
      ...(raw.reasoningChecks ?? {}),
      redFlagsConfirmed: {
        ...DEFAULT_CONSULTATION_STATE.reasoningChecks.redFlagsConfirmed,
        ...(raw.reasoningChecks?.redFlagsConfirmed ?? {}),
      },
    },
    ddx: {
      ...DEFAULT_CONSULTATION_STATE.ddx,
      ...(raw.ddx ?? {}),
      workingDiagnoses: raw.ddx?.workingDiagnoses ?? [],
      evidenceFor: raw.ddx?.evidenceFor ?? [],
      evidenceAgainst: raw.ddx?.evidenceAgainst ?? [],
      compareSelection: raw.ddx?.compareSelection ?? [],
    },
    reviewUi: {
      ...DEFAULT_CONSULTATION_STATE.reviewUi,
      ...(raw.reviewUi ?? {}),
      expandedSections: {
        ...DEFAULT_CONSULTATION_STATE.reviewUi.expandedSections,
        ...(raw.reviewUi?.expandedSections ?? {}),
      },
    },
    editorAnchors: { ...(raw.editorAnchors ?? {}) },
    uiPrefs: {
      ...DEFAULT_CONSULTATION_STATE.uiPrefs,
      ...(raw.uiPrefs ?? {}),
      rightPaneTab: normalizedRightTab ?? DEFAULT_CONSULTATION_STATE.uiPrefs.rightPaneTab,
    },
    featureFlags: {
      ...DEFAULT_CONSULTATION_STATE.featureFlags,
      ...(raw.featureFlags ?? {}),
    },
    autosaveMeta: {
      ...DEFAULT_CONSULTATION_STATE.autosaveMeta,
      ...(raw.autosaveMeta ?? {}),
    },
  };
}

function upsertEvidence(
  entries: EvidenceEntry[],
  diagnosis: string,
  item: string,
  selected: boolean
): EvidenceEntry[] {
  const existing = entries.find((e) => e.diagnosis === diagnosis);
  if (!existing) {
    if (!selected) return entries;
    return [...entries, { diagnosis, items: [item] }];
  }

  const hasItem = existing.items.includes(item);
  if (selected && hasItem) return entries;
  if (!selected && !hasItem) return entries;

  const nextItems = selected
    ? [...existing.items, item]
    : existing.items.filter((x) => x !== item);

  if (nextItems.length === 0) {
    return entries.filter((e) => e.diagnosis !== diagnosis);
  }

  return entries.map((e) => (e.diagnosis === diagnosis ? { ...e, items: nextItems } : e));
}

export function consultationReducer(state: ConsultationState, action: ConsultationAction): ConsultationState {
  switch (action.type) {
    case "SET_TOPIC":
      if (state.activeTopicId === action.topicId) return state;
      return {
        ...state,
        activeTopicId: action.topicId,
        structuredResponses: {},
        reasoningChecks: { redFlagsConfirmed: {} },
        ddx: {
          workingDiagnoses: [],
          evidenceFor: [],
          evidenceAgainst: [],
          compareSelection: [],
        },
        sectionInclusions: {},
        reviewUi: { expandedSections: {} },
        editorAnchors: {},
        outputOverrideText: null,
      };
    case "SET_EDITOR_TEXT":
      return { ...state, editorText: action.text };
    case "SET_STRUCTURED_RESPONSE":
      return {
        ...state,
        structuredResponses: { ...state.structuredResponses, [action.fieldId]: action.value },
      };
    case "SET_STRUCTURED_SECTION_DEFAULTS":
      return {
        ...state,
        structuredResponses: { ...action.values, ...state.structuredResponses },
      };
    case "TOGGLE_RED_FLAG": {
      const current = state.reasoningChecks.redFlagsConfirmed[action.flagId] ?? false;
      return {
        ...state,
        reasoningChecks: {
          ...state.reasoningChecks,
          redFlagsConfirmed: {
            ...state.reasoningChecks.redFlagsConfirmed,
            [action.flagId]: !current,
          },
        },
      };
    }
    case "TOGGLE_SECTION_INCLUSION": {
      const current = state.sectionInclusions[action.sectionId] ?? true;
      return {
        ...state,
        sectionInclusions: { ...state.sectionInclusions, [action.sectionId]: !current },
      };
    }
    case "ADD_RECENT_INSERT":
      return {
        ...state,
        recentInserts: [{ snippetId: action.snippetId, timestamp: Date.now() }, ...state.recentInserts.slice(0, 9)],
      };
    case "SET_OUTPUT_OVERRIDE":
      return { ...state, outputOverrideText: action.text };
    case "SET_UI_PREF":
      return { ...state, uiPrefs: { ...state.uiPrefs, [action.key]: action.value } };
    case "SET_FEATURE_FLAG":
      return { ...state, featureFlags: { ...state.featureFlags, [action.key]: action.value } };
    case "SET_PANE_SIZES":
      return { ...state, uiPrefs: { ...state.uiPrefs, desktopPaneSizes: action.sizes } };
    case "SET_AUTOSAVE_TIME":
      return { ...state, autosaveMeta: { lastSavedAt: action.timestamp } };
    case "TOGGLE_REVIEW_SECTION": {
      const current = state.reviewUi.expandedSections[action.sectionId] ?? true;
      return {
        ...state,
        reviewUi: {
          ...state.reviewUi,
          expandedSections: { ...state.reviewUi.expandedSections, [action.sectionId]: !current },
        },
      };
    }
    case "DDX_TOGGLE_DIAGNOSIS": {
      const exists = state.ddx.workingDiagnoses.some((d) => d.name === action.name);
      if (exists) {
        return {
          ...state,
          ddx: {
            ...state.ddx,
            workingDiagnoses: state.ddx.workingDiagnoses.filter((d) => d.name !== action.name),
            evidenceFor: state.ddx.evidenceFor.filter((e) => e.diagnosis !== action.name),
            evidenceAgainst: state.ddx.evidenceAgainst.filter((e) => e.diagnosis !== action.name),
            compareSelection: state.ddx.compareSelection.filter((name) => name !== action.name),
          },
        };
      }
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: [...state.ddx.workingDiagnoses, { name: action.name, isPrimary: false }],
        },
      };
    }
    case "DDX_SET_PRIMARY": {
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: state.ddx.workingDiagnoses.map((d) => ({
            ...d,
            isPrimary: d.name === action.name,
          })),
        },
      };
    }
    case "DDX_REORDER": {
      const next = [...state.ddx.workingDiagnoses];
      if (
        action.from < 0 ||
        action.to < 0 ||
        action.from >= next.length ||
        action.to >= next.length ||
        action.from === action.to
      ) {
        return state;
      }
      const [dragged] = next.splice(action.from, 1);
      next.splice(action.to, 0, dragged);
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: next,
        },
      };
    }
    case "DDX_ADD_CUSTOM": {
      const name = action.name.trim();
      if (!name) return state;
      if (state.ddx.workingDiagnoses.some((d) => d.name === name)) return state;
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: [...state.ddx.workingDiagnoses, { name, isPrimary: false }],
        },
      };
    }
    case "DDX_REMOVE":
      return {
        ...state,
        ddx: {
          ...state.ddx,
          workingDiagnoses: state.ddx.workingDiagnoses.filter((d) => d.name !== action.name),
          evidenceFor: state.ddx.evidenceFor.filter((e) => e.diagnosis !== action.name),
          evidenceAgainst: state.ddx.evidenceAgainst.filter((e) => e.diagnosis !== action.name),
          compareSelection: state.ddx.compareSelection.filter((name) => name !== action.name),
        },
      };
    case "DDX_TOGGLE_COMPARE": {
      const current = state.ddx.compareSelection;
      let next: string[];
      if (current.includes(action.name)) {
        next = current.filter((n) => n !== action.name);
      } else if (current.length >= 2) {
        next = [current[1], action.name];
      } else {
        next = [...current, action.name];
      }
      return {
        ...state,
        ddx: {
          ...state.ddx,
          compareSelection: next,
        },
      };
    }
    case "DDX_ASSIGN_EVIDENCE": {
      const nextFor = action.side === "for"
        ? upsertEvidence(state.ddx.evidenceFor, action.diagnosis, action.item, action.selected)
        : upsertEvidence(state.ddx.evidenceFor, action.diagnosis, action.item, false);
      const nextAgainst = action.side === "against"
        ? upsertEvidence(state.ddx.evidenceAgainst, action.diagnosis, action.item, action.selected)
        : upsertEvidence(state.ddx.evidenceAgainst, action.diagnosis, action.item, false);
      return {
        ...state,
        ddx: {
          ...state.ddx,
          evidenceFor: nextFor,
          evidenceAgainst: nextAgainst,
        },
      };
    }
    case "SET_EDITOR_ANCHOR":
      return {
        ...state,
        editorAnchors: {
          ...state.editorAnchors,
          [action.sectionId]: action.anchor,
        },
      };
    case "MARK_EDITOR_ANCHOR_DETACHED": {
      const anchor = state.editorAnchors[action.sectionId];
      if (!anchor) return state;
      return {
        ...state,
        editorAnchors: {
          ...state.editorAnchors,
          [action.sectionId]: { ...anchor, detached: true },
        },
      };
    }
    case "REMOVE_EDITOR_ANCHOR": {
      const next = { ...state.editorAnchors };
      delete next[action.sectionId];
      return { ...state, editorAnchors: next };
    }
    case "RESTORE_STATE":
      return normalizeLoadedState(action.state);
    case "RESET":
      return { ...DEFAULT_CONSULTATION_STATE };
    default:
      return state;
  }
}

interface ConsultationContextValue {
  state: ConsultationState;
  dispatch: React.Dispatch<ConsultationAction>;
  hasAutosave: boolean;
  restoreAutosave: () => void;
  discardAutosave: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
  const savedState = normalizeLoadedState(loadState());
  const [state, dispatch] = useReducer(consultationReducer, savedState);
  const [hasAutosave, setHasAutosave] = React.useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const autosaved = loadAutosave();
    if (autosaved && autosaved.autosaveMeta.lastSavedAt) {
      const current = loadState();
      if (!current || autosaved.autosaveMeta.lastSavedAt > (current.autosaveMeta.lastSavedAt ?? 0)) {
        setHasAutosave(true);
      }
    }
  }, []);

  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveState(state);
    }, 700);
    return () => clearTimeout(saveTimeout.current);
  }, [state]);

  useEffect(() => {
    const interval = setInterval(() => {
      saveAutosave(stateRef.current);
      dispatch({ type: "SET_AUTOSAVE_TIME", timestamp: Date.now() });
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const restoreAutosave = useCallback(() => {
    const autosaved = loadAutosave();
    if (autosaved) {
      dispatch({ type: "RESTORE_STATE", state: autosaved });
      clearAutosave();
      setHasAutosave(false);
    }
  }, []);

  const discardAutosave = useCallback(() => {
    clearAutosave();
    setHasAutosave(false);
  }, []);

  return (
    <ConsultationContext.Provider value={{ state, dispatch, hasAutosave, restoreAutosave, discardAutosave }}>
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultation() {
  const ctx = useContext(ConsultationContext);
  if (!ctx) throw new Error("useConsultation must be used within ConsultationProvider");
  return ctx;
}
