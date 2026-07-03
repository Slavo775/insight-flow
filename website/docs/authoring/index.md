---
title: Authoring customizations
sidebar_label: Overview
sidebar_position: 1
---

# Authoring customizations

insight-flow ships a second built-in flow — **Composer authoring**
(`composer-authoring`) — a guided lifecycle for building your **own** custom
[modules](../concepts/modules.md), [agents](../concepts/agents.md), and
[flows](../concepts/flows.md). It's the composer model
([Composer MCP](../composer-mcp/index.md)) wrapped in the same analyze → review →
ship discipline as the default task flow, with specialist
[subagents](../subagents/index.md) doing the heavy lifting.

## What you get

- **A guided path** from "I want a module/agent/flow that does X" to an installed,
  reviewed definition — without hand-writing JSON or memorising the schema.
- **A clear design method.** The analyst works top-down through a fixed method —
  **intent** (a whole flow, one agent, or one module) → **goal** → design
  **flow → agents → modules** → **reuse** → **impact** → **MCP discovery** — so
  the design is deliberate before anything is built.
- **Reuse over duplication.** Every request is first checked against the existing
  registry; the flow prefers reusing what's there.
- **Custom-only, upgrade-safe.** Built-in defaults are treated as **read-only**:
  to change a built-in the flow authors a `custom:` **variant** rather than
  editing the shipped default, so your defaults stay clean and package-upgradable.
- **Key-free MCP discovery.** When a design needs an MCP server, the analyst finds
  one by **web search** — the free **[GitHub MCP Registry](https://github.com/mcp)**
  (`github.com/mcp`) and the Official MCP Registry — no API key, nothing to install.
- **Specialist subagents.** Each step fans out to per-kind experts (module /
  agent / flow / relationship) so the work is focused and parallel.
- **Safety rails.** Human review before anything is installed; the locked tier
  (security/enforcement/protocol) is never overridden; built-in flows are never
  silently edited.
- **A tracked lifecycle.** Authoring runs as a normal tracked task — it moves
  across the dashboard board and records activity, just like product work.

## When to use it (vs. doing it directly)

| Situation | Use |
| --- | --- |
| A non-trivial customization — a new agent, a whole flow, several related modules; you want dedup + review before it ships | **The authoring flow** (this section) |
| A one-off, well-understood change — tweak a single module, eject a built-in | The **dashboard** composer, or the [Composer MCP](../composer-mcp/tools.md) tools directly |

The flow doesn't replace the dashboard/MCP — it *orchestrates* them for the cases
where guidance, deduplication, and review pay off.

## The lifecycle at a glance

```
analyze → create → implement → review → human-review → test → install → done
                       ▲          │
                       └─── fix ◀─┘        (review found blockers)
```

- **Entry** at `analyze` (recommended) or `create`. If you start at `create`
  without a prior analysis, it hands **back to analyze first** (gated) so the
  request is understood and deduplicated.
- **Install happens only after human review approves** — the `install` step is
  the terminal action.
- Each agent runs as a slash command (`/task-authoring-analyze`,
  `/task-authoring-implement`, …) once the flow is installed.

## Install it

The flow is built-in, so it shows up in the dashboard **Flows** browser and over
the MCP immediately. Installing it wires up the commands, the specialist
subagents, the **composer MCP** (`mcp-composer`), and the **activity engine**:

```text
# from the dashboard (Flows → Composer authoring → Install), or over the MCP:
install(kind="flow", id="composer-authoring")
```

That emits, into your project:

- `.claude/commands/task-authoring-*.md` — the 8 agent commands
- `.claude/agents/*.md` — the 12 per-kind subagents
- `.mcp.json` — the `composer` server entry (stdio; nothing to start/stop)
- the activity-engine hooks (so authoring tasks record events)

Open a fresh session so the subagents load, then start with
`/task-authoring-analyze "I want a module that …"`.

## Next

- [Walkthrough](./walkthrough.md) — install → analyze → … → install, with a
  worked example (author a custom module).
- [Agents & subagents reference](./agents-and-subagents.md) — what each agent and
  subagent does (and doesn't).
