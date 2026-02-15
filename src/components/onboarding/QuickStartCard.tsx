import { X } from "lucide-react";

interface QuickStartCardProps {
  onDismiss: () => void;
}

const STEPS = [
  "Select the consultation topic in Library.",
  "Write free text and use /snippets to draft quickly.",
  "Review red flags and build your differential.",
  "Insert selected sections into the editor non-destructively.",
  "Copy or download final output in your preferred format.",
];

export function QuickStartCard({ onDismiss }: QuickStartCardProps) {
  return (
    <div className="border-b bg-primary/5">
      <div className="mx-auto max-w-[1400px] px-4 py-3">
        <div className="rounded-md border border-primary/20 bg-card p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary">
                Quick Start: 10-minute consultation flow
              </p>
              <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                {STEPS.map((step, index) => (
                  <li key={step}>
                    {index + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
            <button
              onClick={onDismiss}
              className="rounded border bg-secondary px-2 py-1 text-xs hover:bg-accent"
              aria-label="Dismiss quick start"
            >
              <span className="inline-flex items-center gap-1">
                Dismiss
                <X className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
