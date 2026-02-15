import type { UserPrefsState } from "@/types/consultation";

const PREFS_KEY = "crx-navigator-prefs-v1";
const LEGACY_KEYS = ["crx-navigator-consultation", "crx-navigator-autosave"];

export function savePrefs(prefs: UserPrefsState): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage failures.
  }
}

export function loadPrefs(): UserPrefsState | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserPrefsState;
  } catch {
    return null;
  }
}

export function clearPrefs(): void {
  localStorage.removeItem(PREFS_KEY);
}

export function purgeLegacyClinicalStorage(): void {
  for (const key of LEGACY_KEYS) {
    localStorage.removeItem(key);
  }
}
