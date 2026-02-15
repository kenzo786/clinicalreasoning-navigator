import type { PrefsAction, UserPrefsState } from "@/types/consultation";
import { DEFAULT_USER_PREFS_STATE } from "@/types/consultation";

export function prefsReducer(state: UserPrefsState, action: PrefsAction): UserPrefsState {
  switch (action.type) {
    case "SET_UI_PREF":
      return {
        ...state,
        uiPrefs: {
          ...state.uiPrefs,
          [action.key]: action.value,
        },
      };
    case "SET_PANE_SIZES":
      return {
        ...state,
        uiPrefs: {
          ...state.uiPrefs,
          desktopPaneSizes: action.sizes,
        },
      };
    case "SET_FEATURE_FLAG":
      return {
        ...state,
        featureFlags: {
          ...state.featureFlags,
          [action.key]: action.value,
        },
      };
    case "RESTORE_PREFS":
      return {
        uiPrefs: { ...DEFAULT_USER_PREFS_STATE.uiPrefs, ...action.prefs.uiPrefs },
        featureFlags: { ...DEFAULT_USER_PREFS_STATE.featureFlags, ...action.prefs.featureFlags },
      };
    case "RESET_PREFS":
      return { ...DEFAULT_USER_PREFS_STATE };
    default:
      return state;
  }
}
