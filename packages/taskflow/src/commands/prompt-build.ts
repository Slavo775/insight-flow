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
      "- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside workTasks/"
    );
    lines.push(
      "- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)"
    );
    lines.push(
      "- Running the script is MANDATORY — there are no exceptions, even for \"minor\" field updates"
    );
    lines.push(
      "- Violation: direct file edit bypasses validation, ID sequencing, and audit trail"
    );
    lines.push("");
  }

  const prNote =
    cfg.gitTool === "gh"
      ? "Use `gh pr create` for PR creation"
      : "Provide a compare URL for manual PR creation (no gh CLI)";
  const prState =
    cfg.prStrategy === "draft"
      ? "Open PRs as drafts (`gh pr create --draft`)"
      : "Open PRs as ready for review";
  const branchNote = cfg.branchPrefix
    ? `Prefix all branches with '${cfg.branchPrefix}' (e.g. '${cfg.branchPrefix}feat/N01-...')`
    : "Branch naming: <type>/<task-id>-<slug>";
  const checklistNote = cfg.requireChecklist
    ? "Verify all CHECKLIST.md items are checked before marking implemented or done"
    : "Checklist verification is optional";

  lines.push("GIT / GH TOOL RULE");
  lines.push(`- gitTool: "${cfg.gitTool}" — ${prNote}`);
  lines.push(`- ${prState}`);
  lines.push(`- ${branchNote}`);
  lines.push(`- ${checklistNote}`);
  lines.push("- Never mix tools for the same operation");

  return lines.join("\n");
}

const ENFORCEMENT_START = "STRICT ENFORCEMENT — TASK FILE MUTATIONS";
const GIT_RULE_START = "GIT / GH TOOL RULE";

function patchRoleFile(filePath: string, block: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");

  // Already has the block — replace it
  const strictStart = content.indexOf(ENFORCEMENT_START);
  const gitStart = content.indexOf(GIT_RULE_START);

  if (strictStart !== -1 && gitStart !== -1) {
    // Find the end of the block (the next --- before INPUT CONTRACT)
    const afterBlock = content.indexOf("\n---\n", gitStart);
    if (afterBlock === -1) return false;
    const updated =
      content.slice(0, strictStart) + block + "\n" + content.slice(afterBlock + 1);
    writeFileSync(filePath, updated, "utf-8");
    return true;
  }

  // Block not present — insert after the first ---
  const firstSep = content.indexOf("\n---\n");
  if (firstSep === -1) return false;
  const insertAt = firstSep + 5; // after "\n---\n"
  const updated = content.slice(0, insertAt) + "\n" + block + "\n\n---\n\n" + content.slice(insertAt);
  writeFileSync(filePath, updated, "utf-8");
  return true;
}

export function cmdPromptBuild(opts: ParsedArgs): void {
  const configPath = resolve(
    process.cwd(),
    typeof opts.config === "string" ? opts.config : "taskflow.prompt.json"
  );
  const cfg = loadConfig(configPath);
  const block = buildEnforcementBlock(cfg);

  if (!opts.apply) {
    // Preview mode — print to stdout
    console.log("# Enforcement block (preview)\n");
    console.log(block);
    console.log(
      "\nRun with --apply to patch all TASK_*_ROLE.md and TASKMASTER*.md files in cwd."
    );
    return;
  }

  // Apply mode — find and patch role files
  const cwd = process.cwd();
  const patterns = [
    "TASKMASTER_ROLE.md",
    "TASKMASTER_CHANGE_ROLE.md",
    "TASK_IMPLEMENTER_ROLE.md",
    "TASK_REVIEWER_ROLE.md",
    "TASK_REVIEW_FIXER_ROLE.md",
    "TASK_HUMAN_REVIEW_ROLE.md",
    "TASK_INCIDENT_ROLE.md",
    "TASK_REQUEST_CHANGES_ROLE.md",
  ];

  const results: { file: string; patched: boolean }[] = [];
  for (const name of patterns) {
    const filePath = join(cwd, name);
    const patched = patchRoleFile(filePath, block);
    results.push({ file: name, patched });
  }

  const patched = results.filter((r) => r.patched).map((r) => r.file);
  const skipped = results.filter((r) => !r.patched).map((r) => r.file);

  console.log(
    JSON.stringify(
      {
        action: "prompt-build",
        config: configPath,
        patched,
        skipped,
      },
      null,
      2
    )
  );
}
