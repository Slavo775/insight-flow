import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { ParsedArgs, TaskflowConfig, AgentGitPermissions } from "../../core/types.js";
import { applyAgentExtensions, AGENT_ROLE_FILE_MAP } from "../../agents/agents.js";
import { composeAgent, collectArtifacts, COMPOSED_AGENTS } from "../../agents/compose.js";
import { applyArtifacts } from "../../agents/emit.js";
import { ComposedAgentSchema } from "../../core/schema/index.js";
import { resolveProjectRoot } from "../../core/paths.js";

function buildEnforcementBlock(rawGitPerms?: AgentGitPermissions): string {
  const lines: string[] = [];

  lines.push("@AGENT_SECURITY.md");
  lines.push("STRICT ENFORCEMENT — TASK FILE MUTATIONS");
  lines.push("");
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
      lines.push("- All remote operations (push, createPR, deleteBranchRemote) are NOT permitted.");
      // Also surface any local ops that were explicitly denied alongside remoteOps: "deny"
      const localOps = [
        "createBranch",
        "checkout",
        "commit",
        "merge",
        "deleteBranchLocal",
      ] as const;
      for (const op of localOps) {
        if (rawGitPerms[op] === false) {
          lines.push(`- ${op} is NOT permitted.`);
        }
      }
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

function readRawGitPerms(cwd: string): AgentGitPermissions | undefined {
  let projectRoot: string;
  try {
    projectRoot = resolveProjectRoot(cwd);
  } catch {
    projectRoot = cwd;
  }
  const configPath = resolve(projectRoot, "taskflow.config.json");
  if (!existsSync(configPath)) return undefined;
  try {
    const raw = JSON.parse(readFileSync(configPath, "utf-8")) as {
      agents?: { git?: { permissions?: AgentGitPermissions } };
    };
    return raw.agents?.git?.permissions;
  } catch {
    return undefined;
  }
}

// Writes AGENT_ENFORCEMENT.md and patches all role files to reference it.
// Returns { created: true } if the file was newly written, { created: false } if updated,
// plus the names of files that were patched vs already up to date.
export function applyEnforcement(
  config: TaskflowConfig,
  cwd: string,
): { created: boolean; patched: string[]; skipped: string[] } {
  const block = buildEnforcementBlock(readRawGitPerms(cwd));
  const resolvedRolesDir = config.rolesDir ? resolve(cwd, config.rolesDir) : null;
  const hasRootRoles = ROLE_FILES.some((f) => existsSync(join(cwd, f)));
  const enforcementDir =
    !hasRootRoles &&
    resolvedRolesDir &&
    resolvedRolesDir !== resolve(cwd) &&
    existsSync(resolvedRolesDir)
      ? resolvedRolesDir
      : cwd;
  const enforcementPath = join(enforcementDir, "AGENT_ENFORCEMENT.md");
  const created = !existsSync(enforcementPath);
  writeFileSync(enforcementPath, block + "\n", "utf-8");

  const patched: string[] = [];
  const skipped: string[] = [];

  const track = (name: string, wasPatched: boolean) => (wasPatched ? patched : skipped).push(name);

  // Patch root-level role files (covers insight-flow's own setup)
  for (const name of ROLE_FILES) {
    track(name, patchRoleFileWithRef(join(cwd, name)));
  }

  // Patch role files in rolesDir (covers consumer projects initialized by init)
  if (config.rolesDir) {
    const rolesDir = resolve(cwd, config.rolesDir);
    if (existsSync(rolesDir) && rolesDir !== cwd) {
      for (const file of readdirSync(rolesDir).filter((f) => f.endsWith(".md"))) {
        track(file, patchRoleFileWithRef(resolve(rolesDir, file)));
      }
    }
  }

  return { created, patched, skipped };
}

export function cmdPromptBuild(config: TaskflowConfig, opts: ParsedArgs): void {
  const cwd = process.cwd();

  // N90/N92 — agent-module composer (JSON canonical):
  //   `prompt-build --compose [<agent-id>] [--def <file.json>] [--out <dir>] [--apply]`.
  // With no id, composes every known agent; `--def` loads an additional
  // project-local composed-agent definition (Zod-validated) — the affordance
  // that lets a consumer adopt integration modules without shipping a new
  // built-in agent. With --out, writes <id>.composed.md files; with --apply,
  // writes each agent's canonical role file (when a mapping exists) and emits
  // the agent's mcp-server/hook/skill artifacts to the project root, all
  // idempotently with per-target reporting. Returns early — no enforcement.
  if (opts.compose) {
    const id = typeof opts.compose === "string" ? opts.compose : null;
    const outDir = typeof opts.out === "string" ? resolve(cwd, opts.out) : null;
    if (outDir && !existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    let projectRoot: string;
    try {
      projectRoot = resolveProjectRoot(cwd);
    } catch {
      projectRoot = cwd;
    }

    const defs = { ...COMPOSED_AGENTS };
    try {
      if (typeof opts.def === "string") {
        const raw = JSON.parse(readFileSync(resolve(cwd, opts.def), "utf-8")) as unknown;
        const custom = ComposedAgentSchema.parse(raw);
        defs[custom.id] = custom;
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
    const ids = id ? [id] : Object.keys(defs);

    for (const agentId of ids) {
      let md: string;
      let def: (typeof defs)[string];
      try {
        def = defs[agentId];
        if (!def) throw new Error(`Unknown composed agent '${agentId}'. Known: ${ids.join(", ")}`);
        md = composeAgent(def);
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
      if (opts.apply) {
        const fileName = AGENT_ROLE_FILE_MAP[agentId];
        const target = fileName ? join(projectRoot, fileName) : null;
        if (target && existsSync(target)) {
          const previous = readFileSync(target, "utf-8");
          if (previous === md) {
            console.log(`unchanged ${fileName}`);
          } else {
            writeFileSync(target, md);
            console.log(`updated   ${fileName}`);
          }
        } else if (target) {
          // Only update existing role files: the canonical repo always has
          // them; consumer projects keep roles in rolesDir and must not get
          // root-level copies created by a routine apply.
          console.log(`skipped   ${fileName} (not present in this project)`);
        } else {
          console.log(`no role-file mapping for '${agentId}' — MD not written (artifacts only)`);
        }
        try {
          for (const report of applyArtifacts(collectArtifacts(def), projectRoot, def.id)) {
            console.log(`${report.action} ${report.target}`);
          }
        } catch (err) {
          console.error(err instanceof Error ? err.message : String(err));
          process.exit(1);
        }
      } else if (outDir) {
        const target = join(outDir, `${agentId}.composed.md`);
        writeFileSync(target, md);
        console.log(`Composed ${agentId} → ${target}`);
      } else {
        console.log(`\n=== composed: ${agentId} ===\n`);
        console.log(md);
      }
    }
    return;
  }

  if (!opts.apply) {
    const block = buildEnforcementBlock(readRawGitPerms(cwd));
    console.log("# Enforcement block (preview)\n");
    console.log(block);
    console.log(
      "\nRun with --apply to write AGENT_ENFORCEMENT.md and update all role files to reference it.",
    );
    return;
  }

  const { patched, skipped } = applyEnforcement(config, cwd);

  // Apply agents.extend into role files in rolesDir
  const extend = config.agents?.extend;
  if (extend) {
    const rolesDir = resolve(cwd, config.rolesDir);
    applyAgentExtensions(rolesDir, extend);
  }

  console.log(
    JSON.stringify({
      action: "prompt-build",
      enforcementFile: "AGENT_ENFORCEMENT.md",
      patched,
      skipped,
    }),
  );
}
