import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  ConsultationState,
  ConsultationAction,
  DEFAULT_CONSULTATION_STATE,
} from "@/types/consultation";
import { saveState, loadState, saveAutosave, loadAutosave, clearAutosave } from "@/lib/persistence";

function consultationReducer(state: ConsultationState, action: ConsultationAction): ConsultationState {
  switch (action.type) {
    case "SET_TOPIC":
      return { ...state, activeTopicId: action.topicId };
    case "SET_EDITOR_TEXT":
      return { ...state, editorText: action.text };
    case "SET_STRUCTURED_RESPONSE":
      return {
        ...state,
        structuredResponses: { ...state.structuredResponses, [action.fieldId]: action.value },
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
        recentInserts: [
          { snippetId: action.snippetId, timestamp: Date.now() },
          ...state.recentInserts.slice(0, 9),
        ],
      };
    case "SET_OUTPUT_OVERRIDE":
      return { ...state, outputOverrideText: action.text };
    case "SET_UI_PREF":
      return { ...state, uiPrefs: { ...state.uiPrefs, [action.key]: action.value } };
    case "SET_PANE_SIZES":
      return { ...state, uiPrefs: { ...state.uiPrefs, desktopPaneSizes: action.sizes } };
    case "SET_AUTOSAVE_TIME":
      return { ...state, autosaveMeta: { lastSavedAt: action.timestamp } };
    case "RESTORE_STATE":
      return { ...action.state };
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
  const savedState = loadState();
  const [state, dispatch] = useReducer(consultationReducer, savedState ?? DEFAULT_CONSULTATION_STATE);
  const [hasAutosave, setHasAutosave] = React.useState(false);

  // Check for autosave on mount
  useEffect(() => {
    const autosaved = loadAutosave();
    if (autosaved && autosaved.autosaveMeta.lastSavedAt) {
      const current = loadState();
      if (!current || autosaved.autosaveMeta.lastSavedAt > (current.autosaveMeta.lastSavedAt ?? 0)) {
        setHasAutosave(true);
      }
    }
  }, []);

  // Debounced persistence
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      saveState(state);
    }, 700);
    return () => clearTimeout(saveTimeout.current);
  }, [state]);

  // Autosave every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      saveAutosave(state);
      dispatch({ type: "SET_AUTOSAVE_TIME", timestamp: Date.now() });
    }, 30000);
    return () => clearInterval(interval);
  }, [state]);

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
