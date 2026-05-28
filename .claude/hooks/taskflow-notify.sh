#!/bin/bash
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
curl -sf -X POST "http://localhost:${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true

exit 0
