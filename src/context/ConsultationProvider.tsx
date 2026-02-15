import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type {
  ConsultationAction,
  ConsultationSessionState,
  ConsultationState,
  SessionAction,
  UserPrefsState,
} from "@/types/consultation";
import {
  DEFAULT_CONSULTATION_SESSION_STATE,
  DEFAULT_USER_PREFS_STATE,
} from "@/types/consultation";
import { sessionReducer } from "@/state/sessionReducer";
import { prefsReducer } from "@/state/prefsReducer";
import { isPrefsAction } from "@/state/actions";
import {
  clearPrefs,
  loadPrefs,
  purgeLegacyClinicalStorage,
  savePrefs,
} from "@/lib/persistence";

function normalizeLoadedPrefs(raw: UserPrefsState | null): UserPrefsState {
  if (!raw) return { ...DEFAULT_USER_PREFS_STATE };
  const maybeOldTab = raw.uiPrefs?.rightPaneTab;
  const normalizedRightTab = maybeOldTab === "reasoning" ? "reason" : maybeOldTab;
  return {
    ...DEFAULT_USER_PREFS_STATE,
    ...raw,
    uiPrefs: {
      ...DEFAULT_USER_PREFS_STATE.uiPrefs,
      ...(raw.uiPrefs ?? {}),
      rightPaneTab: normalizedRightTab ?? DEFAULT_USER_PREFS_STATE.uiPrefs.rightPaneTab,
    },
    featureFlags: {
      ...DEFAULT_USER_PREFS_STATE.featureFlags,
      ...(raw.featureFlags ?? {}),
    },
  };
}

interface ConsultationContextValue {
  state: ConsultationState;
  dispatch: React.Dispatch<ConsultationAction>;
  hasPrefsBackup: boolean;
  restorePrefsBackup: () => void;
  discardPrefsBackup: () => void;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
  const rawLoadedPrefs = loadPrefs();
  const loadedPrefs = normalizeLoadedPrefs(rawLoadedPrefs);
  const [savedPrefsCandidate, setSavedPrefsCandidate] = useState<UserPrefsState | null>(
    rawLoadedPrefs ? loadedPrefs : null
  );
  const [prefsState, prefsDispatch] = useReducer(
    prefsReducer,
    DEFAULT_USER_PREFS_STATE
  );
  const [sessionState, sessionDispatch] = useReducer(sessionReducer, {
    ...DEFAULT_CONSULTATION_SESSION_STATE,
    activeTopicId: DEFAULT_USER_PREFS_STATE.uiPrefs.lastTopicId,
  });
  const prefsRef = useRef(prefsState);

  useEffect(() => {
    purgeLegacyClinicalStorage();
  }, []);

  useEffect(() => {
    prefsRef.current = prefsState;
  }, [prefsState]);

  const dispatch = useCallback(
    (action: ConsultationAction) => {
      if (isPrefsAction(action)) {
        prefsDispatch(action);
        return;
      }

      sessionDispatch(action as SessionAction);
      if (action.type === "SET_TOPIC") {
        prefsDispatch({
          type: "SET_UI_PREF",
          key: "lastTopicId",
          value: action.topicId,
        });
      }
    },
    [prefsDispatch, sessionDispatch]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      savePrefs(prefsRef.current);
    }, 300);
    return () => clearTimeout(timeout);
  }, [prefsState]);

  const restorePrefsBackup = useCallback(() => {
    if (!savedPrefsCandidate) return;
    prefsDispatch({ type: "RESTORE_PREFS", prefs: savedPrefsCandidate });
    setSavedPrefsCandidate(null);
    sessionDispatch({
      type: "SET_TOPIC",
      topicId: savedPrefsCandidate.uiPrefs.lastTopicId,
    });
  }, [savedPrefsCandidate]);

  const discardPrefsBackup = useCallback(() => {
    clearPrefs();
    setSavedPrefsCandidate(null);
  }, []);

  const state: ConsultationState = useMemo(
    () => ({
      ...sessionState,
      uiPrefs: prefsState.uiPrefs,
      featureFlags: prefsState.featureFlags,
    }),
    [sessionState, prefsState]
  );

  return (
    <ConsultationContext.Provider
      value={{
        state,
        dispatch,
        hasPrefsBackup: savedPrefsCandidate !== null,
        restorePrefsBackup,
        discardPrefsBackup,
      }}
    >
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultation() {
  const ctx = useContext(ConsultationContext);
  if (!ctx) throw new Error("useConsultation must be used within ConsultationProvider");
  return ctx;
}

// Backward-compatible export for existing reducer tests.
export { sessionReducer as consultationReducer };
