import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onCommandPalette: () => void;
  onCopyExport: () => void;
  onFocusEditor: () => void;
  onFocusStructured: () => void;
  onFocusDdx: () => void;
  onInsertRightSection: () => void;
  onShowShortcuts: () => void;
  onUndoEditor: () => void;
  onRedoEditor: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;

      // ? for shortcuts help (not in input/textarea)
      if (e.key === "?" && !mod && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        handlers.onShowShortcuts();
        return;
      }

      if (!mod) return;

      switch (e.key.toLowerCase()) {
        case "k":
          e.preventDefault();
          handlers.onCommandPalette();
          break;
        case "s":
          e.preventDefault();
          handlers.onCopyExport();
          break;
        case "1":
          e.preventDefault();
          handlers.onFocusEditor();
          break;
        case "2":
          e.preventDefault();
          handlers.onFocusStructured();
          break;
        case "3":
          e.preventDefault();
          handlers.onFocusDdx();
          break;
        case "i":
          if (e.shiftKey) {
            e.preventDefault();
            handlers.onInsertRightSection();
          }
          break;
        case "z": {
          const target = e.target;
          const isEditorTextArea =
            target instanceof HTMLTextAreaElement &&
            target.dataset.crxEditor === "true";
          if (!isEditorTextArea) break;
          e.preventDefault();
          if (e.shiftKey) handlers.onRedoEditor();
          else handlers.onUndoEditor();
          break;
        }
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
