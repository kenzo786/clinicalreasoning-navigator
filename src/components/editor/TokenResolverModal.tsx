import { useState } from "react";
import type { UnresolvedToken } from "@/lib/tokenParser";
import { applyResolutions } from "@/lib/tokenParser";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TokenResolverModalProps {
  text: string;
  tokens: UnresolvedToken[];
  onResolve: (resolvedText: string) => void;
  onCancel: () => void;
}

export function TokenResolverModal({ text, tokens, onResolve, onCancel }: TokenResolverModalProps) {
  const [values, setValues] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>();
    for (const t of tokens) {
      if (t.type === "choice") {
        m.set(t.raw, t.options[t.defaultIndex] ?? t.options[0]);
      } else {
        m.set(t.raw, "");
      }
    }
    return m;
  });

  const handleSubmit = () => {
    onResolve(applyResolutions(text, values));
  };

  const handleInsertWithDefaults = () => {
    const defaults = new Map<string, string>();
    for (const token of tokens) {
      if (token.type === "choice") {
        defaults.set(token.raw, token.options[token.defaultIndex] ?? token.options[0] ?? "");
      } else {
        defaults.set(token.raw, token.raw);
      }
    }
    onResolve(applyResolutions(text, defaults));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Resolve template fields</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto">
          {tokens.map((token, i) => (
            <div key={`${token.raw}-${i}`} className="space-y-1">
              {token.type === "choice" ? (
                <>
                  <label className="text-xs font-medium text-muted-foreground">
                    Choose: {token.raw}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {token.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          const next = new Map(values);
                          next.set(token.raw, opt);
                          setValues(next);
                        }}
                        className={`px-2 py-1 text-xs rounded border transition-colors ${
                          values.get(token.raw) === opt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-secondary text-secondary-foreground hover:bg-accent"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label className="text-xs font-medium text-muted-foreground">
                    {token.name}
                  </label>
                  <input
                    type="text"
                    value={values.get(token.raw) ?? ""}
                    onChange={(e) => {
                      const next = new Map(values);
                      next.set(token.raw, e.target.value);
                      setValues(next);
                    }}
                    placeholder={`Enter ${token.name}`}
                    className="w-full h-8 px-2 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground"
                  />
                </>
              )}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="outline" size="sm" onClick={handleInsertWithDefaults}>
            Insert with defaults
          </Button>
          <Button size="sm" onClick={handleSubmit}>
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
