import { useMemo } from "react";
import type { TopicRuntime, TopicSnippet } from "@/types/topic";

interface TriggerSuggestProps {
  topic: TopicRuntime;
  query: string;
  selectedIndex?: number;
  onSelect: (snippet: TopicSnippet) => void;
  onClose: () => void;
}

export function TriggerSuggest({
  topic,
  query,
  selectedIndex = 0,
  onSelect,
  onClose,
}: TriggerSuggestProps) {
  const matches = useMemo(() => {
    if (!query) return topic.snippets.slice(0, 8);
    const q = query.toLowerCase();
    return topic.snippets.filter(
      (s) => s.trigger.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [topic.snippets, query]);

  if (matches.length === 0) return null;

  return (
    <div className="absolute left-4 bottom-12 z-50 w-72 rounded-md border bg-popover shadow-lg overflow-hidden">
      <div className="py-1">
        {matches.map((s) => (
          <button
            key={s.id}
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(s);
            }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors text-left ${
              matches[selectedIndex]?.id === s.id ? "bg-accent" : "hover:bg-accent"
            }`}
          >
            <span className="text-foreground">{s.label}</span>
            <code className="text-xs text-muted-foreground">/{s.trigger}</code>
          </button>
        ))}
      </div>
    </div>
  );
}
