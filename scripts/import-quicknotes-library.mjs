#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const libraryPath = process.argv[2];
const topicPath = process.argv[3];

if (!libraryPath || !topicPath) {
  console.error("Usage: node scripts/import-quicknotes-library.mjs <quicknotes.json> <topic.json>");
  process.exit(1);
}

function toSnippet(item) {
  return {
    id: String(item.id ?? randomUUID()),
    trigger: String(item.trigger ?? "").replace(/^\//, ""),
    label: String(item.label ?? item.trigger ?? "Snippet"),
    category: String(item.category ?? "Imported"),
    content: String(item.content ?? ""),
    tags: Array.isArray(item.tags) ? item.tags.map((t) => String(t)) : [],
  };
}

function main() {
  const libFile = path.resolve(libraryPath);
  const topicFile = path.resolve(topicPath);
  const library = JSON.parse(fs.readFileSync(libFile, "utf8"));
  const topic = JSON.parse(fs.readFileSync(topicFile, "utf8"));

  const rawSnippets = Array.isArray(library) ? library : (library.snippets ?? []);
  const incoming = rawSnippets.map(toSnippet).filter((s) => s.trigger && s.content);

  const existingByTrigger = new Set((topic.snippets ?? []).map((s) => s.trigger));
  const merged = [...(topic.snippets ?? [])];
  for (const snippet of incoming) {
    if (existingByTrigger.has(snippet.trigger)) continue;
    merged.push(snippet);
    existingByTrigger.add(snippet.trigger);
  }

  topic.snippets = merged;
  fs.writeFileSync(topicFile, `${JSON.stringify(topic, null, 2)}\n`, "utf8");
  console.log(`Merged ${incoming.length} snippets into ${topicFile} (dedupe by trigger).`);
}

main();
