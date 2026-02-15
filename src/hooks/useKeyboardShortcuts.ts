import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onCommandPalette: () => void;
  onCopyExport: () => void;
  onFocusEditor: () => void;
  onFocusStructured: () => void;
  onShowShortcuts: () => void;
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
      }
    },
    [handlers]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
