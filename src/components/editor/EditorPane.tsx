import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { TopicV1 } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { parseTokens } from "@/lib/tokenParser";
import { TokenResolverModal } from "./TokenResolverModal";
import { TriggerSuggest } from "./TriggerSuggest";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EditorPaneProps {
  topic: TopicV1;
  editorRef: { current: HTMLTextAreaElement | null };
}

export function EditorPane({ topic, editorRef }: EditorPaneProps) {
  const { state, dispatch } = useConsultation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [triggerQuery, setTriggerQuery] = useState<string | null>(null);
  const [triggerPos, setTriggerPos] = useState(0);
  const [resolverData, setResolverData] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync ref
  useEffect(() => {
    editorRef.current = textareaRef.current;
  });

  const wordCount = useMemo(() => {
    const words = state.editorText.trim().split(/\s+/).filter(Boolean);
    return words.length;
  }, [state.editorText]);

  const charCount = state.editorText.length;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      dispatch({ type: "SET_EDITOR_TEXT", text });

      // Check for trigger
      const cursorPos = e.target.selectionStart;
      const textBefore = text.slice(0, cursorPos);
      const triggerMatch = textBefore.match(/\/(\w*)$/);

      if (triggerMatch) {
        setTriggerQuery(triggerMatch[1]);
        setTriggerPos(cursorPos - triggerMatch[0].length);
      } else {
        setTriggerQuery(null);
      }
    },
    [dispatch]
  );

  const handleTriggerSelect = useCallback(
    (snippet: typeof topic.snippets[0]) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const { textWithDatesResolved, unresolvedTokens } = parseTokens(snippet.content);
      const before = state.editorText.slice(0, triggerPos);
      const after = state.editorText.slice(textarea.selectionStart);

      if (unresolvedTokens.length > 0) {
        setResolverData({
          text: textWithDatesResolved,
          tokens: unresolvedTokens,
          snippetId: snippet.id,
          before,
          after,
        });
      } else {
        const newText = before + textWithDatesResolved + after;
        dispatch({ type: "SET_EDITOR_TEXT", text: newText });
        dispatch({ type: "ADD_RECENT_INSERT", snippetId: snippet.id });
        setTimeout(() => {
          textarea.focus();
          const pos = before.length + textWithDatesResolved.length;
          textarea.setSelectionRange(pos, pos);
        }, 0);
      }

      setTriggerQuery(null);
    },
    [state.editorText, triggerPos, dispatch]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(state.editorText);
      setCopied(true);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }, [state.editorText, toast]);

  return (
    <div className="flex flex-col h-full bg-card relative">
      {/* Editor header */}
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Editor
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Editor textarea */}
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={state.editorText}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Escape") setTriggerQuery(null);
          }}
          placeholder="Start typing your clinical note…&#10;&#10;Type / to trigger snippet insertion"
          className="w-full h-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
          spellCheck={false}
        />

        {/* Trigger suggest dropdown */}
        {triggerQuery !== null && (
          <TriggerSuggest
            topic={topic}
            query={triggerQuery}
            onSelect={handleTriggerSelect}
            onClose={() => setTriggerQuery(null)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 h-7 border-t bg-muted/50 text-xs text-muted-foreground shrink-0">
        <span>{wordCount} words · {charCount} chars</span>
        <span className="text-xs">Ctrl+S to copy</span>
      </div>

      {/* Token resolver */}
      {resolverData && (
        <TokenResolverModal
          text={resolverData.text}
          tokens={resolverData.tokens}
          onResolve={(resolved) => {
            const newText = resolverData.before + resolved + resolverData.after;
            dispatch({ type: "SET_EDITOR_TEXT", text: newText });
            dispatch({ type: "ADD_RECENT_INSERT", snippetId: resolverData.snippetId });
            setResolverData(null);
          }}
          onCancel={() => setResolverData(null)}
        />
      )}
    </div>
  );
}
