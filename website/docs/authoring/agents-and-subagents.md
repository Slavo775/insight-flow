---
title: Agents & subagents
sidebar_label: Agents & subagents
sidebar_position: 3
---

# Agents & subagents reference

The authoring flow is **8 orchestrator agents** (the lifecycle steps) that fan out
to **12 per-kind subagents** (the specialists). This page is the at-a-glance
reference for what each does — and what it deliberately doesn't.

:::tip Live detail
These tables describe roles, not the full prompts (which evolve). For the current,
authoritative detail, use the **dashboard composition map** (Flows → Composer
authoring, and each agent's subagent nodes) and the composer MCP
[`describe`](../composer-mcp/tools.md#describekind) tool.
:::

## The 8 agents

Each runs as a slash command once the flow is installed (e.g.
`/task-authoring-analyze`).

| Agent | Command | What it does | What it doesn't |
| --- | --- | --- | --- |
| **Authoring Analyst** | `task-authoring-analyze` | Turns a request into a deduplicated design brief; asks the opt-ins (activity engine, target harness); fans out to the 4 analyst subagents. Entry agent. | Doesn't author or install anything. |
| **Composer Taskmaster** | `task-authoring-create` | Writes the authoring spec; creates the tracked task and binds it to the flow. | If invoked without a prior analysis, hands **back to analyze first** (gated). Doesn't build definitions. |
| **Composer Implementer** | `task-authoring-implement` | Builds the definitions via the 4 author subagents (composer MCP `create_*`/`update_*`). | Doesn't install — that's a later, approval-gated step. |
| **Composer Reviewer** | `task-authoring-review` | AI-reviews the authored definitions via the 4 reviewer subagents (schema, dedup/reuse, best practice). | Doesn't fix or install; routes to fix or human review. |
| **Composer Fixer** | `task-authoring-fix` | Applies the review blockers (via the author subagents), then re-reviews. | Touches only what review flagged; doesn't do wider rework without asking. |
| **Composer Human Review** | `task-authoring-human-review` | Records **your** decision verbatim; on approval advances to testing. | Never decides on your behalf or invents feedback. |
| **Composer Tester** | `task-authoring-test` | Validates the approved definitions **and confirms they work** (compose/render, install dry-run, exercise, clean up). | Doesn't install the real artifacts. |
| **Composer Installer** | `task-authoring-install` | Installs the approved definitions (composer MCP `install`), records the created `custom:` ids, marks the task done. Terminal step. | Doesn't start new authoring work. |

## The 12 subagents

A matrix of **3 roles × 4 authorable concerns**. The orchestrator for each step
fans out to the relevant column; the parent waits and rejoins automatically (see
[Subagents & orchestration](../subagents/index.md)).

| Role | `module` | `agent` | `flow` | `relationship` |
| --- | --- | --- | --- | --- |
| **Analyst** (read-only) | `module-analyst` | `agent-analyst` | `flow-analyst` | `relationship-analyst` |
| **Author** | `module-author` | `agent-author` | `flow-author` | `relationship-author` |
| **Reviewer** (read-only) | `module-reviewer` | `agent-reviewer` | `flow-reviewer` | `relationship-reviewer` |

- **Analysts** inventory the registry and report reuse candidates — each tagged
  with *needs only a small change?* and *referenced anywhere?* (used by
  `task-authoring-analyze`).
- **Authors** build the definitions: `describe(kind)` + `get` a template → apply
  the reuse-first rule → `create_*`/`update_*` → verify it validated (used by
  `implement` and `fix`).
- **Reviewers** check schema, reuse, and best practice, returning
  `id — issue — severity — fix` findings (used by `review`).

Each subagent prompt is structured as **Inputs · Steps · Output · Done ·
Boundaries**. Analysts and reviewers are read-only; only authors write. None of
them installs — installation is the orchestrator's terminal step.

The four **concerns**:

- **module** — any of the 9 [module](../concepts/modules.md) kinds
  (section/include/mcp-server/hook/skill/bundle/status-transition/handover/subagent).
- **agent** — a composed [agent](../concepts/agents.md) (modules + subagents + command).
- **flow** — a [flow](../concepts/flows.md) (agents + edges + statuses + install).
- **relationship** — [handovers](../concepts/handover.md) + flow edges between agents.

## The reuse-first rule

Every analyst, author, and reviewer applies the same decision rule (it lives in
one place — the composer conventions, surfaced by
[`describe`](../composer-mcp/tools.md#describekind)):

1. **Exact / near match, no change** → reuse it as-is (reference its id).
2. **Needs a small change** (an argument, a port, a label):
   - it's **your own `custom:` def and isn't referenced anywhere** → edit it in
     place (`update_*`).
   - it's a **built-in, or it's referenced elsewhere** → don't edit it; author a
     minimal **`custom:` variant**. Built-in defaults are read-only, and editing a
     referenced def would change behaviour for its consumers.
3. **Needs a wider rework** → **stop and ask** before authoring the reworked variant.
4. **Create a new `custom:` definition only when nothing suitable exists.**

This is why the analysts report whether each candidate is a *built-in* and whether
it's *referenced anywhere* — those signals decide reuse-as-is vs. custom variant vs.
ask.

## Guard rails

- **Locked tier** — `security` / `enforcement` / `protocol` modules and built-in
  `status-transition` / `handover` modules are never overridden.
- **Built-in flows** — never edited silently over the MCP (a deliberate dashboard
  action).
- **`custom:` ids for anything new; built-in defaults are read-only.** The
  authoring flow never edits a built-in in place — to change one it authors a
  `custom:` variant. (The framework and dashboard still *permit* ejecting a
  built-in for a deliberate one-off change; the guided flow just prefers variants
  so defaults stay upgradable.)

## See also

- [Walkthrough](./walkthrough.md) — the flow in action, with a worked example.
- [Composer MCP tools](../composer-mcp/tools.md) — `describe`, `list`/`get`,
  `create_*`/`update_*`, `install`/`uninstall`, `delete`.
- [Subagents & orchestration](../subagents/index.md) — fan-out and rejoin.
