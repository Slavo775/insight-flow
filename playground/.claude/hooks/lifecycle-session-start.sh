#!/bin/bash
# insight-flow lifecycle — SessionStart → session-start event (no --if-active: fires for all sessions)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
insight-flow log-event session-start --source hook --hook-name SessionStart --session-id "$SESSION_ID" 2>/dev/null || true
