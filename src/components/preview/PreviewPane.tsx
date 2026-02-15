import { useState, useMemo, useCallback } from "react";
import type { TopicRuntime } from "@/types/topic";
import { useConsultation } from "@/context/ConsultationProvider";
import { composeOutput, getComposedSections } from "@/lib/outputComposer";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, X, RotateCcw, Eye, EyeOff, ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PreviewPaneProps {
  topic: TopicRuntime;
  onClose: () => void;
  onInsertSection: (sectionId: string, content: string) => void;
  onAppendSection: (sectionId: string, content: string) => void;
}

function sourceLabel(source: string): string {
  if (source === "editor") return "editor";
  if (source === "structured") return "structured";
  if (source === "ddx") return "ddx";
  return "reasoning";
}

export function PreviewPane({ topic, onClose, onInsertSection, onAppendSection }: PreviewPaneProps) {
  const { state, dispatch } = useConsultation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const computedOutput = useMemo(() => composeOutput(topic, state), [topic, state]);
  const displayText = state.outputOverrideText ?? computedOutput;
  const isOverridden = state.outputOverrideText !== null;
  const composedSections = useMemo(() => getComposedSections(topic, state), [topic, state]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayText);
      setCopied(true);
      toast({ title: "Note copied to clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  }, [displayText, toast]);

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="flex items-center justify-between px-3 h-9 border-b shrink-0">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Output Preview
        </span>
        <div className="flex items-center gap-1">
          {isOverridden && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs gap-1"
              onClick={() => dispatch({ type: "SET_OUTPUT_OVERRIDE", text: null })}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 px-3 py-2 border-b bg-muted/30">
        {topic.outputTemplate.sections.map((section) => {
          const included = state.sectionInclusions[section.id] ?? section.includeByDefault;
          return (
            <button
              key={section.id}
              onClick={() => dispatch({ type: "TOGGLE_SECTION_INCLUSION", sectionId: section.id })}
              className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded border transition-colors ${
                included ? "bg-primary/10 text-primary border-primary/30" : "bg-secondary text-muted-foreground"
              }`}
            >
              {included ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {section.title}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-2 border-b bg-card space-y-2 max-h-52 overflow-y-auto">
        {composedSections
          .filter((s) => s.content.trim().length > 0)
          .map((section) => (
            <div key={section.id} className="border rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{section.title}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
                    {sourceLabel(section.source)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onInsertSection(section.id, `${section.title}\n${section.content}`)}
                    className="text-[10px] px-1.5 py-0.5 rounded border bg-secondary hover:bg-accent"
                  >
                    Insert
                  </button>
                  <button
                    onClick={() => onAppendSection(section.id, `${section.title}\n${section.content}`)}
                    className="text-[10px] px-1.5 py-0.5 rounded border bg-secondary hover:bg-accent"
                  >
                    Append
                  </button>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(section.content);
                      toast({ title: `${section.title} copied` });
                    }}
                    className="text-[10px] px-1.5 py-0.5 rounded border bg-secondary hover:bg-accent"
                  >
                    <ClipboardPlus className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        <textarea
          value={displayText}
          onChange={(e) => dispatch({ type: "SET_OUTPUT_OVERRIDE", text: e.target.value })}
          className="w-full h-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

