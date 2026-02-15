export type TopicId = "sore-throat" | "uti" | "low-back-pain" | string;

export interface TopicV1 {
  version: "1.0";
  metadata: {
    id: TopicId;
    slug: string;
    displayName: string;
    specialty: string;
    triggers: string[];
  };
  snippets: TopicSnippet[];
  reasoning: {
    discriminators: string[];
    mustNotMiss: string[];
    redFlags: string[];
    references: { label: string; url: string }[];
  };
  structuredFields: StructuredSection[];
  outputTemplate: OutputTemplate;
}

export interface TopicSnippet {
  id: string;
  trigger: string;
  label: string;
  category: string;
  content: string;
  tags?: string[];
}

export interface StructuredSection {
  id: string;
  title: string;
  fields: StructuredField[];
}

export type FieldType = "text" | "textarea" | "number" | "select" | "multi" | "toggle" | "date";

export interface StructuredField {
  id: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
  hint?: string;
  showIf?: string;
  required?: boolean;
}

export interface OutputTemplate {
  sections: OutputSection[];
}

export interface OutputSection {
  id: string;
  title: string;
  source: "editor" | "structured" | "reasoning";
  structuredSectionId?: string;
  includeByDefault: boolean;
}
