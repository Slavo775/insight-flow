import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Cursor lifecycle hook generation (N77). Writes `.cursor/hooks.json` (Cursor's
 * schema version 1, camelCase event names) plus thin scripts that pipe Cursor's
 * stdin JSON to `insight-flow hook <event> --provider cursor` — the binary does
 * the parsing (see hook-parse.ts). Mirrors the Claude hook installer in
 * activity-hook.ts but for Cursor's `.cursor/` layout. Phase-2 of the Cursor
 * integration (skills + AGENTS.md shipped in N75; provider-id in N76).
 *
 * Caveats (documented, not solved here): Cursor cloud agents don't fire
 * session/prompt-lifecycle hooks (command hooks do); Cursor has no
 * PermissionRequest event, so "approval required" is synthesized by the
 * beforeShellExecution gate returning `ask` on a conservative matcher.
 */

// Resolve the insight-flow binary the same way across every script: prefer a
// project-local install, then the workspace dist, then a global install.
const RESOLVE_BIN = `PROJECT_ROOT="\${CURSOR_PROJECT_DIR:-\$(cd "\$(dirname "\$0")/../.." && pwd)}"
LOCAL_BIN="\$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="\$PROJECT_ROOT/packages/taskflow/dist/cli.js"
if [ -x "\$LOCAL_BIN" ]; then IF_CMD="\$LOCAL_BIN"
elif [ -f "\$LOCAL_CLI" ]; then IF_CMD="node \$LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then IF_CMD="insight-flow"
else exit 0; fi`;

const EVENT_SCRIPT = `#!/bin/bash
# insight-flow Cursor event hook — pipes Cursor's stdin JSON to the binary,
# which parses it (conversation_id, tool fields) and logs the event tagged
# --provider cursor. \$1 = Cursor event name; any remaining args (e.g.
# --if-active) pass through, so tool events are gated to active sessions.
[ -z "\$1" ] && exit 0
EVENT="\$1"; shift
${RESOLVE_BIN}
$IF_CMD hook "\$EVENT" --provider cursor "\$@" 2>/dev/null
exit 0
`;

const STOP_SCRIPT = `#!/bin/bash
# insight-flow Cursor stop hook — logs agent-idle + fires OS/browser
# notification when the Cursor agent finishes a turn.
${RESOLVE_BIN}
INPUT=\$(cat)
echo "\$INPUT" | $IF_CMD hook stop --provider cursor 2>/dev/null
CURRENT=\$($IF_CMD current 2>/dev/null)
TASK_ID=\$(echo "\$CURRENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STATUS=\$(echo "\$CURRENT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "\$TASK_ID" ] && $IF_CMD notify "\$TASK_ID \$STATUS" 2>/dev/null || true
SERVER_PORT=6006
CONFIG_FILE="\$PROJECT_ROOT/taskflow.config.json"
if [ -f "\$CONFIG_FILE" ]; then
  _p=\$(grep -o '"port":[[:space:]]*[0-9]*' "\$CONFIG_FILE" | head -1 | grep -o '[0-9]*\$')
  [ -n "\$_p" ] && SERVER_PORT="\$_p"
fi
curl -sf -X POST "http://localhost:\${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true
exit 0
`;

const APPROVAL_SCRIPT = `#!/bin/bash
# insight-flow Cursor approval gate — beforeShellExecution. Cursor has no
# PermissionRequest event, so we synthesize "approval required": on a sensitive
# command we emit approval-required + a notification and ask Cursor to prompt;
# otherwise we allow. Cursor reads the {"permission":...} JSON from stdout.
# Conservative matcher; never auto-denies. Tune the patterns to taste.
${RESOLVE_BIN}
INPUT=\$(cat)
CMD=\$(echo "\$INPUT" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
SENSITIVE=0
case "\$CMD" in
  *"git push"*|*"git reset --hard"*|*"rm -rf"*|*"npm publish"*|*"--force"*|*deploy*) SENSITIVE=1 ;;
esac
if [ "\$SENSITIVE" = "1" ]; then
  echo "\$INPUT" | $IF_CMD hook approval-required --provider cursor 2>/dev/null
  $IF_CMD notify "Approval required" 2>/dev/null || true
  printf '{"permission":"ask","agent_message":"insight-flow flagged this command as sensitive."}'
else
  echo "\$INPUT" | $IF_CMD hook beforeShellExecution --provider cursor 2>/dev/null
  printf '{"permission":"allow"}'
fi
exit 0
`;

const CURSOR_HOOKS_JSON = {
  version: 1,
  hooks: {
    sessionStart: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" sessionStart' }],
    sessionEnd: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" sessionEnd' }],
    beforeSubmitPrompt: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" beforeSubmitPrompt' }],
    preToolUse: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" preToolUse --if-active' }],
    postToolUse: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" postToolUse --if-active' }],
    afterFileEdit: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" afterFileEdit --if-active' }],
    subagentStop: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-event.sh" subagentStop --if-active' }],
    beforeShellExecution: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-approval.sh"' }],
    stop: [{ command: 'bash "$CURSOR_PROJECT_DIR/.cursor/hooks/insight-flow-stop.sh"' }],
  },
};

export interface InstallCursorHooksResult {
  hooksWritten: number;
  configWritten: boolean;
}

/**
 * Write `.cursor/hooks.json` + the hook scripts. Idempotent: existing files are
 * left in place unless `force` is set.
 */
export function installCursorHooks(cwd: string, force = false): InstallCursorHooksResult {
  const hooksDir = resolve(cwd, ".cursor", "hooks");
  if (!existsSync(hooksDir)) mkdirSync(hooksDir, { recursive: true });

  const scripts: Array<[string, string]> = [
    ["insight-flow-event.sh", EVENT_SCRIPT],
    ["insight-flow-stop.sh", STOP_SCRIPT],
    ["insight-flow-approval.sh", APPROVAL_SCRIPT],
  ];

  let hooksWritten = 0;
  for (const [file, body] of scripts) {
    const path = resolve(hooksDir, file);
    if (!existsSync(path) || force) {
      writeFileSync(path, body, { mode: 0o755 });
      hooksWritten++;
    }
  }

  const configPath = resolve(cwd, ".cursor", "hooks.json");
  let configWritten = false;
  if (!existsSync(configPath) || force) {
    writeFileSync(configPath, JSON.stringify(CURSOR_HOOKS_JSON, null, 2) + "\n");
    configWritten = true;
  }

  return { hooksWritten, configWritten };
}
