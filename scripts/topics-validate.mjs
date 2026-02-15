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
  if (!Array.isArray(raw.jitl?.linkProviders)) issues.push("jitl.linkProviders must be an array");
  if (typeof raw.ddx?.compareEnabled !== "boolean") issues.push("ddx.compareEnabled must be boolean");

  const qa = raw.qa ?? {};
  if (!["approved", "draft", "deprecated"].includes(qa.status)) {
    issues.push(`qa.status must be approved|draft|deprecated, got ${qa.status}`);
  }
  if (!qa.clinicalReviewer || !qa.reviewedAt || !qa.version) {
    issues.push("qa.clinicalReviewer, qa.reviewedAt, qa.version are required");
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
