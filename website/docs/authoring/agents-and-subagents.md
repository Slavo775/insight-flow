---
title: Agents & subagents
sidebar_label: Agents & subagents
sidebar_position: 3
---

# Agents & subagents reference

The authoring flow is **5 orchestrator agents** (the lifecycle steps) that fan out
to **12 per-kind subagents** (the specialists). This page is the at-a-glance
reference for what each does — and what it deliberately doesn't.

:::tip Live detail
These tables describe roles, not the full prompts (which evolve). For the current,
authoritative detail, use the **dashboard composition map** (Flows → Composer
authoring, and each agent's subagent nodes) and the composer MCP
[`describe`](../composer-mcp/tools.md#describekind) tool.
:::

## The 5 agents

Each runs as a slash command once the flow is installed (e.g.
`/task-authoring-analyze`).

| Agent | Command | What it does | What it doesn't |
| --- | --- | --- | --- |
| **Authoring Analyst** | `task-authoring-analyze` | Turns a request into a deduplicated design brief; asks the opt-ins (activity engine, target harness); fans out to the 4 analyst subagents. Entry agent. | Doesn't author or install anything. |
| **Composer Taskmaster** | `task-authoring-create` | Writes the **detailed** authoring spec (description · goal · inventory of modules/subagents/agents/flows/relationships · implementer subtasks · verification) by scaffolding via `insight-flow create` then filling each section; creates the tracked task and binds it to the flow. Also handles **changes** to an existing spec. | If invoked without a prior analysis, hands **back to analyze first** (gated). Synthesizes from the analyst brief (no per-kind fan-out of its own); doesn't build definitions. |
| **Composer Implementer** | `task-authoring-implement` | **Builds and fixes** the definitions via the 4 author subagents (composer MCP `create_*`/`update_*`). Build mode: works the implementer-subtask checklist to every box ticked (`implement-start`/`-end`). Fix mode: on a `fix-needed` task (AI **or** human review) applies only the flagged blockers (`fix-start`/`-end`), then hands back to review. | Doesn't install (strictly — a later, approval-gated step), shouldn't need to read the insight-flow project (everything's in the spec — needing to look signals a bug to surface and fix), and stops on anything outside building the customization. A small change may be requested directly, without the taskmaster. |
| **Composer Reviewer** | `task-authoring-review` | **Runs both passes** in one agent, picked by intent (you gave feedback → human pass; else → AI pass). AI pass fans out to the 4 reviewer subagents and verifies the authored definitions against every **authoring requirement** (minimal, valid MCP JSON, externalized secrets, no name collision, reuse honoured, no read-only/built-in edits, custom-only) + schema + spec; writes REVIEW.md. Human pass records **your** decision verbatim. | Doesn't fix or install; on blockers routes back to the Implementer. An AI approval sets `ai-approved` and **loops back to the same agent for your pass** — the flow can't skip to test on AI approval alone; only your approval advances. Never decides on your behalf. |
| **Composer Installer** | `task-authoring-install` | **Install-first, then validate.** Runs pre-flight plan → installs the approved definitions (flows/agents/modules, composer MCP `install`) → validates the **real** install (commands, subagents, hooks, and `.mcp.json` entries are present **and correct**, references resolve, a smoke run) → marks the task **done**. Records the created `custom:` ids; follows the install edge-case checklist. Terminal step. | Fixes **installs, not definitions**: on a validation failure it **rolls back (uninstall)** and hands back to the Implementer (`fix-needed`). Won't change settings unrelated to the task (e.g. overwrite an unrelated `.mcp.json` entry) without your approval. |

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
  `implement`, in both its build and fix modes).
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
