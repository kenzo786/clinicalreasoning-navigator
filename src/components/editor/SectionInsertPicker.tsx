import { useEffect, useMemo, useState } from "react";
import type { ComposerSection } from "@/types/composer";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SectionInsertPickerProps {
  open: boolean;
  onClose: () => void;
  sections: ComposerSection[];
  onInsert: (section: ComposerSection) => void;
  onAppend: (section: ComposerSection) => void;
}

export function SectionInsertPicker({
  open,
  onClose,
  sections,
  onInsert,
  onAppend,
}: SectionInsertPickerProps) {
  const available = useMemo(
    () => sections.filter((s) => s.content.trim().length > 0),
    [sections]
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (available.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((v) => (v + 1) % available.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((v) => (v - 1 + available.length) % available.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const current = available[activeIndex];
        if (!current) return;
        if (e.shiftKey) onAppend(current);
        else onInsert(current);
        onClose();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, available, activeIndex, onInsert, onAppend, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Insert Composer Section</DialogTitle>
          <DialogDescription>
            Arrow keys to select. Enter inserts at cursor. Shift+Enter appends.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {available.map((section, i) => (
            <button
              key={section.id}
              onClick={() => {
                onInsert(section);
                onClose();
              }}
              className={`w-full p-2 rounded border text-left ${
                i === activeIndex
                  ? "border-primary bg-primary/10"
                  : "bg-card hover:bg-accent"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{section.title}</span>
                <span className="text-[10px] text-muted-foreground">{section.source}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {section.content.replace(/\n/g, " ").trim()}
              </p>
            </button>
          ))}
          {available.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No non-empty sections to insert.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
