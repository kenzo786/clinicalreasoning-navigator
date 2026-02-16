import { useConsultation } from "@/context/ConsultationProvider";
import { useTopicLoader } from "@/hooks/useTopicLoader";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { LibraryPane } from "@/components/library/LibraryPane";
import { EditorPane } from "@/components/editor/EditorPane";
import { RightPane } from "@/components/reasoning/RightPane";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { ShortcutsModal } from "@/components/shared/ShortcutsModal";
import { CommandPalette } from "@/components/library/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCallback, useMemo, useRef, useState } from "react";
import { Stethoscope } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getDetachedAnchorIds, refreshAnchoredBlock } from "@/lib/editorBridge";
import { upsertLinkedSection } from "@/lib/insertionService";
import { buildComposerSections, buildExportText } from "@/lib/composer";
import { SectionInsertPicker } from "@/components/editor/SectionInsertPicker";
import { QuickStartCard } from "@/components/onboarding/QuickStartCard";

export default function AppShell() {
  const { state, dispatch } = useConsultation();
  const { topic, loading, error, availableTopics } = useTopicLoader(state.activeTopicId);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [showInsertPicker, setShowInsertPicker] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const composedSections = useMemo(
    () => (topic ? buildComposerSections(topic, state) : []),
    [topic, state]
  );
  const exportText = useMemo(
    () => (topic ? buildExportText(topic, state) : ""),
    [topic, state]
  );
  const hasLinkedSections = Object.keys(state.editorAnchors).length > 0;

  const updateEditorText = useCallback(
    (text: string) => {
      dispatch({ type: "SET_EDITOR_TEXT_WITH_HISTORY", text });
      const detached = getDetachedAnchorIds(text, state.editorAnchors);
      for (const sectionId of detached) {
        dispatch({ type: "MARK_EDITOR_ANCHOR_DETACHED", sectionId });
      }
    },
    [dispatch, state.editorAnchors]
  );

  const insertComposerSection = useCallback(
    (
      sectionId: string,
      title: string,
      source: string,
      content: string,
      mode: "cursor" | "append" = "cursor"
    ) => {
      const editor = editorRef.current;
      const result = upsertLinkedSection(
        state,
        {
          sectionId,
          sectionTitle: title,
          source,
          content,
          mode,
        },
        editor
          ? {
              start: editor.selectionStart,
              end: editor.selectionEnd,
            }
          : undefined
      );
      if (!result) return;

      updateEditorText(result.nextText);
      dispatch({ type: "SET_EDITOR_ANCHOR", sectionId, anchor: result.anchor });
      if (editor && result.nextCursor !== null) {
        setTimeout(() => {
          editor.focus();
          editor.setSelectionRange(result.nextCursor, result.nextCursor);
        }, 0);
      }
    },
    [dispatch, state, updateEditorText]
  );

  const handleCopyExport = useCallback(async () => {
    const text = exportText.trim();
    if (!text) {
      toast({ title: "Nothing to copy", description: "No note output to copy yet." });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Output copied", description: "Final note copied to clipboard." });
    } catch {
      toast({
        title: "Copy failed",
        description: "Unable to copy output.",
        variant: "destructive",
      });
    }
  }, [exportText, toast]);

  const promoteToEditor = useCallback(
    (title: string, text: string) => {
      if (!text.trim()) return;
      const sectionId = `promote-${title.toLowerCase().replace(/\s+/g, "-")}`;
      insertComposerSection(sectionId, title, "review", `${title}\n${text}`, "cursor");
      dispatch({
        type: "SET_REVIEW_ITEM_STATUS",
        id: title.toLowerCase().replace(/\s+/g, "-"),
        source: "management",
        status: "inserted",
      });
      toast({ title: "Inserted into editor", description: `${title} sent to note editor.` });
    },
    [insertComposerSection, dispatch, toast]
  );

  const refreshAnchorsFromState = useCallback(() => {
    if (!topic) return;
    if (!hasLinkedSections) {
      toast({
        title: "No inserted sections",
        description: "Insert a composer section into the editor before running sync.",
      });
      return;
    }
    const counts = {
      updated: 0,
      unchanged: 0,
      detached: 0,
      missing: 0,
      notLinked: 0,
    };
    let nextText = state.editorText;
    counts.notLinked = composedSections.filter((section) => !state.editorAnchors[section.id]).length;
    for (const section of composedSections) {
      const anchor = state.editorAnchors[section.id];
      if (!anchor) continue;
      if (anchor.detached) {
        counts.detached += 1;
        continue;
      }
      const hadStart = nextText.includes(anchor.startTag);
      const hadEnd = nextText.includes(anchor.endTag);
      const refreshed = refreshAnchoredBlock(nextText, anchor, section.content);
      if (refreshed.updated) {
        if (refreshed.nextText === nextText) counts.unchanged += 1;
        else {
          counts.updated += 1;
          nextText = refreshed.nextText;
        }
      } else if (!hadStart || !hadEnd) {
        counts.missing += 1;
      } else {
        counts.detached += 1;
      }
      dispatch({ type: "SET_EDITOR_ANCHOR", sectionId: section.id, anchor: refreshed.anchor });
    }
    if (nextText !== state.editorText) {
      updateEditorText(nextText);
    }
    toast({
      title: "Section sync complete",
      description: `Updated ${counts.updated}, unchanged ${counts.unchanged}, detached ${counts.detached}, missing ${counts.missing}, not linked ${counts.notLinked}.`,
    });
  }, [
    topic,
    composedSections,
    state.editorAnchors,
    state.editorText,
    dispatch,
    updateEditorText,
    toast,
    hasLinkedSections,
  ]);

  const focusStructured = useCallback(() => {
    dispatch({ type: "SET_UI_PREF", key: "rightPaneTab", value: "structured" });
    if (isMobile) {
      dispatch({ type: "SET_UI_PREF", key: "mobileActivePane", value: "reasoning" });
    }
    setTimeout(() => {
      const container = rightPaneRef.current;
      if (!container) return;
      const el =
        container.querySelector("input, textarea, select") ??
        container.querySelector("button");
      if (el instanceof HTMLElement) el.focus();
    }, 0);
  }, [dispatch, isMobile]);

  const focusReason = useCallback(() => {
    dispatch({ type: "SET_UI_PREF", key: "rightPaneTab", value: "reason" });
    if (isMobile) {
      dispatch({ type: "SET_UI_PREF", key: "mobileActivePane", value: "reasoning" });
    }
    setTimeout(() => {
      const container = rightPaneRef.current;
      if (!container) return;
      const el =
        container.querySelector("input, textarea, select") ??
        container.querySelector("button");
      if (el instanceof HTMLElement) el.focus();
    }, 0);
  }, [dispatch, isMobile]);

  const insertCurrentRightSection = useCallback(() => {
    setShowInsertPicker(true);
  }, []);

  useKeyboardShortcuts({
    onCommandPalette: () => setShowPalette(true),
    onCopyExport: handleCopyExport,
    onFocusEditor: () => {
      if (isMobile) {
        dispatch({ type: "SET_UI_PREF", key: "mobileActivePane", value: "editor" });
      }
      setTimeout(() => editorRef.current?.focus(), 0);
    },
    onFocusStructured: focusStructured,
    onFocusDdx: focusReason,
    onInsertRightSection: insertCurrentRightSection,
    onShowShortcuts: () => setShowShortcuts(true),
    onUndoEditor: () => dispatch({ type: "UNDO_EDITOR_TEXT" }),
    onRedoEditor: () => dispatch({ type: "REDO_EDITOR_TEXT" }),
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading topic...</div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-2">
          <p className="text-destructive font-medium">Failed to load topic</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const activePane = state.uiPrefs.mobileActivePane;

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      <header className="flex items-center justify-between h-11 px-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">CRx Navigator</span>
          <span className="text-xs text-muted-foreground">v1.0-pilot</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAnchorsFromState}
            disabled={!hasLinkedSections}
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              hasLinkedSections
                ? "Sync inserted sections from the right pane. Manually edited blocks stay untouched."
                : "Insert a section into the editor to enable sync."
            }
          >
            Sync Inserted Sections
          </button>
          <button
            onClick={() =>
              dispatch({
                type: "SET_UI_PREF",
                key: "composerTrayCollapsed",
                value: !state.uiPrefs.composerTrayCollapsed,
              })
            }
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            {state.uiPrefs.composerTrayCollapsed ? "Show Composer" : "Hide Composer"}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            ?
          </button>
        </div>
      </header>
      {!state.uiPrefs.onboardingDismissed && (
        <QuickStartCard
          onDismiss={() =>
            dispatch({
              type: "SET_UI_PREF",
              key: "onboardingDismissed",
              value: true,
            })
          }
        />
      )}

      <div className="flex-1 overflow-hidden">
        {isMobile ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              {activePane === "library" && (
                <LibraryPane
                  topic={topic}
                  editorRef={editorRef}
                  availableTopics={availableTopics}
                />
              )}
              {activePane === "editor" && <EditorPane topic={topic} editorRef={editorRef} />}
              {activePane === "reasoning" && (
                <div ref={rightPaneRef} className="h-full">
                  <RightPane topic={topic} onPromoteToEditor={promoteToEditor} />
                </div>
              )}
            </div>
            <MobileNav />
          </div>
        ) : (
          <ResizablePanelGroup
            direction="horizontal"
            className="h-full"
            onLayout={(sizes: number[]) => {
              if (sizes.length === 3) {
                dispatch({
                  type: "SET_PANE_SIZES",
                  sizes: sizes as [number, number, number],
                });
              }
            }}
          >
            <ResizablePanel
              defaultSize={state.uiPrefs.desktopPaneSizes[0]}
              minSize={15}
              maxSize={30}
            >
              <LibraryPane
                topic={topic}
                editorRef={editorRef}
                availableTopics={availableTopics}
              />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={state.uiPrefs.desktopPaneSizes[1]} minSize={30}>
              <div className="h-full flex flex-col">
                <div className="flex-1 min-h-0">
                  <EditorPane topic={topic} editorRef={editorRef} />
                </div>
                {!state.uiPrefs.composerTrayCollapsed && (
                  <div className="h-[38%] min-h-[220px] border-t">
                    <PreviewPane
                      topic={topic}
                      onClose={() =>
                        dispatch({
                          type: "SET_UI_PREF",
                          key: "composerTrayCollapsed",
                          value: true,
                        })
                      }
                      onInsertSection={(sectionId, content) => {
                        const title = content.split("\n")[0] || sectionId;
                        insertComposerSection(sectionId, title, "composer", content, "cursor");
                      }}
                      onAppendSection={(sectionId, content) => {
                        const title = content.split("\n")[0] || sectionId;
                        insertComposerSection(sectionId, title, "composer", content, "append");
                      }}
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={state.uiPrefs.desktopPaneSizes[2]} minSize={20}>
              <div ref={rightPaneRef} className="h-full">
                <RightPane topic={topic} onPromoteToEditor={promoteToEditor} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        editorRef={editorRef}
        availableTopics={availableTopics}
      />
      <SectionInsertPicker
        open={showInsertPicker}
        onClose={() => setShowInsertPicker(false)}
        sections={composedSections}
        onInsert={(section) =>
          insertComposerSection(
            section.id,
            section.title,
            section.source,
            `${section.title}\n${section.content}`,
            "cursor"
          )
        }
        onAppend={(section) =>
          insertComposerSection(
            section.id,
            section.title,
            section.source,
            `${section.title}\n${section.content}`,
            "append"
          )
        }
      />
    </div>
  );
}
