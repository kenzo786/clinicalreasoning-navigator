import fs from "node:fs";
import path from "node:path";

const topicDir = "public/topics";
const expectedTopics = ["acute-asthma", "dizziness-vertigo", "type-2-diabetes-review"];

console.log("CRx Navigator Smoke Test");
console.log("=========================");

let allPassed = true;

// 1. Check file existence
console.log("\n1. Checking file existence:");
for (const id of expectedTopics) {
  const filePath = path.join(topicDir, `${id}.json`);
  if (fs.existsSync(filePath)) {
    console.log(`[PASS] ${id}.json exists`);
  } else {
    console.log(`[FAIL] ${id}.json is missing`);
    allPassed = false;
  }
}

// 2. Check index.json manifest
console.log("\n2. Checking index.json manifest:");
const index = JSON.parse(fs.readFileSync(path.join(topicDir, "index.json"), "utf8"));
for (const id of expectedTopics) {
  const entry = index.find(e => e.id === id);
  if (entry) {
    console.log(`[PASS] ${id} found in index.json (status: ${entry.qaStatus})`);
  } else {
    console.log(`[FAIL] ${id} missing from index.json`);
    allPassed = false;
  }
}

// 3. Basic content validation for new topics
console.log("\n3. Basic content validation:");
for (const id of expectedTopics) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(topicDir, `${id}.json`), "utf8"));
    const snippetsCount = data.snippets.length;
    const historyPromptsCount = data.review.historyPrompts.length;
    const redFlagsCount = data.reasoning.redFlags.length;
    
    console.log(`[INFO] ${id}: ${snippetsCount} snippets, ${historyPromptsCount} history groups, ${redFlagsCount} red flags`);
    
    if (snippetsCount >= 5 && historyPromptsCount >= 1 && redFlagsCount >= 3) {
      console.log(`[PASS] ${id} meets minimum content density`);
    } else {
      console.log(`[FAIL] ${id} content density too low`);
      allPassed = false;
    }
  } catch (e) {
    console.log(`[FAIL] ${id} failed to parse: ${e.message}`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("\n[SUCCESS] All smoke tests passed!");
  process.exit(0);
} else {
  console.log("\n[FAILURE] Some smoke tests failed.");
  process.exit(1);
}
