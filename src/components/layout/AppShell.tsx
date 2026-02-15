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
import { useState } from "react";
import { Stethoscope } from "lucide-react";

export default function AppShell() {
  const { state, dispatch } = useConsultation();
  const { topic, loading, error } = useTopicLoader(state.activeTopicId);
  const isMobile = useIsMobile();
  const [showPreview, setShowPreview] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const editorRef = { current: null as HTMLTextAreaElement | null };

  useKeyboardShortcuts({
    onCommandPalette: () => setShowPalette(true),
    onCopyExport: () => {/* handled in preview */},
    onFocusEditor: () => editorRef.current?.focus(),
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
          <span className="text-xs text-muted-foreground">v0.1</span>
        </div>
        <div className="flex items-center gap-2">
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
          <PreviewPane topic={topic} onClose={() => setShowPreview(false)} />
        ) : isMobile ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto">
              {activePane === "library" && <LibraryPane topic={topic} editorRef={editorRef} />}
              {activePane === "editor" && <EditorPane topic={topic} editorRef={editorRef} />}
              {activePane === "reasoning" && <RightPane topic={topic} />}
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
              <RightPane topic={topic} />
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
