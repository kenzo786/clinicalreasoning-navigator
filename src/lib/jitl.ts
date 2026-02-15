import type { JitlConfig, JitlContextType, JitlTermMap } from "@/types/topic";

export const JIT_CONTEXT_STORAGE_KEY = "crx-navigator-jitl-context";

export function getAiContext(): string {
  try {
    return (
      localStorage.getItem(JIT_CONTEXT_STORAGE_KEY) ??
      "Target audience: [Primary Care Clinician] in [UK General Practice]."
    );
  } catch {
    return "Target audience: [Primary Care Clinician] in [UK General Practice].";
  }
}

export function saveAiContext(context: string): void {
  try {
    localStorage.setItem(JIT_CONTEXT_STORAGE_KEY, context);
  } catch {
    // no-op
  }
}

export function buildPresetPhrase(term: string, preset: JitlContextType): string {
  const base = term.trim();
  if (!base) return "";
  switch (preset) {
    case "ddx":
      return `${base} differential diagnosis`;
    case "clinical":
      return `${base} clinical assessment`;
    case "pathophysiology":
      return `${base} pathophysiology`;
    case "pharmacology":
      return `${base} pharmacology`;
    case "management":
      return `${base} management`;
    case "prescribing":
      return `${base} prescribing guidance`;
    case "investigation":
      return `${base} investigation guidance`;
    case "title":
    default:
      return base;
  }
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase();
}

export function getJitlTermConfig(config: JitlConfig, term: string): JitlTermMap | undefined {
  const key = normalizeTerm(term);
  return config.termMap.find((entry) => {
    if (normalizeTerm(entry.term) === key) return true;
    return (entry.aliases ?? []).some((a) => normalizeTerm(a) === key);
  });
}

