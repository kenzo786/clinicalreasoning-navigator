#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const topicDir = path.resolve(process.argv[2] ?? "public/topics");
const outputFile = path.resolve(process.argv[3] ?? path.join(topicDir, "index.json"));

const entries = fs
  .readdirSync(topicDir)
  .filter((file) => file.endsWith(".json") && file !== "index.json")
  .map((file) => JSON.parse(fs.readFileSync(path.join(topicDir, file), "utf8")))
  .map((topic) => ({
    id: topic.metadata?.id,
    displayName: topic.metadata?.displayName,
    version: topic.version,
    qaStatus: topic.qa?.status ?? "draft",
    updatedAt: topic.qa?.reviewedAt ?? "1970-01-01",
  }))
  .filter((x) => x.id && x.displayName)
  .sort((a, b) => String(a.displayName).localeCompare(String(b.displayName)));

fs.writeFileSync(outputFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
console.log(`Wrote topic manifest: ${outputFile} (${entries.length} entries)`);
