import { useState, useMemo, useCallback } from "react";
import type { TopicRuntime } from "@/types/topic";
import type { ExportFormat } from "@/types/export";
import { useConsultation } from "@/context/ConsultationProvider";
import { buildComposerSections, getComposerLinkStatePresentation } from "@/lib/composer";
import { buildExportForFormat } from "@/lib/exportFormats";
import { useToast } from "@/hooks/use-toast";
import { trackTelemetry } from "@/lib/telemetry";
import {
  Copy,
  Check,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  ClipboardPlus,
  Download,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

function toneClass(tone: string): string {
  if (tone === "success") return "bg-emerald-100 text-emerald-700 border-emerald-300";
  if (tone === "warning") return "bg-amber-100 text-amber-700 border-amber-300";
  if (tone === "danger") return "bg-red-100 text-red-700 border-red-300";
  return "bg-secondary text-muted-foreground";
}

export function PreviewPane({ topic, onClose, onInsertSection, onAppendSection }: PreviewPaneProps) {
  const { state, dispatch } = useConsultation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("raw");

  const rawOutput = useMemo(() => buildExportForFormat("raw", topic, state), [topic, state]);
  const formattedOutput = useMemo(
    () => buildExportForFormat(exportFormat, topic, state),
    [exportFormat, topic, state]
  );
  const isRawFormat = exportFormat === "raw";
  const displayText = isRawFormat
    ? state.exportDraft.isDerived
      ? rawOutput
      : state.exportDraft.text
    : formattedOutput;
  const isOverridden = isRawFormat && !state.exportDraft.isDerived;
  const composedSections = useMemo(() => buildComposerSections(topic, state), [topic, state]);

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

  const handleDownload = useCallback(() => {
    const fileText = displayText.trim();
    if (!fileText) {
      toast({ title: "Nothing to download", description: "No output text available." });
      return;
    }
    const datePart = new Date().toISOString().slice(0, 10);
    const fileName = `clinical_note_${exportFormat}_${datePart}.txt`;
    const byteSize = new TextEncoder().encode(fileText).length;
    const kbSize = (byteSize / 1024).toFixed(1);
    const blob = new Blob([fileText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast({
      title: "Downloaded",
      description: `${fileName} (${kbSize} KB)`,
    });
    trackTelemetry(
      "export_download_triggered",
      {
        format: exportFormat,
        size_bytes: byteSize,
      },
      { enabled: state.uiPrefs.telemetryEnabled }
    );
  }, [displayText, exportFormat, state.uiPrefs.telemetryEnabled, toast]);

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
              onClick={() => dispatch({ type: "SET_EXPORT_DRAFT", text: null })}
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleCopy}>
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleDownload}>
            <Download className="h-3 w-3" />
            Download
          </Button>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/20">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Format</label>
        <select
          aria-label="Format"
          value={exportFormat}
          onChange={(e) => {
            const next = e.target.value as ExportFormat;
            setExportFormat(next);
            trackTelemetry(
              "export_format_selected",
              { format: next },
              { enabled: state.uiPrefs.telemetryEnabled }
            );
          }}
          className="h-7 rounded border bg-background px-2 text-xs"
        >
          <option value="raw">Raw</option>
          <option value="soap">SOAP</option>
          <option value="sbar">SBAR</option>
        </select>
      </div>

      <div className="px-3 py-2 border-b bg-muted/30">
        <div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
          Include in export
          <Popover>
            <PopoverTrigger asChild>
              <button className="rounded border bg-secondary px-1 py-0.5 text-[10px]">
                <Info className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-2 text-xs">
              <p className="font-semibold">Link state legend</p>
              <ul className="mt-1 space-y-1 text-muted-foreground">
                <li>Not inserted: section has not been inserted into editor.</li>
                <li>Linked: inserted section is still linked and refreshable.</li>
                <li>Modified after insert: clinician edited linked block manually.</li>
                <li>Link missing: linked markers are not found in editor text.</li>
              </ul>
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-1">
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
      </div>

      <div className="px-3 py-2 border-b bg-card space-y-2 max-h-52 overflow-y-auto">
        {composedSections
          .filter((s) => s.content.trim().length > 0)
          .map((section) => {
            const presentation = getComposerLinkStatePresentation(section.linkState);
            return (
              <div key={section.id} className="border rounded p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{section.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted text-muted-foreground">
                      {sourceLabel(section.source)}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${toneClass(presentation.tone)}`}>
                      {presentation.label}
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
            );
          })}
      </div>

      <div className="flex-1 overflow-y-auto">
        <textarea
          value={displayText}
          onChange={(e) => {
            if (!isRawFormat) return;
            dispatch({ type: "SET_EXPORT_DRAFT", text: e.target.value });
          }}
          readOnly={!isRawFormat}
          className="w-full h-full resize-none border-0 bg-transparent p-4 font-mono text-sm leading-relaxed text-foreground focus:outline-none"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
