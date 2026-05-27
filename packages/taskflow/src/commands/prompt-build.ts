import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ParsedArgs, TaskflowConfig, AgentGitPermissions } from "../types.js";
import { applyAgentExtensions } from "../agents.js";

function buildEnforcementBlock(rawGitPerms?: AgentGitPermissions): string {
  const lines: string[] = [];

  lines.push("STRICT ENFORCEMENT — TASK FILE MUTATIONS");
  lines.push("");
  lines.push(
    "- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside workTasks/",
  );
  lines.push(
    "- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)",
  );
  lines.push(
    "- Running the script is MANDATORY — there are no exceptions, even for \"minor\" field updates",
  );
  lines.push("- Violation: direct file edit bypasses validation, ID sequencing, and audit trail");
  lines.push("");
  lines.push("GIT RULE");
  lines.push("");
  lines.push("- Use `git` for branch creation, commits, and push (universal — works on any host).");
  lines.push(
    "- PR creation: use the command defined in `taskflow.config.json.agents.extend.task-git` for your project. insight-flow does not ship a default. See `@PR_API.md` for examples by host (GitHub `gh`, GitLab `glab`, no-CLI compare URL).",
  );
  lines.push("- Branch naming: <type>/<task-id>-<slug>");
  lines.push("- Verify all CHECKLIST.md items before marking implemented or done");

  if (rawGitPerms) {
    if (rawGitPerms.remoteOps === "deny") {
      lines.push(
        "- All remote operations (push, createPR, deleteBranchRemote) are NOT permitted.",
      );
    } else {
      for (const [op, val] of Object.entries(rawGitPerms)) {
        if (op === "remoteOps") continue;
        if (val === false) {
          lines.push(`- ${op} is NOT permitted.`);
        }
      }
    }
  }

  lines.push("- Never mix tools for the same operation");
  lines.push("");
  lines.push("TOKEN EFFICIENCY (applies to every role)");
  lines.push("");
  lines.push("- No subagents. Direct tool calls only.");
  lines.push("- Batch independent reads in one parallel round.");
  lines.push("- Read only what the task scope explicitly requires.");

  return lines.join("\n");
}

const ENFORCEMENT_START = "STRICT ENFORCEMENT — TASK FILE MUTATIONS";
const GIT_RULE_START = "GIT RULE";
const LEGACY_GIT_RULE_START = "GIT / GH TOOL RULE";
const AGENT_REF = "@AGENT_ENFORCEMENT.md";

// Replace inline enforcement block (or insert @reference) with @AGENT_ENFORCEMENT.md.
// Returns true if the file was modified.
function patchRoleFileWithRef(filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const content = readFileSync(filePath, "utf-8");

  // Already has the @reference — nothing to do
  if (content.includes(AGENT_REF)) return false;

  // Has inline enforcement block — replace with @reference. Accept both the
  // current "GIT RULE" heading and the legacy "GIT / GH TOOL RULE" heading
  // (pre-N16) so we can rewrite older role files on first apply.
  const strictStart = content.indexOf(ENFORCEMENT_START);
  let gitStart = content.indexOf(GIT_RULE_START);
  if (gitStart === -1) gitStart = content.indexOf(LEGACY_GIT_RULE_START);

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

export function cmdPromptBuild(config: TaskflowConfig, opts: ParsedArgs): void {
  const cwd = process.cwd();

  // Read raw user config to get explicitly-set git permissions (without defaults).
  // Resolved config always has defaults merged in; we only reflect user intent here.
  let rawGitPerms: AgentGitPermissions | undefined;
  const configPath = resolve(cwd, "taskflow.config.json");
  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8")) as {
        agents?: { git?: { permissions?: AgentGitPermissions } };
      };
      rawGitPerms = raw.agents?.git?.permissions;
    } catch {
      // ignore parse errors
    }
  }

  const block = buildEnforcementBlock(rawGitPerms);

  if (!opts.apply) {
    console.log("# Enforcement block (preview)\n");
    console.log(block);
    console.log(
      "\nRun with --apply to write AGENT_ENFORCEMENT.md and update all role files to reference it.",
    );
    return;
  }

  // Write the single canonical enforcement file
  const enforcementPath = join(cwd, "AGENT_ENFORCEMENT.md");
  writeFileSync(enforcementPath, block + "\n", "utf-8");

  // Ensure each role file references AGENT_ENFORCEMENT.md (not inline)
  const results: { file: string; patched: boolean }[] = [];
  for (const name of ROLE_FILES) {
    const patched = patchRoleFileWithRef(join(cwd, name));
    results.push({ file: name, patched });
  }

  // Apply agents.extend into role files in rolesDir
  const extend = config.agents?.extend;
  if (extend) {
    const rolesDir = resolve(cwd, config.rolesDir);
    applyAgentExtensions(rolesDir, extend);
  }

  const patched = results.filter((r) => r.patched).map((r) => r.file);
  const skipped = results.filter((r) => !r.patched).map((r) => r.file);

  console.log(
    JSON.stringify({
      action: "prompt-build",
      enforcementFile: "AGENT_ENFORCEMENT.md",
      patched,
      skipped,
    }),
  );
}
