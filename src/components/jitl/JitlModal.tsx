import { useEffect, useMemo, useState } from "react";
import type { JitlConfig, JitlContextType } from "@/types/topic";
import { buildPresetPhrase, getAiContext, saveAiContext } from "@/lib/jitl";
import { X } from "lucide-react";

interface JitlModalProps {
  open: boolean;
  onClose: () => void;
  term: string;
  initialContextType?: JitlContextType;
  config: JitlConfig;
  onOutbound?: (provider: string, query: string) => void;
}

const PRESETS: Array<{ key: JitlContextType; label: string }> = [
  { key: "clinical", label: "Clinical" },
  { key: "ddx", label: "Differential" },
  { key: "management", label: "Management" },
  { key: "investigation", label: "Investigations" },
  { key: "pharmacology", label: "Pharmacology" },
  { key: "prescribing", label: "Prescribing" },
];

export function JitlModal({
  open,
  onClose,
  term,
  initialContextType = "title",
  config,
  onOutbound,
}: JitlModalProps) {
  const [contextType, setContextType] = useState<JitlContextType>(initialContextType);
  const [searchInput, setSearchInput] = useState(term);
  const [contextEnabled, setContextEnabled] = useState(false);
  const [contextText, setContextText] = useState(getAiContext());

  useEffect(() => {
    if (!open) return;
    setContextType(initialContextType);
    setSearchInput(buildPresetPhrase(term, initialContextType));
    setContextText(getAiContext());
  }, [open, term, initialContextType]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const groupedProviders = useMemo(() => {
    const map = new Map<number, JitlConfig["linkProviders"]>();
    for (const link of config.linkProviders) {
      const existing = map.get(link.row) ?? [];
      existing.push(link);
      map.set(link.row, existing);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [config.linkProviders]);

  if (!open) return null;

  const query = contextEnabled && contextText.trim()
    ? `${searchInput.trim()} ${contextText.trim()}`
    : searchInput.trim();

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-card border rounded-lg shadow-xl overflow-hidden">
        <div className="h-11 px-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Just In Time Learning</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full h-9 px-3 rounded border bg-background text-sm"
            placeholder="Search phrase"
          />

          <div className="flex flex-wrap gap-1">
            {PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => {
                  setContextType(preset.key);
                  setSearchInput(buildPresetPhrase(term, preset.key));
                }}
                className={`px-2 py-1 text-xs rounded border ${
                  contextType === preset.key
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={contextEnabled}
              onChange={(e) => setContextEnabled(e.target.checked)}
              className="accent-primary"
            />
            Add audience context
          </label>

          {contextEnabled && (
            <textarea
              value={contextText}
              onChange={(e) => setContextText(e.target.value)}
              onBlur={() => saveAiContext(contextText.trim())}
              className="w-full min-h-20 px-3 py-2 rounded border bg-background text-sm"
            />
          )}

          <div className="space-y-2">
            {groupedProviders.map(([row, links]) => (
              <div key={row} className="flex flex-wrap gap-1">
                {links.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => {
                      if (!query) return;
                      const url = link.hrefTemplate.replace("SEARCH_TERM", encodeURIComponent(query));
                      onOutbound?.(link.label, query);
                      window.open(url, "_blank", "noopener");
                    }}
                    className="px-2 py-1 rounded border text-xs bg-secondary hover:bg-accent"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
