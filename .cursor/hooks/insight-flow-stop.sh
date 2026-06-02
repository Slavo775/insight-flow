#!/bin/bash
# insight-flow Cursor stop hook — logs agent-idle + fires OS/browser
# notification when the Cursor agent finishes a turn.
PROJECT_ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOCAL_BIN="$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="$PROJECT_ROOT/packages/taskflow/dist/cli.js"
if [ -x "$LOCAL_BIN" ]; then IF_CMD="$LOCAL_BIN"
elif [ -f "$LOCAL_CLI" ]; then IF_CMD="node $LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then IF_CMD="insight-flow"
else exit 0; fi
INPUT=$(cat)
echo "$INPUT" | $IF_CMD hook stop --provider cursor 2>/dev/null
CURRENT=$($IF_CMD current 2>/dev/null)
TASK_ID=$(echo "$CURRENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STATUS=$(echo "$CURRENT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$TASK_ID" ] && $IF_CMD notify "$TASK_ID $STATUS" 2>/dev/null || true
SERVER_PORT=6006
CONFIG_FILE="$PROJECT_ROOT/taskflow.config.json"
if [ -f "$CONFIG_FILE" ]; then
  _p=$(grep -o '"port":[[:space:]]*[0-9]*' "$CONFIG_FILE" | head -1 | grep -o '[0-9]*$')
  [ -n "$_p" ] && SERVER_PORT="$_p"
fi
curl -sf -X POST "http://localhost:${SERVER_PORT}/api/agent-done" >/dev/null 2>&1 || true
exit 0
