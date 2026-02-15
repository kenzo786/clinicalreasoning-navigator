import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { keys: "Ctrl/⌘ + K", description: "Command palette" },
  { keys: "Ctrl/⌘ + S", description: "Copy/export note" },
  { keys: "Ctrl/⌘ + Z", description: "Undo" },
  { keys: "Ctrl/⌘ + Shift + Z", description: "Redo" },
  { keys: "Ctrl/⌘ + 1", description: "Focus editor" },
  { keys: "Ctrl/⌘ + 2", description: "Focus structured" },
  { keys: "/", description: "Trigger snippet insertion" },
  { keys: "?", description: "Show this help" },
];

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.description}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-muted rounded border">
                {s.keys}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
