#!/bin/bash
# Taskflow Notify Hook — fires OS notification when Claude finishes a turn.
# Registered as a Stop hook. Zero token cost — runs outside Claude's context.

# Get current task (suppress errors; exits cleanly if no project)
CURRENT=$(insight-flow current 2>/dev/null)
[ -z "$CURRENT" ] && exit 0

# Extract task ID and status without requiring jq
TASK_ID=$(echo "$CURRENT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
STATUS=$(echo "$CURRENT" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

[ -z "$TASK_ID" ] && exit 0

# Only notify on statuses that indicate the agent completed meaningful work
case "$STATUS" in
  implemented|approved|fix-needed|fixed|merged|changes-implemented)
    insight-flow notify "$TASK_ID $STATUS" 2>/dev/null || true
    ;;
esac

exit 0
