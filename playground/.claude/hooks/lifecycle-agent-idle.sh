#!/bin/bash
# insight-flow lifecycle — Stop → agent-idle (if active)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
insight-flow log-event agent-idle --source hook --hook-name Stop --session-id "$SESSION_ID" --if-active 2>/dev/null || true
if command -v osascript >/dev/null 2>&1; then
  osascript -e 'display notification "Agent idle" with title "insight-flow"' 2>/dev/null || true
fi
