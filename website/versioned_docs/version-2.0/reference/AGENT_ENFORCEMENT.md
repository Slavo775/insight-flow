---
title: AGENT_ENFORCEMENT.md
sidebar_label: Agent enforcement
sidebar_position: 12
description: Reference copy of AGENT_ENFORCEMENT.md, generated from the repo root.
---
<!--
  AUTO-GENERATED FILE — DO NOT EDIT.
  Source of truth: AGENT_ENFORCEMENT.md at the repository root.
  Regenerate with: pnpm --dir website sync
-->

> **Reference copy.** Generated from `AGENT_ENFORCEMENT.md` at the repository root.
> Edit the source file, not this copy.
STRICT ENFORCEMENT — TASK FILE MUTATIONS

- NEVER use Edit, Write, or file-creation tools on: tracker.json, TASK.md, CHECKLIST.md, or any file inside the tracker directory (insightFlow/workTasks/, legacy workTasks/)
- ALL task state changes MUST go through `insight-flow` CLI commands (create, update-status, set-review, etc.)
- Running the script is MANDATORY — there are no exceptions, even for "minor" field updates
- Violation: direct file edit bypasses validation, ID sequencing, and audit trail
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
