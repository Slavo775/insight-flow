#!/bin/bash
# insight-flow Cursor approval gate. Cursor has no PermissionRequest event; we
# synthesize approval-required + OS/browser notifications and return ask/allow.
HOOK_EVENT="${1:-beforeShellExecution}"
PROJECT_ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOCAL_BIN="$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="$PROJECT_ROOT/packages/taskflow/dist/cli.js"
if [ -x "$LOCAL_BIN" ]; then IF_CMD="$LOCAL_BIN"
elif [ -f "$LOCAL_CLI" ]; then IF_CMD="node $LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then IF_CMD="insight-flow"
else IF_CMD=""; fi
INPUT=$(cat)
CMD=$(echo "$INPUT" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
TOOL=$(echo "$INPUT" | grep -oE '"tool_name"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
SENSITIVE=0
case "$HOOK_EVENT" in
  beforeShellExecution)
    case "$CMD" in
      *"git push"*|*"git reset --hard"*|*"rm -rf"*|*"npm publish"*|*"--force"*|*deploy*) SENSITIVE=1 ;;
    esac
    ;;
  preToolUse)
    case "$TOOL" in
      Shell|Bash|shell|terminal|Terminal|run_terminal_cmd|run_terminal_command) SENSITIVE=1 ;;
    esac
    if [ "$SENSITIVE" = "0" ]; then
      case "$CMD" in
        *"git push"*|*"git reset --hard"*|*"rm -rf"*|*"npm publish"*|*"--force"*|*deploy*) SENSITIVE=1 ;;
      esac
    fi
    ;;
  beforeMCPExecution)
  # Cursor pauses MCP via this hook; gate all MCP executions (conservative).
    SENSITIVE=1
    ;;
esac
if [ "$SENSITIVE" = "1" ]; then
  if [ -n "$IF_CMD" ]; then
    echo "$INPUT" | $IF_CMD hook approval-required --provider cursor >/dev/null 2>&1
    $IF_CMD notify "Approval required" 2>/dev/null || true
  fi
  SERVER_PORT=6006
  CONFIG_FILE="$PROJECT_ROOT/taskflow.config.json"
  if [ -f "$CONFIG_FILE" ]; then
    _p=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | head -1 | grep -o '[0-9]*$')
    [ -n "$_p" ] && SERVER_PORT="$_p"
  fi
  curl -sf -X POST "http://localhost:${SERVER_PORT}/api/agent-permission" >/dev/null 2>&1 || true
  printf '{"permission":"ask","agent_message":"insight-flow flagged this operation as sensitive."}'
else
  if [ "$HOOK_EVENT" = "beforeShellExecution" ] && [ -n "$IF_CMD" ]; then
    echo "$INPUT" | $IF_CMD hook beforeShellExecution --provider cursor >/dev/null 2>&1
  fi
  printf '{"permission":"allow"}'
fi
exit 0
