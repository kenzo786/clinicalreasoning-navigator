import { useState, useEffect } from "react";
import { loadTopic } from "@/lib/topicSchema";
import { useConsultation } from "@/context/ConsultationProvider";
import { parseTokens } from "@/lib/tokenParser";
import type { UnresolvedToken } from "@/lib/tokenParser";
import type { TopicRuntime, TopicSnippet } from "@/types/topic";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { TokenResolverModal } from "@/components/editor/TokenResolverModal";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  editorRef: { current: HTMLTextAreaElement | null };
  availableTopics: Array<{ id: string; displayName: string }>;
}

export function CommandPalette({
  open,
  onClose,
  editorRef,
  availableTopics,
}: CommandPaletteProps) {
  const { state, dispatch } = useConsultation();
  const [allTopics, setAllTopics] = useState<TopicRuntime[]>([]);
  const [resolverData, setResolverData] = useState<{
    text: string;
    tokens: UnresolvedToken[];
    snippetId: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      Promise.all(availableTopics.map((t) => loadTopic(t.id).catch(() => null))).then((topics) =>
        setAllTopics(topics.filter(Boolean) as TopicRuntime[])
      );
    }
  }, [open, availableTopics]);

  const handleSelect = (snippet: TopicSnippet) => {
    const { textWithDatesResolved, unresolvedTokens } = parseTokens(snippet.content);
    onClose();

    if (unresolvedTokens.length > 0) {
      setResolverData({ text: textWithDatesResolved, tokens: unresolvedTokens, snippetId: snippet.id });
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
      dispatch({ type: "SET_EDITOR_TEXT_WITH_HISTORY", text: before + text + after });
      dispatch({ type: "ADD_RECENT_INSERT", snippetId });
      setTimeout(() => {
        editor.focus();
        editor.setSelectionRange(start + text.length, start + text.length);
      }, 0);
    } else {
      dispatch({ type: "SET_EDITOR_TEXT_WITH_HISTORY", text: state.editorText + text });
      dispatch({ type: "ADD_RECENT_INSERT", snippetId });
    }
  };

  return (
    <>
      <CommandDialog open={open} onOpenChange={(v) => !v && onClose()}>
        <CommandInput placeholder="Search snippets across all topics..." />
        <CommandList>
          <CommandEmpty>No snippets found.</CommandEmpty>
          {allTopics.map((topic) => (
            <CommandGroup key={topic.metadata.id} heading={topic.metadata.displayName}>
              {topic.snippets.map((snippet) => (
                <CommandItem
                  key={snippet.id}
                  value={`${snippet.label} ${snippet.trigger} ${snippet.category}`}
                  onSelect={() => handleSelect(snippet)}
                >
                  <span className="flex-1">{snippet.label}</span>
                  <code className="text-xs text-muted-foreground ml-2">/{snippet.trigger}</code>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>

      {resolverData && (
        <TokenResolverModal
          text={resolverData.text}
          tokens={resolverData.tokens}
          onResolve={(resolved) => {
            insertText(resolved, resolverData.snippetId);
            setResolverData(null);
          }}
          onCancel={() => setResolverData(null)}
        />
      )}
    </>
  );
}

