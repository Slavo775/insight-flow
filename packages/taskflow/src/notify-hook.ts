import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const NOTIFY_HOOK_REL_PATH = ".claude/hooks/taskflow-notify.sh";
const SETTINGS_CANDIDATES = [".claude/settings.local.json", ".claude/settings.json"];

// Stop hook: fires insight-flow notify when Claude finishes a turn.
// Uses insight-flow current to detect the active task and its status,
// then fires only when the status represents completed agent work.
// Always exits 0 — never blocks Claude from stopping.
export const NOTIFY_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Notify Hook — fires OS notification when Claude finishes a turn.
# Registered as a Stop hook. Zero token cost — runs outside Claude's context.

# Resolve insight-flow: prefer project-local install, fall back to global.
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$HOOK_DIR/../.." && pwd)"
LOCAL_BIN="$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="$PROJECT_ROOT/packages/taskflow/dist/cli.js"

if [ -f "$LOCAL_BIN" ]; then
  IF_CMD="$LOCAL_BIN"
elif [ -f "$LOCAL_CLI" ]; then
  IF_CMD="node $LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then
  IF_CMD="insight-flow"
else
  exit 0
fi

# Get current task (suppress errors; exits cleanly if no project)
CURRENT=$($IF_CMD current 2>/dev/null)
[ -z "$CURRENT" ] && exit 0

# Extract task ID and status without requiring jq
TASK_ID=$(echo "$CURRENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STATUS=$(echo "$CURRENT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

[ -z "$TASK_ID" ] && exit 0

# Only notify on statuses that indicate the agent completed meaningful work
case "$STATUS" in
  implemented|approved|fix-needed|fixed|merged|changes-implemented)
    $IF_CMD notify "$TASK_ID $STATUS" 2>/dev/null || true
    ;;
esac

exit 0
`;

export type NotifyHookStatus = "ok" | "hook-missing" | "settings-missing" | "both-missing";

function hookFilePath(cwd: string): string {
  return resolve(cwd, NOTIFY_HOOK_REL_PATH);
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
    const stop = hooks?.Stop as Array<Record<string, unknown>> | undefined;
    if (!Array.isArray(stop)) continue;
    const found = stop.some((entry) => {
      if (!entry || typeof entry !== "object") return false;
      const cmd = (entry.command as string) || "";
      if (cmd.includes("taskflow-notify.sh")) return true;
      const inner = (entry.hooks as Array<Record<string, unknown>>) || [];
      return inner.some(
        (h) =>
          typeof (h?.command as string | undefined) === "string" &&
          (h.command as string).includes("taskflow-notify.sh"),
      );
    });
    if (found) return true;
  }
  return false;
}

export function detectNotifyHookStatus(cwd: string): NotifyHookStatus {
  const hookExists = existsSync(hookFilePath(cwd));
  const settingsOk = settingsRegistersHook(cwd);
  if (hookExists && settingsOk) return "ok";
  if (!hookExists && !settingsOk) return "both-missing";
  if (!hookExists) return "hook-missing";
  return "settings-missing";
}

export interface InstallNotifyHookResult {
  hookWritten: boolean;
  settingsUpdated: boolean;
  hookPath: string;
  settingsPath: string;
}

/**
 * Idempotent installer. Writes the Stop hook script if missing and registers a
 * Stop entry in `.claude/settings.local.json` if not already present.
 */
export function installNotifyHook(cwd: string): InstallNotifyHookResult {
  const hooksDir = resolve(cwd, ".claude", "hooks");
  if (!existsSync(hooksDir)) {
    mkdirSync(hooksDir, { recursive: true });
  }

  const hookPath = resolve(hooksDir, "taskflow-notify.sh");
  let hookWritten = false;
  if (!existsSync(hookPath)) {
    writeFileSync(hookPath, NOTIFY_HOOK_SCRIPT, { mode: 0o755 });
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
  const stop = (hooks.Stop ?? []) as Array<Record<string, unknown>>;
  const alreadyRegistered = stop.some((h) => {
    if (!h || typeof h !== "object") return false;
    if (((h.command as string) || "").includes("taskflow-notify.sh")) return true;
    const inner = (h.hooks as Array<Record<string, unknown>> | undefined) ?? [];
    return inner.some((e) => ((e?.command as string) || "").includes("taskflow-notify.sh"));
  });

  let settingsUpdated = false;
  if (!alreadyRegistered) {
    stop.push({ matcher: "", hooks: [{ type: "command", command: ".claude/hooks/taskflow-notify.sh", timeout: 5000 }] });
    hooks.Stop = stop;
    settings.hooks = hooks;
    if (!existsSync(resolve(cwd, ".claude"))) {
      mkdirSync(resolve(cwd, ".claude"), { recursive: true });
    }
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
    settingsUpdated = true;
  }

  return { hookWritten, settingsUpdated, hookPath, settingsPath };
}
