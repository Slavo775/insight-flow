STRICT ENFORCEMENT — TASK FILE MUTATIONS

- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside the tracker directory (insightFlow/workTasks/, legacy workTasks/)
- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)
- Running the script is MANDATORY — there are no exceptions, even for "minor" field updates
- Violation: direct file edit bypasses validation, ID sequencing, and audit trail

GIT RULE

- Use `git` for branch creation, commits, and push (universal — works on any host).
- PR creation: use the command defined in `taskflow.config.json.agents.extend.task-git` for your project. insight-flow does not ship a default. See `@PR_API.md` for examples by host (GitHub `gh`, GitLab `glab`, no-CLI compare URL).
- Branch naming: <type>/<task-id>-<slug>
- Verify all CHECKLIST.md items before marking implemented or done
- Never mix tools for the same operation

HANDOVER RULE

- A `## Handover` section lists the next agent(s); pick the one matching your outcome.
- `auto` lets you invoke the next agent in-session without pausing to ask which — it NEVER bypasses git/permission gates or consent. `gated` requires an explicit human go-ahead first; silence is not approval.
- Never `auto`-chain back to an agent already run for this task this session (cycle guard). See `@AGENT_PROTOCOL.md` "HANDOVER DISCIPLINE".

TOKEN EFFICIENCY (applies to every role)

- No subagents. Direct tool calls only.
- Batch independent reads in one parallel round.
- Read only what the task scope explicitly requires.
