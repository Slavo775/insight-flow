#!/bin/bash
# insight-flow Cursor event hook — pipes Cursor's stdin JSON to the binary,
# which parses it (conversation_id, tool fields) and logs the event tagged
# --provider cursor. $1 = Cursor event name; any remaining args (e.g.
# --if-active) pass through, so tool events are gated to active sessions.
[ -z "$1" ] && exit 0
EVENT="$1"; shift
PROJECT_ROOT="${CURSOR_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOCAL_BIN="$PROJECT_ROOT/node_modules/.bin/insight-flow"
LOCAL_CLI="$PROJECT_ROOT/packages/taskflow/dist/cli.js"
if [ -x "$LOCAL_BIN" ]; then IF_CMD="$LOCAL_BIN"
elif [ -f "$LOCAL_CLI" ]; then IF_CMD="node $LOCAL_CLI"
elif command -v insight-flow >/dev/null 2>&1; then IF_CMD="insight-flow"
else exit 0; fi
$IF_CMD hook "$EVENT" --provider cursor "$@" 2>/dev/null
exit 0
