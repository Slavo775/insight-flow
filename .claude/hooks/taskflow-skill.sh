#!/bin/bash
# Taskflow Skill Hook — detects /skill invocations (UserPromptSubmit)
LOG_FILE=".taskflow-activity.jsonl"
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | grep -o '"prompt":"[^"]*"' | head -1 | cut -d'"' -f4)
SKILL=$(echo "$PROMPT" | grep -o '^/[a-zA-Z][a-zA-Z0-9_-]*' | head -1 | cut -c2-)
[ -z "$SKILL" ] && exit 0
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
echo "$SKILL" > "${LOG_FILE%.jsonl}.last-skill"
printf '{"ts":"%s","tool":"Skill","action":"started","skill":"%s"}\n' "$TS" "$SKILL" >> "$LOG_FILE"
