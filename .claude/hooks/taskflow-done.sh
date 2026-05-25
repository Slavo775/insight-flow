#!/bin/bash
# Taskflow Done Hook — emits Skill completed event (Stop)
LOG_FILE=".taskflow-activity.jsonl"
SKILL_FILE="${LOG_FILE%.jsonl}.last-skill"
if [ -f "$SKILL_FILE" ]; then
  SKILL=$(cat "$SKILL_FILE")
  rm -f "$SKILL_FILE"
else
  SKILL="unknown"
fi
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
printf '{"ts":"%s","tool":"Skill","action":"completed","skill":"%s"}\n' "$TS" "$SKILL" >> "$LOG_FILE"
