#!/usr/bin/env node
// Copy canonical role files from repo root into packages/taskflow/templates/roles/
// so npm publish ships the latest content. Idempotent. Fails loudly if a source is missing.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROLE_FILES = [
  "TASKMASTER_ROLE.md",
  "TASKMASTER_CHANGE_ROLE.md",
  "TASK_ANALYZER_ROLE.md",
  "TASK_IMPLEMENTER_ROLE.md",
  "TASK_REVIEWER_ROLE.md",
  "TASK_REVIEW_FIXER_ROLE.md",
  "TASK_HUMAN_REVIEW_ROLE.md",
  "TASK_INCIDENT_ROLE.md",
  "TASK_REQUEST_CHANGES_ROLE.md",
  // Shared files referenced by every role.
  "AGENT_PROTOCOL.md",
  "AGENT_EVENTS.md",
  "AGENT_SECURITY.md",
];

const __filename = fileURLToPath(import.meta.url);
const packageRoot = resolve(dirname(__filename), "..");
const repoRoot = resolve(packageRoot, "..", "..");
const destDir = resolve(packageRoot, "templates", "roles");

if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

let copied = 0;
let unchanged = 0;
const missing = [];

for (const name of ROLE_FILES) {
  const src = resolve(repoRoot, name);
  if (!existsSync(src)) {
    missing.push(name);
    continue;
  }
  const dest = resolve(destDir, name);
  const srcContent = readFileSync(src, "utf-8");
  const destContent = existsSync(dest) ? readFileSync(dest, "utf-8") : null;
  if (srcContent === destContent) {
    unchanged++;
  } else {
    copyFileSync(src, dest);
    copied++;
  }
}

console.log(JSON.stringify({ action: "sync-role-templates", copied, unchanged, missing }));

if (missing.length > 0) {
  process.exitCode = 1;
}
