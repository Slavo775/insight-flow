#!/bin/bash
# insight-flow lifecycle — Stop → agent-idle (if active)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
insight-flow log-event agent-idle --source hook --hook-name Stop --session-id "$SESSION_ID" --if-active 2>/dev/null &
insight-flow notify "Agent idle" 2>/dev/null &
