import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// Stop hook: fires OS notification and browser agent-done signal when Claude finishes a turn.
// Uses insight-flow current to detect the active task and its status.
// Always exits 0 — never blocks Claude from stopping.
export const NOTIFY_HOOK_SCRIPT = `#!/bin/bash
# Taskflow Notify Hook — fires OS + browser notification when Claude finishes a turn.
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

# OS notification — only on statuses that indicate the agent completed meaningful work
case "$STATUS" in
  implemented|approved|fix-needed|fixed|merged|changes-implemented)
    $IF_CMD notify "$TASK_ID $STATUS" 2>/dev/null || true
    ;;
esac

# Browser notification — read server port from config (default 6006), fire-and-forget
SERVER_PORT=6006
CONFIG_FILE="$PROJECT_ROOT/taskflow.config.json"
if [ -f "$CONFIG_FILE" ]; then
  _p=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | head -1 | grep -o '[0-9]*$')
  [ -n "$_p" ] && SERVER_PORT="$_p"
fi
curl -sf -X POST "http://localhost:\${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true

exit 0
`;

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
  const currentContent = existsSync(hookPath)
    ? (() => {
        try {
          return readFileSync(hookPath, "utf-8");
        } catch {
          return "";
        }
      })()
    : "";
  if (currentContent !== NOTIFY_HOOK_SCRIPT) {
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
    stop.push({
      matcher: "",
      hooks: [
        {
          type: "command",
          command: "${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-notify.sh",
          timeout: 5000,
        },
      ],
    });
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
