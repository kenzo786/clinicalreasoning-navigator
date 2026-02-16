import { useState, useMemo, useEffect, useRef } from "react";
import type { TopicRuntime } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { parseTokens } from "@/lib/tokenParser";
import type { UnresolvedToken } from "@/lib/tokenParser";
import { TokenResolverModal } from "@/components/editor/TokenResolverModal";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { trackTelemetry } from "@/lib/telemetry";

interface LibraryPaneProps {
  topic: TopicRuntime;
  editorRef: { current: HTMLTextAreaElement | null };
  availableTopics: Array<{ id: string; displayName: string }>;
}

export function LibraryPane({ topic, editorRef, availableTopics }: LibraryPaneProps) {
  const { state, dispatch } = useConsultation();
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [resolverData, setResolverData] = useState<{
    text: string;
    tokens: UnresolvedToken[];
    snippetId: string;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!search) return topic.snippets;
    const q = search.toLowerCase();
    return topic.snippets.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.trigger.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [topic.snippets, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const s of filtered) {
      (groups[s.category] ??= []).push(s);
    }
    return groups;
  }, [filtered]);

  const handleInsertSnippet = (snippet: (typeof topic.snippets)[number]) => {
    const { textWithDatesResolved, unresolvedTokens } = parseTokens(snippet.content);
    if (unresolvedTokens.length > 0) {
      setResolverData({ text: textWithDatesResolved, tokens: unresolvedTokens, snippetId: snippet.id });
      trackTelemetry(
        "token_modal_opened",
        { source: "library", token_count: unresolvedTokens.length },
        { enabled: state.uiPrefs.telemetryEnabled }
      );
    } else {
      insertText(textWithDatesResolved, snippet.id);
    }
  };

  const insertText = (text: string, snippetId: string) => {
    const editor = editorRef.current;
    if (editor) {
      const start = editor.selectionStart;
      const before = state.editorText.slice(0, start);
      const after = state.editorText.slice(editor.selectionEnd);
      const newText = before + text + after;
      dispatch({ type: "SET_EDITOR_TEXT_WITH_HISTORY", text: newText });
      dispatch({ type: "ADD_RECENT_INSERT", snippetId });
      setTimeout(() => {
        editor.focus();
        const pos = start + text.length;
        editor.setSelectionRange(pos, pos);
      }, 0);
    } else {
      dispatch({ type: "SET_EDITOR_TEXT_WITH_HISTORY", text: state.editorText + text });
      dispatch({ type: "ADD_RECENT_INSERT", snippetId });
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const root = rootRef.current;
      if (!root) return;
      const active = document.activeElement;
      if (!active || !root.contains(active)) return;
      if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) return;
      e.preventDefault();
      dispatch({ type: "SET_UI_PREF", key: "librarySearchCollapsed", value: false });
      setTimeout(() => searchInputRef.current?.focus(), 0);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dispatch]);

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-card" tabIndex={0}>
      <div className="p-3 border-b space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Topic</label>
        <div className="relative">
          <select
            value={state.activeTopicId}
            onChange={(e) => dispatch({ type: "SET_TOPIC", topicId: e.target.value })}
            className="w-full h-8 pl-2 pr-8 text-sm rounded border bg-background text-foreground appearance-none cursor-pointer"
          >
            {availableTopics.map((t) => (
              <option key={t.id} value={t.id}>{t.displayName}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      <div className="p-3 border-b">
        <div className="flex items-center justify-between">
          <button
            onClick={() =>
              dispatch({
                type: "SET_UI_PREF",
                key: "librarySearchCollapsed",
                value: !state.uiPrefs.librarySearchCollapsed,
              })
            }
            className="inline-flex items-center gap-1 rounded border bg-secondary px-2 py-1 text-xs hover:bg-accent"
            aria-label="Toggle snippet search"
          >
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            Search snippets
            {state.uiPrefs.librarySearchCollapsed ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronUp className="h-3.5 w-3.5" />
            )}
          </button>
          <span className="text-[10px] text-muted-foreground">Press / to search</span>
        </div>
        {!state.uiPrefs.librarySearchCollapsed && (
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search snippets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-7 pl-7 pr-2 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-3">
        {Object.entries(grouped).map(([category, snippets]) => (
          <div key={category}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1 mb-1">
              {category}
            </h3>
            <div className="space-y-0.5">
              {snippets.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleInsertSnippet(s)}
                  className="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-accent transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {s.label}
                    </span>
                    <code className="text-xs text-muted-foreground">/{s.trigger}</code>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No snippets found</p>
        )}
      </div>

      {resolverData && (
        <TokenResolverModal
          text={resolverData.text}
          tokens={resolverData.tokens}
          onResolve={(resolved) => {
            insertText(resolved, resolverData.snippetId);
            trackTelemetry(
              "token_modal_resolved",
              { source: "library" },
              { enabled: state.uiPrefs.telemetryEnabled }
            );
            setResolverData(null);
          }}
          onCancel={() => setResolverData(null)}
        />
      )}
    </div>
  );
}
