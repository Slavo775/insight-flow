import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export type ActivityHookStatus = "ok" | "hook-missing" | "settings-missing" | "both-missing";

const HOOK_REL_PATH = ".claude/hooks/taskflow-activity.sh";
const SETTINGS_CANDIDATES = [".claude/settings.local.json", ".claude/settings.json"];

export const ACTIVITY_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Activity Hook — appends Claude Code tool events to activity log
# This runs automatically on PostToolUse — zero token cost to Claude.
LOG_FILE="__LOG_FILE__"

# Read the hook event JSON from stdin
INPUT=$(cat)

# Extract tool name and file path using lightweight parsing
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$FILE" ]; then
  FILE=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Skip if no tool name captured
[ -z "$TOOL" ] && exit 0

# Append JSONL line
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
if [ -n "$FILE" ]; then
  echo "{\\"ts\\":\\"$TS\\",\\"tool\\":\\"$TOOL\\",\\"action\\":\\"use\\",\\"file\\":\\"$FILE\\"}" >> "$LOG_FILE"
else
  echo "{\\"ts\\":\\"$TS\\",\\"tool\\":\\"$TOOL\\",\\"action\\":\\"use\\"}" >> "$LOG_FILE"
fi
`;

function hookFilePath(cwd: string): string {
  return resolve(cwd, HOOK_REL_PATH);
}

function settingsRegistersHook(cwd: string): boolean {
  for (const rel of SETTINGS_CANDIDATES) {
    const path = resolve(cwd, rel);
    if (!existsSync(path)) continue;
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch {
      continue;
    }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }
    const hooks = parsed.hooks as Record<string, unknown> | undefined;
    const postToolUse = hooks?.PostToolUse as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(postToolUse)) continue;
    const found = postToolUse.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const cmd = (entry.command as string) || "";
      if (cmd.includes("taskflow-activity.sh")) return true;
      const inner = (entry.hooks as Array<Record<string, unknown>>) || [];
      return inner.some((h) =>
        typeof (h?.command as string | undefined) === "string" &&
        (h.command as string).includes("taskflow-activity.sh"),
      );
    });
    if (found) return true;
  }
  return false;
}

export function detectActivityHookStatus(cwd: string): ActivityHookStatus {
  const hookExists = existsSync(hookFilePath(cwd));
  const settingsOk = settingsRegistersHook(cwd);
  if (hookExists && settingsOk) return "ok";
  if (!hookExists && !settingsOk) return "both-missing";
  if (!hookExists) return "hook-missing";
  return "settings-missing";
}

export interface InstallActivityHookResult {
  hookWritten: boolean;
  settingsUpdated: boolean;
  hookPath: string;
  settingsPath: string;
}

/**
 * Idempotent installer. Writes the hook script if missing and registers a
 * PostToolUse entry in `.claude/settings.local.json` if not already present.
 * Re-running on a fully installed project is a no-op (both flags `false`).
 */
export function installActivityHook(cwd: string, logFile: string): InstallActivityHookResult {
  const hooksDir = resolve(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = resolve(hooksDir, "taskflow-activity.sh");
  let hookWritten = false;
  if (!existsSync(hookPath)) {
    const hookScript = ACTIVITY_HOOK_SCRIPT.replace("__LOG_FILE__", logFile);
    writeFileSync(hookPath, hookScript, { mode: 0o755 });
    hookWritten = true;
  }

  const settingsPath = resolve(cwd, ".claude", "settings.local.json");
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  const postToolUse = (hooks.PostToolUse ?? []) as Array<Record<string, unknown>>;
  const alreadyRegistered = postToolUse.some(
    (h) =>
      typeof h === "object" &&
      h !== null &&
      ((h.command as string) || "").includes("taskflow-activity.sh"),
  );

  let settingsUpdated = false;
  if (!alreadyRegistered) {
    postToolUse.push({ command: ".claude/hooks/taskflow-activity.sh", timeout: 5000 });
    hooks.PostToolUse = postToolUse;
    settings.hooks = hooks;
    if (!existsSync(resolve(cwd, ".claude"))) {
      mkdirSync(resolve(cwd, ".claude"), { recursive: true });
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    settingsUpdated = true;
  }

  return { hookWritten, settingsUpdated, hookPath, settingsPath };
}

// ---------------------------------------------------------------------------
// Enrichment hooks (UserPromptSubmit, Stop, PreToolUse)
// ---------------------------------------------------------------------------

const SKILL_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Skill Hook — detects /skill invocations (UserPromptSubmit)
LOG_FILE="__LOG_FILE__"
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | grep -o '"prompt":"[^"]*"' | head -1 | cut -d'"' -f4)
SKILL=$(echo "$PROMPT" | grep -o '^/[a-zA-Z][a-zA-Z0-9_-]*' | head -1 | cut -c2-)
[ -z "$SKILL" ] && exit 0
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "$SKILL" > "\${LOG_FILE%.jsonl}.last-skill"
printf '{"ts":"%s","tool":"Skill","action":"started","skill":"%s"}\\n' "$TS" "$SKILL" >> "$LOG_FILE"
`;

const DONE_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Done Hook — emits Skill completed event (Stop)
LOG_FILE="__LOG_FILE__"
SKILL_FILE="\${LOG_FILE%.jsonl}.last-skill"
if [ -f "$SKILL_FILE" ]; then
  SKILL=$(cat "$SKILL_FILE")
  rm -f "$SKILL_FILE"
else
  SKILL="unknown"
fi
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
printf '{"ts":"%s","tool":"Skill","action":"completed","skill":"%s"}\\n' "$TS" "$SKILL" >> "$LOG_FILE"
`;

const CLASSIFY_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Classify Hook — labels common Bash commands (PreToolUse)
LOG_FILE="__LOG_FILE__"
INPUT=$(cat)
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$TOOL" != "Bash" ] && exit 0
CMD=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$CMD" ] && exit 0

LABEL=""
case "$CMD" in
  *pnpm\ test*|*npm\ test*|*yarn\ test*|*jest*|*vitest*|*node:test*)
    LABEL="Running tests" ;;
  *git\ commit*)
    LABEL="Committing" ;;
  *git\ push*)
    LABEL="Pushing" ;;
  *gh\ pr\ create*)
    LABEL="Creating PR" ;;
  *pnpm\ build*|*npm\ run\ build*|*yarn\ build*|*tsc\ *)
    LABEL="Building" ;;
  *pnpm\ lint*|*npm\ run\ lint*|*eslint*)
    LABEL="Linting" ;;
esac

[ -z "$LABEL" ] && exit 0
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
SAFE=$(echo "$CMD" | head -c 120 | sed 's/\\\\/\\\\\\\\/g' | sed 's/"/\\\\"/g')
printf '{"ts":"%s","tool":"Tool","action":"classified","label":"%s","file":"%s"}\\n' "$TS" "$LABEL" "$SAFE" >> "$LOG_FILE"
`;

export interface InstallEnrichmentHooksResult {
  hooksWritten: number;
  settingsUpdated: boolean;
}

export function installEnrichmentHooks(
  cwd: string,
  logFile: string,
): InstallEnrichmentHooksResult {
  const hooksDir = resolve(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookDefs = [
    { file: "taskflow-skill.sh", script: SKILL_HOOK_SCRIPT, event: "UserPromptSubmit" },
    { file: "taskflow-done.sh", script: DONE_HOOK_SCRIPT, event: "Stop" },
    { file: "taskflow-classify.sh", script: CLASSIFY_HOOK_SCRIPT, event: "PreToolUse" },
  ];

  let hooksWritten = 0;
  for (const { file, script } of hookDefs) {
    const hookPath = resolve(hooksDir, file);
    if (!existsSync(hookPath)) {
      writeFileSync(hookPath, script.replace("__LOG_FILE__", logFile), { mode: 0o755 });
      hooksWritten++;
    }
  }

  const settingsPath = resolve(cwd, ".claude", "settings.local.json");
  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
    } catch {
      settings = {};
    }
  }

  const hooks = (settings.hooks ?? {}) as Record<string, unknown[]>;
  let settingsUpdated = false;

  for (const { file, event } of hookDefs) {
    const hookCmd = `.claude/hooks/${file}`;
    const existing = (hooks[event] ?? []) as Array<Record<string, unknown>>;
    const alreadyRegistered = existing.some(
      (h) => typeof h === "object" && h !== null && ((h.command as string) || "").includes(file),
    );
    if (!alreadyRegistered) {
      existing.push({ command: hookCmd, timeout: 5000 });
      hooks[event] = existing;
      settingsUpdated = true;
    }
  }

  if (settingsUpdated) {
    settings.hooks = hooks;
    if (!existsSync(resolve(cwd, ".claude"))) {
      mkdirSync(resolve(cwd, ".claude"), { recursive: true });
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  }

  return { hooksWritten, settingsUpdated };
}

