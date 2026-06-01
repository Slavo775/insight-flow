import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  copyFileSync,
  readdirSync,
} from "node:fs";
import { createInterface } from "node:readline";
import { resolve } from "node:path";
import type { TaskflowConfig } from "../types.js";
import { resolvePackageAsset } from "../paths.js";
import { applyAgentExtensions } from "../agents.js";
import { installActivityHook, installEnrichmentHooks, installLifecycleHooks } from "../activity-hook.js";
import { installNotifyHook } from "../notify-hook.js";
import { applyEnforcement } from "../commands/prompt-build.js";
import { buildSkillList, selectProviders, type ProviderContext } from "./providers/index.js";


async function promptUser(question: string, defaultYes: boolean): Promise<boolean> {
  if (!process.stdout.isTTY) return defaultYes;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      const a = answer.trim().toLowerCase();
      if (a === "") resolve(defaultYes);
      else resolve(a === "y" || a === "yes");
    });
  });
}

function lifecycleHooksRegistered(cwd: string): boolean {
  const candidates = [".claude/settings.local.json", ".claude/settings.json"];
  for (const rel of candidates) {
    const path = resolve(cwd, rel);
    if (!existsSync(path)) continue;
    let raw: string;
    try { raw = readFileSync(path, "utf-8"); } catch { continue; }
    if (raw.includes("lifecycle-session-start.sh")) return true;
  }
  return false;
}

export async function initProject(
  cwd: string = process.cwd(),
  force: boolean = false,
  options: { examples?: boolean; yes?: boolean; editor?: string } = {},
): Promise<void> {
  // Resolve which editor providers to scaffold (claude / cursor / all, or
  // auto-detect). Done up front so editor-specific steps below can gate on it.
  let providers;
  try {
    providers = selectProviders(cwd, options.editor);
  } catch (err) {
    console.error((err as Error).message);
    return;
  }
  const claudeSelected = providers.some((p) => p.id === "claude");
  console.log(`insight-flow init — editors: ${providers.map((p) => p.id).join(", ")}`);

  const configPath = resolve(cwd, "taskflow.config.json");

  // 1. Write config. insight-flow ships zero technology assumptions — when
  // `options.examples` is true we add commented `agents.extend` stubs so
  // the user has a starting template for wiring up their stack's commands.
  // See CLAUDE.md "Extending agents with project-specific commands".
  let config: TaskflowConfig = {
    workDir: "workTasks",
    shardSize: 10,
    projectName: inferName(cwd),
    rolesDir: ".claude/roles",
    server: { port: 6006 },
    activityEngine: { enabled: false, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
    notifications: { browser: true, cli: true },
  };

  let onDiskConfig: Partial<TaskflowConfig> | null = null;
  const configExisted = existsSync(configPath);

  if (configExisted) {
    console.log("taskflow.config.json already exists, skipping config creation.");
    try {
      onDiskConfig = JSON.parse(readFileSync(configPath, "utf-8")) as Partial<TaskflowConfig>;
      config = { ...config, ...onDiskConfig };
    } catch {
      // ignore parse errors
    }
  } else {
    const body = options.examples
      ? buildConfigWithExamples(config)
      : JSON.stringify(config, null, 2) + "\n";
    writeFileSync(configPath, body);
    console.log(
      options.examples
        ? "Created taskflow.config.json with commented agents.extend stubs"
        : "Created taskflow.config.json",
    );
  }

  // 2. Create workTasks dir + master.json
  const workDir = resolve(cwd, config.workDir);
  if (!existsSync(workDir)) {
    mkdirSync(workDir, { recursive: true });
    console.log(`Created ${config.workDir}/`);
  }

  const masterPath = resolve(workDir, "master.json");
  if (!existsSync(masterPath)) {
    const master = {
      meta: {
        nextId: 0,
        currentTaskId: null,
        nextIncidentId: 1,
        shards: ["tasks-N00-N09.json"],
      },
    };
    writeFileSync(masterPath, JSON.stringify(master, null, 2) + "\n");

    const shard = { range: { from: 0, to: 9 }, tasks: [] as unknown[] };
    writeFileSync(resolve(workDir, "tasks-N00-N09.json"), JSON.stringify(shard, null, 2) + "\n");
    console.log("Created master.json + initial shard");
  }

  // 3. Build the canonical skill set + the context shared by every provider.
  const agentsConfig = config.agents;
  const customAgents = agentsConfig?.custom ?? [];
  const skills = buildSkillList(customAgents);
  const providerCtx: ProviderContext = { cwd, config, skills, customAgents, force };

  // 4. Claude-specific role infrastructure: role templates, agent extensions,
  //    and AGENT_ENFORCEMENT.md. These use the `.claude/roles` @-include
  //    mechanism, so they only apply when the claude provider is selected —
  //    cursor embeds the role body directly in each SKILL.md and needs none of it.
  if (claudeSelected) {
    // 4a. Copy role templates (per file, so we can report created vs skipped).
    const rolesDir = resolve(cwd, config.rolesDir);
    const templateRolesDir = resolvePackageAsset("templates/roles");

    if (existsSync(templateRolesDir)) {
      if (!existsSync(rolesDir)) {
        mkdirSync(rolesDir, { recursive: true });
      }
      const entries = readdirSync(templateRolesDir).filter((f) => f.endsWith(".md"));
      let created = 0;
      let skipped = 0;
      for (const file of entries) {
        const dest = resolve(rolesDir, file);
        if (!force && existsSync(dest)) {
          skipped++;
        } else {
          copyFileSync(resolve(templateRolesDir, file), dest);
          created++;
        }
      }
      if (created > 0) {
        console.log(
          `Copied ${created} role template${created === 1 ? "" : "s"} to ${config.rolesDir}/`,
        );
      }
      if (skipped > 0) {
        console.log(
          `Skipped ${skipped} existing role file${skipped === 1 ? "" : "s"} in ${config.rolesDir}/`,
        );
      }
    }

    // 4b. Apply agent extensions to the built-in role files.
    if (agentsConfig?.extend) {
      applyAgentExtensions(resolve(cwd, config.rolesDir), agentsConfig.extend);
    }

    // 4c. Strip WHEN TO NOTIFY block when cli notifications are disabled.
    if (config.notifications?.cli === false) {
      stripWhenToNotify(resolve(cwd, config.rolesDir));
    }

    // 4d. Strip PHASE MARKERS block when phaseMarkers is disabled.
    if (config.activityEngine?.phaseMarkers === false) {
      stripPhaseMarkers(resolve(cwd, config.rolesDir));
    }

    // 4e. Write/update AGENT_ENFORCEMENT.md and patch role file @-references.
    const enforcementResult = applyEnforcement(config, cwd);
    console.log(
      enforcementResult.created ? "Created AGENT_ENFORCEMENT.md" : "Updated AGENT_ENFORCEMENT.md",
    );
  }

  // 5. Render skills + context for every selected editor (the provider seam).
  //    claude → .claude/commands/*.md + CLAUDE.md;
  //    cursor → .cursor/skills/<name>/SKILL.md + AGENTS.md.
  for (const provider of providers) {
    provider.writeSkills(providerCtx);
  }
  for (const provider of providers) {
    provider.writeContext(providerCtx);
  }

  // 6. Interactive prompts + Claude Code hooks (lifecycle / activity / notify).
  //    Hooks are Claude-specific; porting the live-dashboard event streaming to
  //    Cursor is a deferred Phase-2 task (see N75 ANALYSIS.md), so this whole
  //    block only runs when the claude provider is selected.
  if (claudeSelected) {
    const useDefaults = options.yes || !process.stdout.isTTY;
    const lifecycleAlreadyInstalled = configExisted && lifecycleHooksRegistered(cwd);
    const activityAlreadyConfigured = configExisted && onDiskConfig?.activityEngine?.enabled !== undefined;

    // Question 1: lifecycle hooks (default yes)
    let installLifecycle = true;
    if (lifecycleAlreadyInstalled) {
      installLifecycle = false; // already installed, skip
    } else if (useDefaults) {
      installLifecycle = true;
    } else {
      console.log("\n  Lifecycle hooks write task status changes to events.json (zero token cost).");
      installLifecycle = await promptUser("  Enable task lifecycle events? (Y/n) ", true);
    }

    // Question 2: activity engine (default no)
    let enableActivity = config.activityEngine?.enabled !== false;
    if (activityAlreadyConfigured) {
      enableActivity = config.activityEngine?.enabled !== false; // respect existing
    } else if (useDefaults) {
      enableActivity = false;
    } else {
      console.log("\n  Activity tracking shows agent phase markers in the dashboard (adds ~50 tokens/turn).");
      enableActivity = await promptUser("  Enable agent activity tracking? (y/N) ", false);
    }

    // Update config on disk if activity enabled and not already configured
    if (!activityAlreadyConfigured && enableActivity) {
      let diskData: Record<string, unknown> = {};
      try { diskData = JSON.parse(readFileSync(configPath, "utf-8")) as Record<string, unknown>; } catch { /* ignore */ }
      const ae = ((diskData.activityEngine ?? {}) as Record<string, unknown>);
      ae.enabled = true;
      diskData.activityEngine = ae;
      writeFileSync(configPath, JSON.stringify(diskData, null, 2) + "\n");
      config.activityEngine = { logFile: ".taskflow-activity.jsonl", maxEvents: 200, ...config.activityEngine, enabled: true };
      console.log("Updated taskflow.config.json with activityEngine.enabled: true");
    }

    // Install lifecycle hooks
    if (installLifecycle) {
      generateLifecycleHooks(cwd);
    }

    // Install activity hooks when enabled
    if (enableActivity) {
      generateActivityHook(cwd, config);
      if (config.activityEngine?.hookEnrichment !== false) {
        generateEnrichmentHooks(cwd, config);
      }
    }

    // 6b. Generate Claude Code Stop hook for automatic OS notifications
    if (config.notifications?.cli !== false) {
      generateNotifyHook(cwd);
    }
  }

  // 7. Add .taskflow-activity.jsonl to .gitignore
  const gitignorePath = resolve(cwd, ".gitignore");
  const activityLogEntry = ".taskflow-activity.jsonl";
  if (existsSync(gitignorePath)) {
    const gitignore = readFileSync(gitignorePath, "utf-8");
    if (!gitignore.includes(activityLogEntry)) {
      writeFileSync(gitignorePath, gitignore.trimEnd() + "\n" + activityLogEntry + "\n");
      console.log("Added " + activityLogEntry + " to .gitignore");
    }
  } else {
    writeFileSync(gitignorePath, activityLogEntry + "\n");
    console.log("Created .gitignore with " + activityLogEntry);
  }

  console.log(
    "\ninsight-flow initialized! Run 'insight-flow create --title \"My task\" --type feat' to create your first task.",
  );
  console.log("Run 'insight-flow' to launch the dashboard.\n");
}

function generateActivityHook(cwd: string, config: TaskflowConfig): void {
  const logFile = config.activityEngine?.logFile || ".taskflow-activity.jsonl";
  const result = installActivityHook(cwd, logFile);
  if (result.hookWritten || result.settingsUpdated) {
    console.log("Generated activity hook in .claude/hooks/ and registered in settings.local.json");
    console.log("  → restart your Claude Code session for the hook to take effect");
  } else {
    console.log("Activity hook already registered, skipping.");
  }
}

function generateEnrichmentHooks(cwd: string, config: TaskflowConfig): void {
  const logFile = config.activityEngine?.logFile || ".taskflow-activity.jsonl";
  const result = installEnrichmentHooks(cwd, logFile);
  if (result.hooksWritten > 0 || result.settingsUpdated) {
    console.log(`Generated ${result.hooksWritten} enrichment hook(s) (UserPromptSubmit, Stop, PreToolUse) in .claude/hooks/`);
    console.log("  → restart your Claude Code session for the hooks to take effect");
  } else {
    console.log("Enrichment hooks already registered, skipping.");
  }
}

function generateLifecycleHooks(cwd: string): void {
  const result = installLifecycleHooks(cwd);
  if (result.hooksWritten > 0 || result.settingsUpdated) {
    console.log(`Generated ${result.hooksWritten} lifecycle hook(s) (SessionStart, UserPromptSubmit, Stop, PreToolUse, PostToolUse, PermissionRequest) in .claude/hooks/`);
    console.log("  → restart your Claude Code session to activate lifecycle event streaming");
  } else {
    console.log("Lifecycle hooks already registered, skipping.");
  }
}

function generateNotifyHook(cwd: string): void {
  const result = installNotifyHook(cwd);
  if (result.hookWritten || result.settingsUpdated) {
    console.log("Generated notify hook in .claude/hooks/ and registered Stop hook in settings.local.json");
    console.log("  → restart your Claude Code session for the hook to take effect");
  } else {
    console.log("Notify hook already registered, skipping.");
  }
}

// Blanks AGENT_NOTIFY.md in the consumer's .claude/roles/ when cli notifications
// are disabled, so the referenced file resolves to an empty string.
function stripWhenToNotify(rolesDir: string): void {
  if (!existsSync(rolesDir)) return;
  const notifyPath = resolve(rolesDir, "AGENT_NOTIFY.md");
  if (existsSync(notifyPath)) {
    writeFileSync(notifyPath, "");
  }
}

function stripPhaseMarkers(rolesDir: string): void {
  const agentEventsPath = resolve(rolesDir, "AGENT_EVENTS.md");
  if (existsSync(agentEventsPath)) {
    writeFileSync(agentEventsPath, "");
  }
}

function inferName(cwd: string): string {
  try {
    const pkgPath = resolve(cwd, "package.json");
    if (existsSync(pkgPath)) {
      const { name } = JSON.parse(readFileSync(pkgPath, "utf-8"));
      if (name) return name;
    }
  } catch {
    // ignore
  }
  return resolve(cwd).split("/").pop() || "project";
}

/**
 * Compose taskflow.config.json with commented `agents.extend` stubs. We
 * emit a JSONC-friendly body (JSON.stringify wouldn't include comments)
 * so users see the contract immediately and can uncomment + fill in their
 * stack's commands. The JSON parser tolerates the leading/trailing
 * whitespace; consumers that re-write config via JSON.stringify will lose
 * the comments but keep the data.
 */
function buildConfigWithExamples(config: TaskflowConfig): string {
  // Exclude notifications + activityEngine from the base JSON — the stub below
  // re-inserts them with JSONC comments so users see the opt-out semantics.
  const { notifications: _n, activityEngine: _a, ...baseConfig } = config;
  const base = JSON.stringify(baseConfig, null, 2);
  const stub = `,
  "activityEngine": {
    "// enabled": "Set to true to enable Claude activity tracking in the dashboard (opt-in to save tokens).",
    "enabled": false,
    "logFile": ".taskflow-activity.jsonl",
    "maxEvents": 200,
    "// phaseMarkers": "Set to false to suppress agent PHASE MARKERS calls (zero token overhead).",
    "phaseMarkers": true,
    "// hookEnrichment": "Set to false to skip UserPromptSubmit / Stop / PreToolUse enrichment hooks.",
    "hookEnrichment": true,
    "// verbosity": "milestones | detailed | both. Controls which events appear in the activity panel.",
    "verbosity": "both"
  },
  "notifications": {
    "// browser": "Set to false to disable browser desktop notifications on status transitions.",
    "browser": true,
    "// cli": "Set to false to disable the Stop hook that fires OS notifications when Claude finishes a turn.",
    "cli": true
  },
  "agents": {
    "// extend": "Strings here are appended to each agent's prompt at runtime. insight-flow ships no technology assumptions — these stubs document the contract.",
    "extend": {
      "task-analyze":       [],
      "task-implement":     [],
      "task-review":        [],
      "task-review-fix":    [],
      "task-incident":      [],
      "task-git":           [],
      "taskmaster":         [],
      "task-human-review":  [],
      "task-request-changes": []
    },
    "// git": "Control which git operations task-git is allowed to perform. Use remoteOps: 'deny' to block all origin-touching ops at once, or set individual flags.",
    "git": {
      "permissions": {
        "// remoteOps": "Shorthand: 'deny' blocks push/forcePush/deleteBranchRemote/createPR unless overridden below.",
        "remoteOps":         "allow",
        "createBranch":      true,
        "checkout":          true,
        "commit":            true,
        "push":              true,
        "forcePush":         false,
        "merge":             true,
        "deleteBranchLocal": true,
        "deleteBranchRemote": true,
        "createPR":          true
      }
    }
  }
`;
  return base.replace(/\n}\s*$/, stub + "}\n");
}
