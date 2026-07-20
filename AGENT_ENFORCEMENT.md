STRICT ENFORCEMENT — TASK FILE MUTATIONS

- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside the tracker directory (insightFlow/workTasks/, legacy workTasks/)
- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)
- Running the script is MANDATORY — there are no exceptions, even for "minor" field updates
- Violation: direct file edit bypasses validation, ID sequencing, and audit trail
- Verify all CHECKLIST.md items before marking implemented or done
- Never mix tools for the same operation

TOKEN EFFICIENCY (applies to every role)

- No subagents. Direct tool calls only.
- Batch independent reads in one parallel round.
- Read only what the task scope explicitly requires.
