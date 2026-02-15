#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const steps = [
  ["node", ["scripts/topics-manifest.mjs"]],
  ["node", ["scripts/topics-validate.mjs"]],
  ["node", ["scripts/topics-qa-report.mjs"]],
];

for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("Topic build completed.");
