import type { StructuredField } from "@/types/topic";
import { ChevronDown } from "lucide-react";

interface DynamicFieldProps {
  field: StructuredField;
  value: string | number | boolean | string[] | undefined;
  onChange: (val: string | number | boolean | string[]) => void;
  compact?: boolean;
}

export function DynamicField({ field, value, onChange, compact = false }: DynamicFieldProps) {
  const options = field.options ?? [];
  const lowerOptions = options.map((o) => o.toLowerCase());
  const yesNoMode =
    field.type === "select" &&
    options.length > 0 &&
    lowerOptions.every((o) => ["yes", "no", "unknown", "n/a", "na"].includes(o));

  const labelEl = (
    <label className="text-xs font-medium text-foreground">
      {field.label}
      {field.required && <span className="text-destructive ml-0.5">*</span>}
    </label>
  );

  switch (field.type) {
    case "text":
      return (
        <div className="space-y-1">
          {labelEl}
          <input
            type="text"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className="w-full h-7 px-2 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-1">
          {labelEl}
          <textarea
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            rows={compact ? 1 : 2}
            className="w-full px-2 py-1 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground resize-y"
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-1">
          {labelEl}
          <input
            type="number"
            value={(value as number) ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : "")}
            placeholder={field.placeholder}
            className="w-full h-7 px-2 text-sm rounded border bg-background text-foreground placeholder:text-muted-foreground"
          />
        </div>
      );

    case "select":
      if (yesNoMode) {
        return (
          <div className="space-y-1">
            {labelEl}
            <div className="flex flex-wrap gap-1">
              {options.map((opt) => {
                const selected = (value as string) === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => onChange(opt)}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      selected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="relative">
            <select
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              className="w-full h-7 pl-2 pr-7 text-sm rounded border bg-background text-foreground appearance-none"
            >
              <option value="">Select…</option>
              {field.options?.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      );

    case "multi":
      return (
        <div className="space-y-1">
          {labelEl}
          <div className="flex flex-wrap gap-1">
            {field.options?.map((opt) => {
              const selected = Array.isArray(value) && value.includes(opt);
              return (
                <button
                  key={opt}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(
                      selected ? current.filter((v) => v !== opt) : [...current, opt]
                    );
                  }}
                  className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground hover:bg-accent"
                  }`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      );

    case "toggle":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="accent-primary"
          />
          <span className="text-xs font-medium text-foreground">{field.label}</span>
        </label>
      );

    case "date":
      return (
        <div className="space-y-1">
          {labelEl}
          <input
            type="date"
            value={(value as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-7 px-2 text-sm rounded border bg-background text-foreground"
          />
        </div>
      );

    default:
      return null;
  }
}
