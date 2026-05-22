import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ParsedArgs } from "../types.js";

interface PromptConfig {
  gitTool: "gh" | "git";
  strictCLI: boolean;
  prStrategy: "draft" | "ready";
  branchPrefix: string;
  requireChecklist: boolean;
}

const DEFAULTS: PromptConfig = {
  gitTool: "gh",
  strictCLI: true,
  prStrategy: "ready",
  branchPrefix: "",
  requireChecklist: true,
};

function loadConfig(configPath: string): PromptConfig {
  if (!existsSync(configPath)) {
    return DEFAULTS;
  }
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<PromptConfig>;
    return { ...DEFAULTS, ...raw };
  } catch {
    console.error(`Warning: could not parse ${configPath}, using defaults.`);
    return DEFAULTS;
  }
}

function buildEnforcementBlock(cfg: PromptConfig): string {
  const lines: string[] = [];

  if (cfg.strictCLI) {
    lines.push("STRICT ENFORCEMENT — TASK FILE MUTATIONS");
    lines.push(
      "- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside workTasks/",
    );
    lines.push(
      "- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)",
    );
    lines.push(
      '- Running the script is MANDATORY — there are no exceptions, even for "minor" field updates',
    );
    lines.push("- Violation: direct file edit bypasses validation, ID sequencing, and audit trail");
    lines.push("");
  }

  const sectionTitle = cfg.gitTool === "gh" ? "GIT / GH TOOL RULE" : "GIT TOOL RULE";

  const prLine =
    cfg.gitTool === "gh"
      ? cfg.prStrategy === "draft"
        ? "- Use `gh pr create --draft` for PR creation"
        : "- Use `gh pr create` for PR creation (opens ready for review)"
      : "- Use a git compare URL for PR creation — no gh CLI";

  const pushLine =
    cfg.gitTool === "gh"
      ? "- Use `git` for branch creation, commits, and push"
      : "- Use `git` for all operations (branch, commit, push)";

  const branchLine = cfg.branchPrefix
    ? `- Branch naming: ${cfg.branchPrefix}<type>/<task-id>-<slug>`
    : "- Branch naming: <type>/<task-id>-<slug>";

  const checklistLine = cfg.requireChecklist
    ? "- Verify all CHECKLIST.md items before marking implemented or done"
    : "- Checklist verification is optional";

  lines.push(sectionTitle);
  lines.push(prLine);
  lines.push(pushLine);
  lines.push(branchLine);
  lines.push(checklistLine);
  lines.push("- Never mix tools for the same operation");

  return lines.join("\n");
}

const ENFORCEMENT_START = "STRICT ENFORCEMENT — TASK FILE MUTATIONS";
const GIT_RULE_START = "GIT / GH TOOL RULE";
const AGENT_REF = "@AGENT_ENFORCEMENT.md";

// Replace inline enforcement block (or insert @reference) with @AGENT_ENFORCEMENT.md.
// Returns true if the file was modified.
function patchRoleFileWithRef(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");

  // Already has the @reference — nothing to do
  if (content.includes(AGENT_REF)) return false;

  // Has inline enforcement block — replace with @reference
  const strictStart = content.indexOf(ENFORCEMENT_START);
  const gitStart = content.indexOf(GIT_RULE_START);

  if (strictStart !== -1 && gitStart !== -1) {
    const afterBlock = content.indexOf("\n---\n", gitStart);
    if (afterBlock === -1) return false;
    const updated =
      content.slice(0, strictStart) + AGENT_REF + "\n" + content.slice(afterBlock + 1);
    writeFileSync(filePath, updated, "utf-8");
    return true;
  }

  // Neither inline block nor @reference — insert @reference after the first ---
  const firstSep = content.indexOf("\n---\n");
  if (firstSep === -1) return false;
  const insertAt = firstSep + 5; // after "\n---\n"
  const rest = content.slice(insertAt).replace(/^\n/, ""); // consume the blank line that follows ---
  const updated = content.slice(0, insertAt) + "\n" + AGENT_REF + "\n\n---\n\n" + rest;
  writeFileSync(filePath, updated, "utf-8");
  return true;
}

const ROLE_FILES = [
  "TASKMASTER_ROLE.md",
  "TASKMASTER_CHANGE_ROLE.md",
  "TASK_IMPLEMENTER_ROLE.md",
  "TASK_REVIEWER_ROLE.md",
  "TASK_REVIEW_FIXER_ROLE.md",
  "TASK_HUMAN_REVIEW_ROLE.md",
  "TASK_INCIDENT_ROLE.md",
  "TASK_REQUEST_CHANGES_ROLE.md",
];

export function cmdPromptBuild(opts: ParsedArgs): void {
  const configPath = resolve(
    process.cwd(),
    typeof opts.config === "string" ? opts.config : "taskflow.prompt.json",
  );
  const cfg = loadConfig(configPath);
  const block = buildEnforcementBlock(cfg);

  if (!opts.apply) {
    console.log("# Enforcement block (preview)\n");
    console.log(block);
    console.log(
      "\nRun with --apply to write AGENT_ENFORCEMENT.md and update all role files to reference it.",
    );
    return;
  }

  const cwd = process.cwd();

  // Write the single canonical enforcement file
  const enforcementPath = join(cwd, "AGENT_ENFORCEMENT.md");
  writeFileSync(enforcementPath, block + "\n", "utf-8");

  // Ensure each role file references AGENT_ENFORCEMENT.md (not inline)
  const results: { file: string; patched: boolean }[] = [];
  for (const name of ROLE_FILES) {
    const patched = patchRoleFileWithRef(join(cwd, name));
    results.push({ file: name, patched });
  }

  const patched = results.filter((r) => r.patched).map((r) => r.file);
  const skipped = results.filter((r) => !r.patched).map((r) => r.file);

  console.log(
    JSON.stringify({
      action: "prompt-build",
      enforcementFile: "AGENT_ENFORCEMENT.md",
      config: configPath,
      patched,
      skipped,
    }),
  );
}
