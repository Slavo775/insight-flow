#!/bin/bash
# insight-flow lifecycle — PermissionRequest → approval-required (if active) + bell + notification
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
insight-flow log-event approval-required --source hook --hook-name PermissionRequest --session-id "$SESSION_ID" --if-active 2>/dev/null &
printf '\a'
insight-flow notify "Approval required" 2>/dev/null &
