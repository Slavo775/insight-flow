#!/bin/bash
# insight-flow lifecycle — PostToolUse → tool-approved / file-written / file-edited (if active)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$TOOL" ] && exit 0
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
case "$TOOL" in
  Write)
    insight-flow log-event file-written --source hook --hook-name PostToolUse --session-id "$SESSION_ID" --data "{\"tool_name\":\"Write\",\"path\":\"$FILE_PATH\"}" --if-active 2>/dev/null &
    ;;
  Edit|MultiEdit)
    insight-flow log-event file-edited --source hook --hook-name PostToolUse --session-id "$SESSION_ID" --data "{\"tool_name\":\"$TOOL\",\"path\":\"$FILE_PATH\"}" --if-active 2>/dev/null &
    ;;
  *)
    insight-flow log-event tool-approved --source hook --hook-name PostToolUse --session-id "$SESSION_ID" --data "{\"tool_name\":\"$TOOL\"}" --if-active 2>/dev/null &
    ;;
esac
