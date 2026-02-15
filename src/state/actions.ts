import type { ConsultationAction, PrefsAction, SessionAction } from "@/types/consultation";

export type { ConsultationAction, SessionAction, PrefsAction };

export function isPrefsAction(action: ConsultationAction): action is PrefsAction {
  return (
    action.type === "SET_UI_PREF" ||
    action.type === "SET_PANE_SIZES" ||
    action.type === "SET_FEATURE_FLAG" ||
    action.type === "RESTORE_PREFS" ||
    action.type === "RESET_PREFS"
  );
}
