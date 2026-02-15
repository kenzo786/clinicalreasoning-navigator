import { describe, it, expect, beforeEach } from "vitest";
import { savePrefs, loadPrefs, purgeLegacyClinicalStorage } from "@/lib/persistence";
import {
  DEFAULT_CONSULTATION_SESSION_STATE,
  DEFAULT_USER_PREFS_STATE,
} from "@/types/consultation";

describe("persistence policy", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("persists only user prefs", () => {
    savePrefs(DEFAULT_USER_PREFS_STATE);
    const loaded = loadPrefs();
    expect(loaded?.uiPrefs.rightPaneTab).toBe(DEFAULT_USER_PREFS_STATE.uiPrefs.rightPaneTab);
    expect(localStorage.getItem("crx-navigator-consultation")).toBeNull();
    expect(localStorage.getItem("crx-navigator-autosave")).toBeNull();
  });

  it("purges legacy clinical storage keys", () => {
    localStorage.setItem("crx-navigator-consultation", JSON.stringify(DEFAULT_CONSULTATION_SESSION_STATE));
    localStorage.setItem("crx-navigator-autosave", JSON.stringify(DEFAULT_CONSULTATION_SESSION_STATE));
    purgeLegacyClinicalStorage();
    expect(localStorage.getItem("crx-navigator-consultation")).toBeNull();
    expect(localStorage.getItem("crx-navigator-autosave")).toBeNull();
  });
});
