#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";

const sourcePath = process.argv[2] ?? "topic-author.yml";
const outputDir = process.argv[3] ?? "public/topics";

function readSource(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return parseYaml(raw);
  } catch (error) {
    throw new Error(`Failed to parse ${filePath} as YAML. ${String(error)}`);
  }
}

function assertRequired(topic) {
  const required = [
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
  for (const key of required) {
    if (!topic[key]) throw new Error(`Missing required root key: ${key}`);
  }
  if (!Array.isArray(topic.snippets)) throw new Error("snippets must be an array");
  if (!Array.isArray(topic.structuredFields)) throw new Error("structuredFields must be an array");
  if (!topic.outputTemplate?.sections) throw new Error("outputTemplate.sections missing");
}

function lintTopic(topic) {
  const issues = [];

  const triggerSet = new Set();
  for (const snip of topic.snippets) {
    if (!snip.trigger) {
      issues.push(`Snippet '${snip.id ?? snip.label ?? "unknown"}' is missing trigger`);
      continue;
    }
    if (triggerSet.has(snip.trigger)) issues.push(`Duplicate snippet trigger: ${snip.trigger}`);
    triggerSet.add(snip.trigger);
  }

  for (const section of topic.structuredFields) {
    for (const field of section.fields ?? []) {
      if (!field.id) issues.push(`Field in section '${section.id}' missing id`);
      if (field.showIf && !/==|!=|contains|&&|\|\|/.test(field.showIf)) {
        issues.push(`Field '${field.id}' has suspicious showIf '${field.showIf}'`);
      }
    }
  }

  for (const item of topic.review.mustNotMiss ?? []) {
    if (!item.escalationConcern) {
      issues.push(`Must-not-miss '${item.condition}' missing escalationConcern`);
    }
  }

  return issues;
}

function ensureVersion(topic) {
  return {
    version: "2.1",
    ddx: {
      evidencePrompts: topic.ddx?.evidencePrompts ?? [],
      compareEnabled: topic.ddx?.compareEnabled ?? true,
    },
    jitl: {
      termMap: topic.jitl?.termMap ?? [],
      linkProviders: topic.jitl?.linkProviders ?? [],
    },
    qa: {
      status: topic.qa?.status ?? "draft",
      clinicalReviewer: topic.qa?.clinicalReviewer ?? "unassigned",
      reviewedAt: topic.qa?.reviewedAt ?? "1970-01-01",
      version: topic.qa?.version ?? "0.0.0",
    },
    ...topic,
    version: "2.1",
  };
}

function main() {
  const absSource = path.resolve(sourcePath);
  const absOutputDir = path.resolve(outputDir);
  const topic = ensureVersion(readSource(absSource));
  assertRequired(topic);
  const issues = lintTopic(topic);
  if (issues.length > 0) {
    console.error("Topic lint issues:");
    for (const issue of issues) console.error(`- ${issue}`);
    process.exit(1);
  }

  const slug = topic.metadata?.slug;
  if (!slug) throw new Error("metadata.slug missing");
  fs.mkdirSync(absOutputDir, { recursive: true });
  const outputFile = path.join(absOutputDir, `${slug}.json`);
  fs.writeFileSync(outputFile, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
  console.log(`Wrote ${outputFile}`);
}

main();
