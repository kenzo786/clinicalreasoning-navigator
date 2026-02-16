#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const topicDir = path.resolve(process.argv[2] ?? "public/topics");

const requiredRoot = [
  "version",
  "metadata",
  "snippets",
  "reasoning",
  "structuredFields",
  "outputTemplate",
  "review",
  "jitl",
  "ddx",
  "qa",
];

const diagnosisPlaceholderPatterns = [
  /likely benign presentation/i,
  /serious pathology/i,
  /atypical presentation of serious pathology/i,
];

function validateTopic(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const issues = [];

  for (const key of requiredRoot) {
    if (!(key in raw)) issues.push(`missing root key '${key}'`);
  }
  if (raw.version !== "2.1") issues.push(`version must be 2.1, got ${raw.version}`);
  if (!raw.metadata?.id || !raw.metadata?.displayName || !raw.metadata?.slug) {
    issues.push("metadata.id, metadata.slug, and metadata.displayName are required");
  }
  if (!Array.isArray(raw.snippets)) issues.push("snippets must be an array");
  if (!Array.isArray(raw.structuredFields)) issues.push("structuredFields must be an array");
  if (!Array.isArray(raw.outputTemplate?.sections)) issues.push("outputTemplate.sections must be an array");
  if (!raw.outputTemplate?.sections?.some((section) => section?.source === "ddx")) {
    issues.push("outputTemplate.sections must include a ddx source section");
  }
  if (!Array.isArray(raw.jitl?.linkProviders)) issues.push("jitl.linkProviders must be an array");
  if (typeof raw.ddx?.compareEnabled !== "boolean") issues.push("ddx.compareEnabled must be boolean");
  if (!Array.isArray(raw.review?.historyPrompts) || raw.review.historyPrompts.length < 1) {
    issues.push("review.historyPrompts must include at least 1 group");
  }
  if (!Array.isArray(raw.review?.examSections) || raw.review.examSections.length < 1) {
    issues.push("review.examSections must include at least 1 section");
  }
  if (
    !Array.isArray(raw.review?.investigations?.whenHelpful) ||
    raw.review.investigations.whenHelpful.length < 1
  ) {
    issues.push("review.investigations.whenHelpful must include at least 1 item");
  }
  if (
    !Array.isArray(raw.review?.managementConsiderations?.followUpLogic) ||
    raw.review.managementConsiderations.followUpLogic.length < 1
  ) {
    issues.push("review.managementConsiderations.followUpLogic must include at least 1 item");
  }

  const qa = raw.qa ?? {};
  if (!["approved", "draft", "deprecated"].includes(qa.status)) {
    issues.push(`qa.status must be approved|draft|deprecated, got ${qa.status}`);
  }
  if (!qa.clinicalReviewer || !qa.reviewedAt || !qa.version) {
    issues.push("qa.clinicalReviewer, qa.reviewedAt, qa.version are required");
  }

  const commonDiagnoses = (raw.review?.diagnoses?.common ?? [])
    .map((entry) => String(entry?.name ?? "").trim())
    .filter(Boolean);
  if (commonDiagnoses.length < 1) {
    issues.push("review.diagnoses.common must include at least 1 diagnosis");
  }

  for (const diagnosis of [
    ...commonDiagnoses,
    ...(raw.review?.diagnoses?.mustNotMiss ?? []).map((entry) => String(entry?.name ?? "").trim()),
    ...(raw.review?.diagnoses?.oftenMissed ?? []).map((entry) => String(entry?.name ?? "").trim()),
  ]) {
    if (!diagnosis) continue;
    if (diagnosisPlaceholderPatterns.some((pattern) => pattern.test(diagnosis))) {
      issues.push(`diagnosis placeholder is not allowed: '${diagnosis}'`);
    }
  }

  const discriminatorSet = new Set(
    (raw.reasoning?.discriminators ?? []).map((value) => String(value).trim().toLowerCase())
  );
  const overlaps = commonDiagnoses.filter((name) =>
    discriminatorSet.has(name.toLowerCase())
  );
  if (overlaps.length > 0) {
    issues.push(
      `review.diagnoses.common must not overlap reasoning.discriminators (${overlaps.join(", ")})`
    );
  }

  return issues;
}

const files = fs
  .readdirSync(topicDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .map((f) => path.join(topicDir, f));

let hasErrors = false;
for (const file of files) {
  const issues = validateTopic(file);
  if (issues.length) {
    hasErrors = true;
    console.error(`\n${path.basename(file)}:`);
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log(`Validated ${files.length} topic files.`);
