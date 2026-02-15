import type { ReactNode } from "react";
import type { JitlConfig, JitlContextType } from "@/types/topic";
import { getJitlTermConfig } from "@/lib/jitl";

interface JitlTermProps {
  term: string;
  config: JitlConfig;
  defaultContextType?: JitlContextType;
  onOpen: (term: string, contextType: JitlContextType) => void;
  children?: ReactNode;
}

export function JitlTerm({
  term,
  config,
  defaultContextType = "title",
  onOpen,
  children,
}: JitlTermProps) {
  const map = getJitlTermConfig(config, term);
  const contextType = map?.contextType ?? defaultContextType;
  const style = map?.style ?? "underline";

  const label = (
    <button
      type="button"
      onClick={() => onOpen(term, contextType)}
      className={style === "underline" || style === "both"
        ? "underline decoration-dotted underline-offset-4 hover:text-primary"
        : "hover:text-primary"}
    >
      {children ?? term}
    </button>
  );

  if (style === "chip" || style === "both") {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{children ?? term}</span>
        <button
          type="button"
          onClick={() => onOpen(term, contextType)}
          className="text-[10px] px-1.5 py-0.5 rounded border bg-secondary hover:bg-accent"
        >
          JITL
        </button>
      </span>
    );
  }

  return label;
}

