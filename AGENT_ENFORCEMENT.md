STRICT ENFORCEMENT — TASK FILE MUTATIONS
- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside workTasks/
- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)
- Running the script is MANDATORY — there are no exceptions, even for "minor" field updates
- Violation: direct file edit bypasses validation, ID sequencing, and audit trail

GIT / GH TOOL RULE
- Use ONLY the tool configured in `taskflow.prompt.json` → `gitTool`
- Default: `gh` for PR creation; `git` for branch/commit/push
- Never mix tools for the same operation
