#!/bin/bash
# insight-flow lifecycle — UserPromptSubmit → agent-active (only for insight-flow skills)
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
PROMPT=$(echo "$INPUT" | grep -o '"prompt":"[^"]*"' | head -1 | cut -d'"' -f4)
SKILL=$(echo "$PROMPT" | grep -o '^/[a-zA-Z][a-zA-Z0-9_-]*' | head -1 | cut -c2-)
case "$SKILL" in
  task-implement|task-review|task-review-fix|task-human-review|taskmaster|taskmaster-change|task-git|task-incident|task-request-changes|complete-task)
    insight-flow log-event agent-active --source hook --hook-name UserPromptSubmit --session-id "$SESSION_ID" 2>/dev/null &
    ;;
  *)
    exit 0
    ;;
esac
