#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/telemetry-kpi-report.mjs <events.json|events.ndjson>");
  process.exit(1);
}

const absPath = path.resolve(inputPath);
const raw = fs.readFileSync(absPath, "utf8").trim();
if (!raw) {
  console.error("Input file is empty.");
  process.exit(1);
}

function parseEvents(content) {
  if (content.startsWith("[")) {
    return JSON.parse(content);
  }
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

const events = parseEvents(raw).filter((event) => event && typeof event === "object");
const byEvent = new Map();

for (const event of events) {
  const name = String(event.event ?? "unknown");
  byEvent.set(name, (byEvent.get(name) ?? 0) + 1);
}

const formatCount = (name) => byEvent.get(name) ?? 0;

console.log("Telemetry KPI Report");
console.log("====================");
console.log(`Events processed: ${events.length}`);
console.log(`Sessions started: ${formatCount("session_started")}`);
console.log(`Quick start shown: ${formatCount("quick_start_shown")}`);
console.log(`Quick start dismissed: ${formatCount("quick_start_dismissed")}`);
console.log(`Snippet inserts: ${formatCount("snippet_inserted")}`);
console.log(`Token modals opened: ${formatCount("token_modal_opened")}`);
console.log(`Token modals resolved: ${formatCount("token_modal_resolved")}`);
console.log(`Diagnosis added: ${formatCount("diagnosis_added")}`);
console.log(`Diagnosis removed: ${formatCount("diagnosis_removed")}`);
console.log(`Evidence updates: ${formatCount("evidence_assignment_updated")}`);
console.log(`Export format changes: ${formatCount("export_format_selected")}`);
console.log(`Downloads: ${formatCount("export_download_triggered")}`);
console.log(`Section sync runs: ${formatCount("section_sync_executed")}`);
console.log(`Review status updates: ${formatCount("review_status_updated")}`);
