#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const sourcePath = process.argv[2];
const outputPathArg = process.argv[3];

if (!sourcePath) {
  console.error("Usage: node scripts/import-compass-condition.mjs <condition.ts> [output.json]");
  process.exit(1);
}

function extractConditionObject(tsSource) {
  const withoutImports = tsSource.replace(/^import.*$/gm, "");
  const normalized = withoutImports.replace(/export const\s+\w+\s*:\s*\w+\s*=\s*/, "const __condition = ");
  const match = normalized.match(/const __condition =\s*({[\s\S]*?});\s*$/m);
  if (!match) throw new Error("Could not find exported condition object in source file");
  const fn = new Function(`${match[0]}; return __condition;`);
  return fn();
}

function mapConditionToTopicV2(condition) {
  const slug = String(condition.id ?? "imported-topic");
  const displayName = String(condition.displayName ?? slug);

  const historySection = {
    id: "history",
    title: "History",
    fields: (condition.historyPrompts ?? []).flatMap((group) =>
      (group.prompts ?? []).map((prompt) => ({
        id: prompt.id,
        label: prompt.label,
        type: prompt.mode === "number" ? "number" : prompt.mode === "text" ? "text" : "select",
        options:
          prompt.mode === "yesNo"
            ? ["yes", "no"]
            : prompt.mode === "yesNoNa"
              ? ["yes", "no", "na"]
              : undefined,
        placeholder: prompt.placeholder,
        hint: prompt.hint,
      }))
    ),
  };

  const examSection = {
    id: "exam",
    title: "Examination",
    fields: (condition.examSections ?? []).flatMap((section) =>
      (section.prompts ?? []).map((prompt) => ({
        id: prompt.id,
        label: prompt.label,
        type: "select",
        options: ["normal", "abnormal", "not examined"],
        hint: prompt.hint,
      }))
    ),
  };

  const ddxEvidencePrompts = [
    ...(condition.discriminators ?? []).map((d) => d.question),
    ...(condition.diagnoses?.common ?? []).flatMap((d) => d.keyFeatures ?? []),
    ...(condition.diagnoses?.mustNotMiss ?? []).flatMap((d) => d.keyFeatures ?? []),
    ...(condition.diagnoses?.oftenMissed ?? []).flatMap((d) => d.keyFeatures ?? []),
  ];

  return {
    version: "2.1",
    metadata: {
      id: slug,
      slug,
      displayName,
      specialty: "General Practice",
      triggers: [`/${slug}`],
    },
    snippets: [],
    reasoning: {
      discriminators: (condition.discriminators ?? []).map((d) => d.question),
      mustNotMiss: (condition.mustNotMiss ?? []).map((m) => m.condition),
      redFlags: [...new Set((condition.mustNotMiss ?? []).flatMap((m) => m.redFlags ?? []))],
      references: [],
    },
    structuredFields: [
      historySection,
      examSection,
      {
        id: "assessment",
        title: "Assessment",
        fields: [{ id: "impression", label: "Impression", type: "textarea" }],
      },
      {
        id: "plan",
        title: "Plan",
        fields: [{ id: "plan", label: "Plan", type: "textarea" }],
      },
      {
        id: "safety-net",
        title: "Safety Net",
        fields: [
          { id: "safety-advice", label: "Safety net advice given", type: "toggle" },
          { id: "safety-details", label: "Safety details", type: "textarea", showIf: "safety-advice == true" },
        ],
      },
    ],
    outputTemplate: {
      sections: [
        { id: "editor", title: "Clinical Notes", source: "editor", includeByDefault: true },
        { id: "history", title: "History", source: "structured", structuredSectionId: "history", includeByDefault: true },
        { id: "exam", title: "Examination", source: "structured", structuredSectionId: "exam", includeByDefault: true },
        { id: "assessment", title: "Assessment", source: "structured", structuredSectionId: "assessment", includeByDefault: true },
        { id: "ddx-assessment", title: "Working Differential", source: "ddx", includeByDefault: true },
        { id: "plan", title: "Plan", source: "structured", structuredSectionId: "plan", includeByDefault: true },
        { id: "safety-net", title: "Safety Net", source: "structured", structuredSectionId: "safety-net", includeByDefault: true },
        { id: "reasoning", title: "Clinical Reasoning", source: "reasoning", includeByDefault: false },
      ],
    },
    review: {
      illnessScript: condition.illnessScript ?? { summary: "" },
      mustNotMiss: condition.mustNotMiss ?? [],
      discriminators: condition.discriminators ?? [],
      historyPrompts: condition.historyPrompts ?? [],
      examSections: condition.examSections ?? [],
      diagnoses: condition.diagnoses ?? { common: [], mustNotMiss: [], oftenMissed: [] },
      investigations: condition.investigations ?? { whenHelpful: [], whenNotNeeded: [], limitations: [] },
      managementConsiderations: condition.managementConsiderations ?? {
        selfCare: [],
        pharmacologicalConcepts: [],
        delayedStrategies: [],
        followUpLogic: [],
      },
      safetyNetting: condition.safetyNetting ?? { returnAdvice: [], escalationTriggers: [] },
      mindset: "What matters most to clarify in this consultation?",
    },
    jitl: {
      termMap: (condition.jitlTerms ?? []).map((term) => ({
        term: term.term,
        style:
          term.style === "jitl-chip" ? "chip" :
          term.style === "both" ? "both" :
          term.style ?? "underline",
        contextType: term.contextType,
        aliases: term.aliases,
      })),
      linkProviders: [],
    },
    ddx: {
      evidencePrompts: [...new Set(ddxEvidencePrompts)],
      compareEnabled: true,
    },
    qa: {
      status: "draft",
      clinicalReviewer: "unassigned",
      reviewedAt: "1970-01-01",
      version: "0.0.0",
    },
  };
}

function main() {
  const source = path.resolve(sourcePath);
  const ts = fs.readFileSync(source, "utf8");
  const condition = extractConditionObject(ts);
  const topic = mapConditionToTopicV2(condition);
  const outputPath = path.resolve(outputPathArg ?? `public/topics/${topic.metadata.slug}.json`);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
  console.log(`Imported ${source} -> ${outputPath}`);
}

main();
