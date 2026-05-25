#!/bin/bash
# insight-flow lifecycle — PreToolUse → tool-requested (if active)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
insight-flow log-event tool-requested --source hook --hook-name PreToolUse --session-id "$SESSION_ID" --if-active 2>/dev/null || true
