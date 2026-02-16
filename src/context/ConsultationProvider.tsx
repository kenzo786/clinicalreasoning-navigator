import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
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
  loadPrefs,
  purgeLegacyClinicalStorage,
  savePrefs,
} from "@/lib/persistence";
import { ONBOARDING_VERSION } from "@/config/onboarding";
import { trackTelemetry } from "@/lib/telemetry";

function normalizeLoadedPrefs(raw: UserPrefsState | null): UserPrefsState {
  if (!raw) return { ...DEFAULT_USER_PREFS_STATE };
  const maybeOldTab = raw.uiPrefs?.rightPaneTab;
  const normalizedRightTab = maybeOldTab === "reasoning" ? "reason" : maybeOldTab;
  const nextUiPrefs = {
    ...DEFAULT_USER_PREFS_STATE.uiPrefs,
    ...(raw.uiPrefs ?? {}),
    rightPaneTab: normalizedRightTab ?? DEFAULT_USER_PREFS_STATE.uiPrefs.rightPaneTab,
  };
  if (nextUiPrefs.onboardingSeenVersion !== ONBOARDING_VERSION) {
    nextUiPrefs.onboardingDismissed = false;
    nextUiPrefs.onboardingSeenVersion = ONBOARDING_VERSION;
  }
  return {
    ...DEFAULT_USER_PREFS_STATE,
    ...raw,
    uiPrefs: nextUiPrefs,
    featureFlags: {
      ...DEFAULT_USER_PREFS_STATE.featureFlags,
      ...(raw.featureFlags ?? {}),
    },
  };
}

interface ConsultationContextValue {
  state: ConsultationState;
  dispatch: React.Dispatch<ConsultationAction>;
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function ConsultationProvider({ children }: { children: React.ReactNode }) {
  const loadedPrefs = normalizeLoadedPrefs(loadPrefs());
  const [prefsState, prefsDispatch] = useReducer(
    prefsReducer,
    loadedPrefs
  );
  const [sessionState, sessionDispatch] = useReducer(sessionReducer, {
    ...DEFAULT_CONSULTATION_SESSION_STATE,
    activeTopicId: loadedPrefs.uiPrefs.lastTopicId,
  });
  const prefsRef = useRef(prefsState);
  const sessionRef = useRef<ConsultationSessionState>(sessionState);

  useEffect(() => {
    purgeLegacyClinicalStorage();
  }, []);

  useEffect(() => {
    prefsRef.current = prefsState;
  }, [prefsState]);

  useEffect(() => {
    sessionRef.current = sessionState;
  }, [sessionState]);

  useEffect(() => {
    trackTelemetry(
      "session_started",
      {
        topic_id: loadedPrefs.uiPrefs.lastTopicId,
      },
      {
        enabled: prefsRef.current.uiPrefs.telemetryEnabled,
      }
    );
  }, [loadedPrefs.uiPrefs.lastTopicId]);

  const dispatch = useCallback(
    (action: ConsultationAction) => {
      if (isPrefsAction(action)) {
        if (action.type === "SET_UI_PREF" && action.key === "telemetryEnabled") {
          trackTelemetry(
            "telemetry_preference_changed",
            { enabled: Boolean(action.value) },
            { enabled: true }
          );
        }
        prefsDispatch(action);
        return;
      }

      const telemetryEnabled = prefsRef.current.uiPrefs.telemetryEnabled;
      const session = sessionRef.current;
      switch (action.type) {
        case "ADD_RECENT_INSERT":
          trackTelemetry(
            "snippet_inserted",
            { snippet_id: action.snippetId },
            { enabled: telemetryEnabled }
          );
          break;
        case "DDX_TOGGLE_DIAGNOSIS": {
          const exists = session.ddx.workingDiagnoses.some((d) => d.name === action.name);
          trackTelemetry(
            exists ? "diagnosis_removed" : "diagnosis_added",
            { source: "catalog" },
            { enabled: telemetryEnabled }
          );
          break;
        }
        case "DDX_ADD_CUSTOM":
          trackTelemetry("diagnosis_added", { source: "custom" }, { enabled: telemetryEnabled });
          break;
        case "DDX_REMOVE":
          trackTelemetry("diagnosis_removed", { source: "list" }, { enabled: telemetryEnabled });
          break;
        case "DDX_ASSIGN_EVIDENCE":
          trackTelemetry(
            "evidence_assignment_updated",
            {
              side: action.side,
              selected: action.selected,
            },
            { enabled: telemetryEnabled }
          );
          break;
        case "SET_REVIEW_ITEM_STATUS":
          trackTelemetry(
            "review_status_updated",
            {
              source: action.source,
              status: action.status,
            },
            { enabled: telemetryEnabled }
          );
          break;
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
