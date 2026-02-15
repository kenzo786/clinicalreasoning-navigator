import type { ConsultationState } from "@/types/consultation";

const STORAGE_KEY = "crx-navigator-consultation";
const AUTOSAVE_KEY = "crx-navigator-autosave";

export function saveState(state: ConsultationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota exceeded — silently fail
  }
}

export function loadState(): ConsultationState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsultationState;
  } catch {
    return null;
  }
}

export function saveAutosave(state: ConsultationState): void {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ ...state, autosaveMeta: { lastSavedAt: Date.now() } })
    );
  } catch {
    // silently fail
  }
}

export function loadAutosave(): ConsultationState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsultationState;
  } catch {
    return null;
  }
}

export function clearAutosave(): void {
  localStorage.removeItem(AUTOSAVE_KEY);
}

export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(AUTOSAVE_KEY);
}
