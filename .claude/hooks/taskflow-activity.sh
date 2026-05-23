#!/bin/bash
# Taskflow Activity Hook — appends Claude Code tool events to activity log
# This runs automatically on PostToolUse — zero token cost to Claude.
LOG_FILE=".taskflow-activity.jsonl"

# Read the hook event JSON from stdin
INPUT=$(cat)

# Extract tool name and file path using lightweight parsing
TOOL=$(echo "$INPUT" | grep -o '"tool_name":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)
if [ -z "$FILE" ]; then
  FILE=$(echo "$INPUT" | grep -o '"command":"[^"]*"' | head -1 | cut -d'"' -f4)
fi

# Skip if no tool name captured
[ -z "$TOOL" ] && exit 0

# Append JSONL line
TS=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
if [ -n "$FILE" ]; then
  echo "{\"ts\":\"$TS\",\"tool\":\"$TOOL\",\"action\":\"use\",\"file\":\"$FILE\"}" >> "$LOG_FILE"
else
  echo "{\"ts\":\"$TS\",\"tool\":\"$TOOL\",\"action\":\"use\"}" >> "$LOG_FILE"
fi
