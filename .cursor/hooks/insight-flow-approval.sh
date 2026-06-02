#!/bin/bash
# insight-flow Cursor approval gate — beforeShellExecution. Cursor has no
# PermissionRequest event, so we synthesize "approval required": on a sensitive
# command we emit approval-required + a notification and ask Cursor to prompt;
# otherwise we allow. Cursor reads the {"permission":...} JSON from stdout.
# Conservative matcher; never auto-denies. Tune the patterns to taste.
# Hook logging must not write to stdout here — log-event prints JSON and would
# corrupt the permission response Cursor parses.
PROJECT_ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOCAL_BIN="$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="$PROJECT_ROOT/packages/taskflow/dist/cli.js"
if [ -x "$LOCAL_BIN" ]; then IF_CMD="$LOCAL_BIN"
elif [ -f "$LOCAL_CLI" ]; then IF_CMD="node $LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then IF_CMD="insight-flow"
else IF_CMD=""; fi
INPUT=$(cat)
CMD=$(echo "$INPUT" | grep -oE '"command"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | cut -d'"' -f4)
SENSITIVE=0
case "$CMD" in
  *"git push"*|*"git reset --hard"*|*"rm -rf"*|*"npm publish"*|*"--force"*|*deploy*) SENSITIVE=1 ;;
esac
if [ "$SENSITIVE" = "1" ]; then
  if [ -n "$IF_CMD" ]; then
    echo "$INPUT" | $IF_CMD hook approval-required --provider cursor >/dev/null 2>/dev/null
    $IF_CMD notify "Approval required" 2>/dev/null || true
  fi
  printf '{"permission":"ask","agent_message":"insight-flow flagged this command as sensitive."}'
else
  if [ -n "$IF_CMD" ]; then
    echo "$INPUT" | $IF_CMD hook beforeShellExecution --provider cursor >/dev/null 2>/dev/null
  fi
  printf '{"permission":"allow"}'
fi
exit 0
