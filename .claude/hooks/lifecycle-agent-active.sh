#!/bin/bash
# insight-flow lifecycle — UserPromptSubmit → agent-active for ANY installed insight-flow
# slash command (default, composer, or a custom flow). Recognition is dynamic: the
# command is treated as insight-flow work if its slash file exists under
# .claude/commands/. No hardcoded per-flow whitelist, so new custom flows work
# automatically (N211).
INPUT=$(cat)
SESSION_ID="${CLAUDE_SESSION_ID:-}"
if [ -z "$SESSION_ID" ]; then
  SESSION_ID=$(echo "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | cut -d'"' -f4)
fi
[ -z "$SESSION_ID" ] && exit 0
PROMPT=$(echo "$INPUT" | grep -o '"prompt":"[^"]*"' | head -1 | cut -d'"' -f4)
SKILL=$(echo "$PROMPT" | grep -o '^/[a-zA-Z][a-zA-Z0-9_-]*' | head -1 | cut -c2-)
[ -z "$SKILL" ] && exit 0
DIR="${CLAUDE_PROJECT_DIR:-.}"
if [ -f "$DIR/.claude/commands/$SKILL.md" ]; then
  insight-flow log-event agent-active --source hook --hook-name UserPromptSubmit --session-id "$SESSION_ID" 2>/dev/null &
fi
