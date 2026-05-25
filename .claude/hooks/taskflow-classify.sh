#!/bin/bash
# Taskflow Classify Hook — labels common Bash commands (PreToolUse)
LOG_FILE=".taskflow-activity.jsonl"
INPUT=$(cat)
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$TOOL" != "Bash" ] && exit 0
CMD=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -z "$CMD" ] && exit 0

LABEL=""
case "$CMD" in
  *pnpm\ test*) LABEL="Running tests" ;;
  *npm\ test*) LABEL="Running tests" ;;
  *yarn\ test*) LABEL="Running tests" ;;
  *jest*) LABEL="Running tests" ;;
  *vitest*) LABEL="Running tests" ;;
  *node:test*) LABEL="Running tests" ;;
  *git\ commit*) LABEL="Committing" ;;
  *git\ push*) LABEL="Pushing" ;;
  *gh\ pr\ create*) LABEL="Creating PR" ;;
  *pnpm\ build*) LABEL="Building" ;;
  *npm\ run\ build*) LABEL="Building" ;;
  *yarn\ build*) LABEL="Building" ;;
  *tsc\ *) LABEL="Building" ;;
  *pnpm\ lint*) LABEL="Linting" ;;
  *npm\ run\ lint*) LABEL="Linting" ;;
  *eslint*) LABEL="Linting" ;;
esac

[ -z "$LABEL" ] && exit 0
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
SAFE=$(echo "$CMD" | head -c 120 | sed 's/\\/\\\\/g' | sed 's/"/\\"/g')
printf '{"ts":"%s","tool":"Tool","action":"classified","label":"%s","file":"%s"}\n' "$TS" "$LABEL" "$SAFE" >> "$LOG_FILE"
