import { useEffect, useMemo, useState } from "react";
import type { UnresolvedToken } from "@/lib/tokenParser";
import { applyResolutions } from "@/lib/tokenParser";
import type { TokenFieldModel } from "@/lib/tokenFieldUi";
import { buildTokenFieldModels } from "@/lib/tokenFieldUi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TokenResolverModalProps {
  text: string;
  tokens: UnresolvedToken[];
  onResolve: (resolvedText: string) => void;
  onCancel: () => void;
}

export function TokenResolverModal({ text, tokens, onResolve, onCancel }: TokenResolverModalProps) {
  const fieldModels = useMemo(() => buildTokenFieldModels(text, tokens), [text, tokens]);
  const complexForm = fieldModels.length >= 8;
  const [showAllFields, setShowAllFields] = useState(!complexForm);
  const [values, setValues] = useState<Map<string, string | string[]>>(new Map());

  useEffect(() => {
    const next = new Map<string, string | string[]>();
    for (const field of fieldModels) {
      if (field.control === "text") {
        next.set(field.raw, "");
        continue;
      }
      if (field.control === "checkboxes") {
        next.set(field.raw, field.defaultValue ? [field.defaultValue] : []);
      } else {
        next.set(field.raw, field.defaultValue);
      }
    }
    setValues(next);
    setShowAllFields(!complexForm);
  }, [fieldModels, complexForm]);

  const handleSubmit = () => {
    onResolve(applyResolutions(text, buildResolutionMap(fieldModels, values)));
  };

  const handleInsertWithDefaults = () => {
    const defaults = new Map<string, string>();
    for (const field of fieldModels) {
      if (field.control === "text") {
        defaults.set(field.raw, field.raw);
      } else {
        defaults.set(field.raw, field.defaultValue || "");
      }
    }
    onResolve(applyResolutions(text, defaults));
  };

  const handleInsertNormalFindings = () => {
    const defaults = new Map<string, string>();
    for (const field of fieldModels) {
      if (field.control === "text") {
        defaults.set(field.raw, field.raw);
      } else {
        defaults.set(field.raw, field.normalValue || field.defaultValue || "");
      }
    }
    onResolve(applyResolutions(text, defaults));
  };

  return (
    <Dialog open onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-base">Resolve template fields</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {complexForm && !showAllFields ? (
            <div className="rounded-md border bg-muted/20 p-3 space-y-3">
              <div>
                <p className="text-sm font-medium">Quick options</p>
                <p className="text-xs text-muted-foreground">
                  Insert common normal findings, or open all fields to customize.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleInsertNormalFindings}>
                  Insert normal findings
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowAllFields(true)}>
                  Show all fields...
                </Button>
              </div>
            </div>
          ) : (
            fieldModels.map((field) => (
              <TokenFieldControlView
                key={field.key}
                field={field}
                value={values.get(field.raw)}
                bordered={fieldModels.length > 3}
                onChange={(nextValue) => {
                  const next = new Map(values);
                  next.set(field.raw, nextValue);
                  setValues(next);
                }}
              />
            ))
          )}
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

function buildResolutionMap(
  models: TokenFieldModel[],
  values: Map<string, string | string[]>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const field of models) {
    if (field.control === "text") {
      const rawValue = values.get(field.raw);
      map.set(field.raw, typeof rawValue === "string" ? rawValue : "");
      continue;
    }
    const rawValue = values.get(field.raw);
    if (Array.isArray(rawValue)) {
      map.set(field.raw, rawValue.join(", "));
    } else {
      map.set(field.raw, rawValue ?? "");
    }
  }
  return map;
}

interface TokenFieldControlViewProps {
  field: TokenFieldModel;
  value: string | string[] | undefined;
  bordered: boolean;
  onChange: (value: string | string[]) => void;
}

function TokenFieldControlView({ field, value, bordered, onChange }: TokenFieldControlViewProps) {
  const fieldId = `token-field-${field.key}`;
  if (field.control === "text") {
    return (
      <div className={cn("space-y-2", bordered && "rounded-md border p-3")}>
        <label htmlFor={fieldId} className="text-[14px] font-medium text-foreground">
          {field.label}
        </label>
        <input
          id={fieldId}
          type="text"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="w-full h-9 px-3 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
    );
  }

  if (field.control === "checkboxes") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className={cn("space-y-2", bordered && "rounded-md border p-3")}>
        <legend className="text-[14px] font-medium text-foreground">{field.label}</legend>
        <div className="space-y-1.5">
          {field.options.map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selected, option.value]);
                  } else {
                    onChange(selected.filter((item) => item !== option.value));
                  }
                }}
                className="h-4 w-4 accent-primary"
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  return (
    <fieldset className={cn("space-y-2", bordered && "rounded-md border p-3")}>
      <legend className="text-[14px] font-medium text-foreground">{field.label}</legend>
      <div className="space-y-1.5">
        {field.options.map((option) => (
          <label key={option.value} className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={field.key}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="h-4 w-4 accent-primary"
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
