export type TopicId = "sore-throat" | "uti" | "low-back-pain" | string;

export interface TopicMetadata {
  id: TopicId;
  slug: string;
  displayName: string;
  specialty: string;
  triggers: string[];
}

export interface TopicReasoning {
  discriminators: string[];
  mustNotMiss: string[];
  redFlags: string[];
  references: { label: string; url: string }[];
}

export interface Diagnosis {
  name: string;
  likelihood?: string;
  keyFeatures?: string[];
  infoPostId?: number;
}

export interface MustNotMissItem {
  condition: string;
  redFlags: string[];
  whyDangerous: string;
  escalationConcern: string;
}

export type HistoryPromptMode = "text" | "yesNo" | "yesNoNa" | "number";

export interface HistoryPromptItem {
  id: string;
  label: string;
  mode: HistoryPromptMode;
  hint?: string;
  placeholder?: string;
  includeIfNegative?: boolean;
}

export interface HistoryPromptGroup {
  category: string;
  prompts: HistoryPromptItem[];
}

export interface ExamPromptItem {
  id: string;
  label: string;
  significance: string;
  hint?: string;
  documentIfNormal?: boolean;
}

export interface ExamSection {
  id: string;
  title: string;
  prompts: ExamPromptItem[];
}

export interface InvestigationItem {
  test: string;
  rationale: string;
}

export interface Investigations {
  whenHelpful: InvestigationItem[];
  whenNotNeeded: InvestigationItem[];
  limitations: string[];
}

export interface PharmacologicalConcept {
  concept: string;
  considerations: string;
}

export interface ManagementConsiderations {
  selfCare: string[];
  pharmacologicalConcepts: PharmacologicalConcept[];
  delayedStrategies: string[];
  followUpLogic: string[];
}

export interface SafetyNetting {
  returnAdvice: string[];
  escalationTriggers: string[];
}

export interface ReviewContent {
  illnessScript: { summary: string };
  mustNotMiss: MustNotMissItem[];
  discriminators: Array<{ question: string; reasoning: string; clinicalValue: string }>;
  historyPrompts: HistoryPromptGroup[];
  examSections: ExamSection[];
  diagnoses: { common: Diagnosis[]; mustNotMiss: Diagnosis[]; oftenMissed: Diagnosis[] };
  investigations: Investigations;
  managementConsiderations: ManagementConsiderations;
  safetyNetting: SafetyNetting;
  mindset?: string;
}

export type JitlStyle = "underline" | "chip" | "both";
export type JitlContextType =
  | "title"
  | "clinical"
  | "ddx"
  | "pathophysiology"
  | "pharmacology"
  | "management"
  | "prescribing"
  | "investigation";

export interface JitlTermMap {
  term: string;
  style?: JitlStyle;
  contextType?: JitlContextType;
  aliases?: string[];
}

export interface JitlConfig {
  termMap: JitlTermMap[];
  linkProviders: Array<{ label: string; hrefTemplate: string; row: number }>;
}

export interface DdxConfig {
  evidencePrompts: string[];
  compareEnabled: boolean;
}

export interface TopicV1 {
  version: "1.0";
  metadata: TopicMetadata;
  snippets: TopicSnippet[];
  reasoning: TopicReasoning;
  structuredFields: StructuredSection[];
  outputTemplate: OutputTemplate;
}

export interface TopicV2 {
  version: "2.0";
  metadata: TopicMetadata;
  snippets: TopicSnippet[];
  reasoning: TopicReasoning;
  structuredFields: StructuredSection[];
  outputTemplate: OutputTemplate;
  review: ReviewContent;
  jitl?: {
    termMap?: JitlTermMap[];
    linkProviders?: Array<{ label: string; hrefTemplate: string; row: number }>;
  };
  ddx?: {
    evidencePrompts?: string[];
    compareEnabled?: boolean;
  };
}

export interface TopicQaMeta {
  status: "approved" | "draft" | "deprecated";
  clinicalReviewer: string;
  reviewedAt: string;
  version: string;
}

export interface TopicV2_1 {
  version: "2.1";
  metadata: TopicMetadata;
  snippets: TopicSnippet[];
  reasoning: TopicReasoning;
  structuredFields: StructuredSection[];
  outputTemplate: OutputTemplate;
  review: ReviewContent;
  jitl: {
    termMap: JitlTermMap[];
    linkProviders: Array<{ label: string; hrefTemplate: string; row: number }>;
  };
  ddx: {
    evidencePrompts: string[];
    compareEnabled: boolean;
  };
  qa: TopicQaMeta;
}

export type TopicSource = TopicV1 | TopicV2 | TopicV2_1;

export interface TopicRuntime {
  version: "runtime";
  metadata: TopicMetadata;
  snippets: TopicSnippet[];
  reasoning: TopicReasoning;
  structuredFields: StructuredSection[];
  outputTemplate: OutputTemplate;
  review: ReviewContent;
  jitl: JitlConfig;
  ddx: DdxConfig;
  qa: TopicQaMeta;
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
  source: "editor" | "structured" | "reasoning" | "ddx";
  structuredSectionId?: string;
  includeByDefault: boolean;
}
