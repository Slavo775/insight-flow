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
