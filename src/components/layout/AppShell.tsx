import { useConsultation } from "@/context/ConsultationProvider";
import { useTopicLoader } from "@/hooks/useTopicLoader";
import { useIsMobile } from "@/hooks/use-mobile";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { LibraryPane } from "@/components/library/LibraryPane";
import { EditorPane } from "@/components/editor/EditorPane";
import { RightPane } from "@/components/reasoning/RightPane";
import { PreviewPane } from "@/components/preview/PreviewPane";
import { RestoreModal } from "@/components/shared/RestoreModal";
import { ShortcutsModal } from "@/components/shared/ShortcutsModal";
import { CommandPalette } from "@/components/library/CommandPalette";
import { MobileNav } from "@/components/layout/MobileNav";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useCallback, useMemo, useRef, useState } from "react";
import { Stethoscope } from "lucide-react";
import {
  composeDDx,
  composeOutput,
  composeReasoningSummary,
  composeStructuredSection,
  getComposedSections,
} from "@/lib/outputComposer";
import { useToast } from "@/hooks/use-toast";
import {
  appendAnchored,
  getDetachedAnchorIds,
  insertAnchoredAtCursor,
  refreshAnchoredBlock,
} from "@/lib/editorBridge";

export default function AppShell() {
  const { state, dispatch } = useConsultation();
  const { topic, loading, error } = useTopicLoader(state.activeTopicId);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const rightPaneRef = useRef<HTMLDivElement | null>(null);
  const computedOutput = useMemo(() => (topic ? composeOutput(topic, state) : ""), [topic, state]);
  const composedSections = useMemo(() => (topic ? getComposedSections(topic, state) : []), [topic, state]);

  const updateEditorText = useCallback((text: string) => {
    dispatch({ type: "SET_EDITOR_TEXT", text });
    const detached = getDetachedAnchorIds(text, state.editorAnchors);
    for (const sectionId of detached) {
      dispatch({ type: "MARK_EDITOR_ANCHOR_DETACHED", sectionId });
    }
  }, [dispatch, state.editorAnchors]);

  const insertEditorSection = useCallback((sectionId: string, content: string, mode: "cursor" | "append" = "cursor") => {
    if (!content.trim()) return;
    const existingAnchor = state.editorAnchors[sectionId];
    if (existingAnchor && !existingAnchor.detached) {
      const refreshed = refreshAnchoredBlock(state.editorText, existingAnchor, content);
      dispatch({ type: "SET_EDITOR_ANCHOR", sectionId, anchor: refreshed.anchor });
      if (refreshed.updated) {
        updateEditorText(refreshed.nextText);
        return;
      }
    }

    const editor = editorRef.current;

    if (mode === "append" || !editor) {
      const { nextText, anchor } = appendAnchored(state.editorText, sectionId, content);
      updateEditorText(nextText);
      dispatch({ type: "SET_EDITOR_ANCHOR", sectionId, anchor });
      return;
    }

    const { nextText, nextCursor, anchor } = insertAnchoredAtCursor(
      state.editorText,
      sectionId,
      content,
      editor.selectionStart,
      editor.selectionEnd
    );
    updateEditorText(nextText);
    dispatch({ type: "SET_EDITOR_ANCHOR", sectionId, anchor });
    setTimeout(() => {
      editor.focus();
      editor.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  }, [state.editorText, state.editorAnchors, dispatch, updateEditorText]);

  const handleCopyExport = useCallback(async () => {
    const text = (state.outputOverrideText ?? computedOutput).trim();
    if (!text) {
      toast({ title: "Nothing to copy", description: "No note output to copy yet." });
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Output copied", description: "Final note copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Unable to copy output.", variant: "destructive" });
    }
  }, [computedOutput, state.outputOverrideText, toast]);

  const promoteToEditor = useCallback((title: string, text: string) => {
    if (!text.trim()) return;
    const sectionId = `promote-${title.toLowerCase().replace(/\s+/g, "-")}`;
    insertEditorSection(sectionId, `${title}\n${text}`, "cursor");
    toast({ title: "Inserted into editor", description: `${title} sent to note editor.` });
  }, [insertEditorSection, toast]);

  const refreshAnchorsFromState = useCallback(() => {
    if (!topic) return;
    let nextText = state.editorText;
    for (const section of composedSections) {
      const anchor = state.editorAnchors[section.id];
      if (!anchor) continue;
      const refreshed = refreshAnchoredBlock(nextText, anchor, section.content);
      nextText = refreshed.nextText;
      dispatch({ type: "SET_EDITOR_ANCHOR", sectionId: section.id, anchor: refreshed.anchor });
    }
    if (nextText !== state.editorText) {
      updateEditorText(nextText);
      toast({ title: "Anchors refreshed", description: "Editor sections synced from current state." });
    }
  }, [topic, composedSections, state.editorAnchors, state.editorText, dispatch, updateEditorText, toast]);

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
    if (!topic) return;

    if (state.uiPrefs.rightPaneTab === "structured") {
      const firstNonEmpty = topic.structuredFields
        .map((s) => ({ id: s.id, content: composeStructuredSection(topic, state, s.id), title: s.title }))
        .find((s) => s.content.trim().length > 0);
      if (!firstNonEmpty) {
        toast({ title: "No structured content", description: "Complete structured fields first." });
        return;
      }
      insertEditorSection(`structured-${firstNonEmpty.id}`, `${firstNonEmpty.title}\n${firstNonEmpty.content}`);
      return;
    }

    if (state.uiPrefs.rightPaneTab === "reason") {
      const reasonText = [composeDDx(state), composeReasoningSummary(topic, state)].filter(Boolean).join("\n\n");
      if (!reasonText.trim()) {
        toast({ title: "No reasoning content", description: "Add DDx or red-flag checks first." });
        return;
      }
      insertEditorSection("reason-assessment", `Assessment\n${reasonText}`);
      return;
    }

    const illness = topic.review.illnessScript.summary;
    if (!illness.trim()) {
      toast({ title: "No review content", description: "Nothing to insert from review." });
      return;
    }
    insertEditorSection("review-illness-script", `Illness Script\n${illness}`);
  }, [topic, state, toast, insertEditorSection]);

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
  });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground animate-pulse">Loading topic…</div>
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
      {/* Header */}
      <header className="flex items-center justify-between h-11 px-4 border-b bg-card shrink-0">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">CRx Navigator</span>
          <span className="text-xs text-muted-foreground">v0.2</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshAnchorsFromState}
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
            title="Refresh anchored editor sections from current state"
          >
            Refresh Anchors
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            {showPreview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-xs px-2 py-1 rounded border bg-secondary text-secondary-foreground hover:bg-accent transition-colors"
          >
            ?
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {showPreview ? (
          <PreviewPane
            topic={topic}
            onClose={() => setShowPreview(false)}
            onInsertSection={(sectionId, content) => insertEditorSection(sectionId, content, "cursor")}
            onAppendSection={(sectionId, content) => insertEditorSection(sectionId, content, "append")}
          />
        ) : isMobile ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              {activePane === "library" && <LibraryPane topic={topic} editorRef={editorRef} />}
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
              <LibraryPane topic={topic} editorRef={editorRef} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={state.uiPrefs.desktopPaneSizes[1]}
              minSize={30}
            >
              <EditorPane topic={topic} editorRef={editorRef} />
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              defaultSize={state.uiPrefs.desktopPaneSizes[2]}
              minSize={20}
            >
              <div ref={rightPaneRef} className="h-full">
                <RightPane topic={topic} onPromoteToEditor={promoteToEditor} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      <RestoreModal />
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <CommandPalette
        open={showPalette}
        onClose={() => setShowPalette(false)}
        editorRef={editorRef}
      />
    </div>
  );
}
