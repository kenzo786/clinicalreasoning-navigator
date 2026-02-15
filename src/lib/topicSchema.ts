import type {
  TopicSource,
  TopicRuntime,
  TopicV1,
  TopicV2,
  TopicV2_1,
  ReviewContent,
  JitlConfig,
  DdxConfig,
  OutputTemplate,
  TopicQaMeta,
} from "@/types/topic";
import { releaseFlags } from "@/config/releaseFlags";

const DEFAULT_JITL_LINKS: JitlConfig["linkProviders"] = [
  { row: 1, label: "Perplexity", hrefTemplate: "https://www.perplexity.ai/search?q=SEARCH_TERM" },
  { row: 1, label: "NICE", hrefTemplate: "https://www.google.com/search?q=SEARCH_TERM+site:nice.org.uk" },
  { row: 2, label: "CKS", hrefTemplate: "https://www.google.com/search?q=SEARCH_TERM+site:cks.nice.org.uk" },
  { row: 2, label: "BNF", hrefTemplate: "https://www.google.com/search?q=SEARCH_TERM+site:bnf.nice.org.uk" },
  { row: 3, label: "BMJ", hrefTemplate: "https://www.google.com/search?q=SEARCH_TERM+site:bestpractice.bmj.com" },
  { row: 3, label: "Google", hrefTemplate: "https://www.google.com/search?q=SEARCH_TERM" },
];

const DEFAULT_QA: TopicQaMeta = {
  status: "draft",
  clinicalReviewer: "unassigned",
  reviewedAt: "1970-01-01",
  version: "0.0.0",
};

export interface TopicManifestEntry {
  id: string;
  displayName: string;
  version: string;
  qaStatus: TopicQaMeta["status"];
  updatedAt: string;
}

function defaultReviewFromV1(topic: TopicV1): ReviewContent {
  const reviewDiscriminators = topic.reasoning.discriminators.map((q) => ({
    question: q,
    reasoning: "Key discriminator for this presentation.",
    clinicalValue: "Helps narrow the differential during consultation.",
  }));

  const reviewMustNotMiss = topic.reasoning.mustNotMiss.map((item) => ({
    condition: item,
    redFlags: topic.reasoning.redFlags.filter((f) =>
      f.toLowerCase().includes(item.toLowerCase().split(" ")[0] ?? "")
    ),
    whyDangerous: "Potential for significant morbidity if missed.",
    escalationConcern: "Escalate urgently if clinically suspected.",
  }));

  return {
    illnessScript: {
      summary:
        `${topic.metadata.displayName} in primary care: use symptom pattern, red flags, and risk profile to guide decisions.`,
    },
    mustNotMiss: reviewMustNotMiss,
    discriminators: reviewDiscriminators,
    historyPrompts: [
      {
        category: "Core History",
        prompts: topic.structuredFields
          .find((s) => s.id === "history")
          ?.fields.map((f) => ({
            id: `h-${f.id}`,
            label: f.label,
            mode: "text",
            hint: f.hint,
            placeholder: f.placeholder,
          })) ?? [],
      },
    ],
    examSections: [
      {
        id: "exam-core",
        title: "Focused Examination",
        prompts:
          topic.structuredFields
            .find((s) => s.id === "exam")
            ?.fields.map((f) => ({
              id: `e-${f.id}`,
              label: f.label,
              significance: "Interpret in clinical context and alongside red flags.",
              hint: f.hint,
            })) ?? [],
      },
    ],
    diagnoses: {
      common: topic.reasoning.discriminators.slice(0, 3).map((name) => ({ name })),
      mustNotMiss: topic.reasoning.mustNotMiss.map((name) => ({ name })),
      oftenMissed: [],
    },
    investigations: {
      whenHelpful: [],
      whenNotNeeded: [],
      limitations: [],
    },
    managementConsiderations: {
      selfCare: [],
      pharmacologicalConcepts: [],
      delayedStrategies: [],
      followUpLogic: [],
    },
    safetyNetting: {
      returnAdvice: topic.reasoning.redFlags.map((x) => `Seek urgent review for: ${x}`),
      escalationTriggers: topic.reasoning.redFlags,
    },
    mindset: "What matters most to clarify in this consultation?",
  };
}

function ensureDdxSection(template: OutputTemplate): OutputTemplate {
  const hasDdx = template.sections.some((s) => s.source === "ddx");
  if (hasDdx) return template;
  return {
    ...template,
    sections: [
      ...template.sections,
      {
        id: "ddx-assessment",
        title: "Working Differential",
        source: "ddx",
        includeByDefault: true,
      },
    ],
  };
}

function normalizeV21(topic: TopicV2_1): TopicRuntime {
  return {
    version: "runtime",
    metadata: topic.metadata,
    snippets: topic.snippets,
    reasoning: topic.reasoning,
    structuredFields: topic.structuredFields,
    outputTemplate: ensureDdxSection(topic.outputTemplate),
    review: topic.review,
    jitl: topic.jitl,
    ddx: topic.ddx,
    qa: topic.qa,
  };
}

function normalizeV2(topic: TopicV2): TopicRuntime {
  const jitl: JitlConfig = {
    termMap: topic.jitl?.termMap ?? [],
    linkProviders: topic.jitl?.linkProviders ?? DEFAULT_JITL_LINKS,
  };

  const ddx: DdxConfig = {
    evidencePrompts: topic.ddx?.evidencePrompts ?? [],
    compareEnabled: topic.ddx?.compareEnabled ?? true,
  };

  return {
    version: "runtime",
    metadata: topic.metadata,
    snippets: topic.snippets,
    reasoning: topic.reasoning,
    structuredFields: topic.structuredFields,
    outputTemplate: ensureDdxSection(topic.outputTemplate),
    review: topic.review,
    jitl,
    ddx,
    qa: DEFAULT_QA,
  };
}

function normalizeV1(topic: TopicV1): TopicRuntime {
  return {
    version: "runtime",
    metadata: topic.metadata,
    snippets: topic.snippets,
    reasoning: topic.reasoning,
    structuredFields: topic.structuredFields,
    outputTemplate: ensureDdxSection(topic.outputTemplate),
    review: defaultReviewFromV1(topic),
    jitl: {
      termMap: [],
      linkProviders: DEFAULT_JITL_LINKS,
    },
    ddx: {
      evidencePrompts: [],
      compareEnabled: true,
    },
    qa: DEFAULT_QA,
  };
}

export function validateTopic(data: unknown):
  | { valid: true; topic: TopicSource }
  | { valid: false; error: string } {
  if (!data || typeof data !== "object") return { valid: false, error: "Topic data is not an object" };
  const t = data as Partial<TopicSource> & {
    metadata?: { id?: string; slug?: string; displayName?: string };
    outputTemplate?: { sections?: unknown };
    qa?: TopicQaMeta;
  };

  if (t.version !== "1.0" && t.version !== "2.0" && t.version !== "2.1") {
    return { valid: false, error: `Invalid version: ${t.version}` };
  }
  if (!t.metadata?.id || !t.metadata?.slug || !t.metadata?.displayName) {
    return { valid: false, error: "Missing required metadata fields" };
  }
  if (!Array.isArray(t.snippets)) return { valid: false, error: "snippets must be an array" };
  if (!t.reasoning) return { valid: false, error: "Missing reasoning section" };
  if (!Array.isArray(t.structuredFields)) return { valid: false, error: "structuredFields must be an array" };
  if (!t.outputTemplate?.sections) return { valid: false, error: "Missing outputTemplate.sections" };
  if ((t.version === "2.0" || t.version === "2.1") && !t.review) {
    return { valid: false, error: "v2+ topic missing review section" };
  }
  if (t.version === "2.1") {
    if (!t.jitl || !t.ddx || !t.qa) {
      return { valid: false, error: "v2.1 topic missing jitl, ddx, or qa metadata" };
    }
  }

  return { valid: true, topic: t as TopicSource };
}

export function normalizeTopic(topic: TopicSource): TopicRuntime {
  if (topic.version === "2.1") return normalizeV21(topic);
  return topic.version === "2.0" ? normalizeV2(topic) : normalizeV1(topic);
}

export async function loadTopic(slug: string): Promise<TopicRuntime> {
  const resp = await fetch(`/topics/${slug}.json`);
  if (!resp.ok) throw new Error(`Failed to load topic: ${slug} (${resp.status})`);
  const data = await resp.json();
  const result = validateTopic(data);
  if (!result.valid) throw new Error(`Invalid topic ${slug}: ${(result as { valid: false; error: string }).error}`);
  if (releaseFlags.strictTopicV21 && (result as { valid: true; topic: TopicSource }).topic.version !== "2.1") {
    throw new Error(`Topic ${slug} must be version 2.1 for pilot release`);
  }
  return normalizeTopic((result as { valid: true; topic: TopicSource }).topic);
}

export async function loadTopicManifest(): Promise<TopicManifestEntry[]> {
  const resp = await fetch("/topics/index.json");
  if (!resp.ok) {
    return [];
  }
  const data = (await resp.json()) as unknown;
  if (!Array.isArray(data)) return [];
  return data
    .filter((x) => x && typeof x === "object")
    .map((x) => x as TopicManifestEntry)
    .filter((x) => Boolean(x.id && x.displayName));
}
