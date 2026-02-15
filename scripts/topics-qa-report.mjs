#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const topicDir = path.resolve(process.argv[2] ?? "public/topics");

const topics = fs
  .readdirSync(topicDir)
  .filter((f) => f.endsWith(".json") && f !== "index.json")
  .map((f) => JSON.parse(fs.readFileSync(path.join(topicDir, f), "utf8")));

const rows = topics.map((t) => ({
  id: t.metadata?.id,
  displayName: t.metadata?.displayName,
  status: t.qa?.status ?? "unknown",
  reviewer: t.qa?.clinicalReviewer ?? "unknown",
  reviewedAt: t.qa?.reviewedAt ?? "unknown",
  qaVersion: t.qa?.version ?? "unknown",
  completeness: [
    Array.isArray(t.review?.historyPrompts) && t.review.historyPrompts.length > 0,
    Array.isArray(t.review?.examSections) && t.review.examSections.length > 0,
    Array.isArray(t.review?.investigations?.whenHelpful) && t.review.investigations.whenHelpful.length > 0,
    Array.isArray(t.review?.managementConsiderations?.followUpLogic) && t.review.managementConsiderations.followUpLogic.length > 0,
  ].filter(Boolean).length,
}));

console.log("Topic QA Report");
console.log("===============");
for (const row of rows.sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)))) {
  console.log(
    `${row.displayName} (${row.id}) :: status=${row.status}, reviewer=${row.reviewer}, reviewedAt=${row.reviewedAt}, qaVersion=${row.qaVersion}, completeness=${row.completeness}/4`
  );
}

const unapproved = rows.filter((r) => r.status !== "approved");
if (unapproved.length) {
  console.error(`\nUnapproved topics: ${unapproved.length}`);
  process.exit(1);
}

console.log(`\nAll ${rows.length} topics are approved.`);
