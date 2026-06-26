---
title: Subagents & orchestration
sidebar_label: Subagents & orchestration
sidebar_position: 1
---

# Subagents & orchestration

A big agent doesn't have to do everything itself. insight-flow lets an agent
**fan out** to focused **subagents** — each running in its own context window —
and synthesize their results. This page is the hub: what subagents are, how an
agent decides to delegate at runtime, how that relates to handovers, and how to
author your own.

> **TL;DR.** A `subagent` is a module emitted to `.claude/agents/<name>.md`
> (read by **Claude and Cursor**). An agent becomes an **orchestrator** by
> declaring a `subagents` list; its prompt then carries a `## Subagents` section
> telling it to delegate. The harness's **Task tool** spawns them and **waits for
> them automatically** — so "fan out" and "the worker hands back" are the same
> free event. It's **recommended, not forced**: the agent still works with no
> subagents.

## What a subagent is

A subagent is the [`subagent` module kind](../concepts/modules.md). Unlike prompt
modules (which build an agent's role text), a subagent is an **installable
artifact**: it emits to `.claude/agents/<name>.md`, which **both Claude Code and
Cursor read** (Cursor reads `.claude/agents/` for compatibility, so one file
serves both). It carries:

| Field        | Purpose                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| `name`       | The `.claude/agents/<name>.md` filename + how it's addressed.           |
| `description`| **Drives auto-delegation** — the harness matches tasks to this text.    |
| `content`    | The subagent's system prompt (its instructions).                        |
| `tools`      | Claude tool allowlist (e.g. `Read`, `Grep`, `Edit`). Cursor inherits.   |
| `readonly`   | Cursor: blocks writes/state-changing commands.                          |
| `model`      | Optional; vendor model id or omitted (= inherit).                       |

insight-flow writes **union frontmatter** — Claude reads `tools`, Cursor reads
`readonly`/`is_background`, both read `name`/`description` — so a single file is
correct on either harness. `model` is written only when set (vendor model
namespaces differ; absent means inherit).

## Orchestrators — fan out and rejoin

An agent becomes an **orchestrator** by declaring a `subagents` array of
subagent-module ids:

```jsonc
{
  "id": "custom:verifier",
  "title": "Verifier",
  "modules": ["custom:verifier-role"],
  "subagents": ["review/correctness", "review/security", "custom:perf-auditor"]
}
```

Installing it does two things:

1. **Emits** those subagents to `.claude/agents/` (reference-safe — shared
   subagents aren't double-written or deleted out from under another owner).
2. **Injects a `## Subagents` section** into the orchestrator's composed prompt,
   listing each subagent and instructing it to spawn the relevant ones in
   parallel, then synthesize.

The **rejoin is automatic.** A subagent's only exit is returning to its caller,
and the Task tool waits for every subagent it spawned before the orchestrator
resumes. So **"fan out and rejoin" and "the worker hands back to the
orchestrator" are the same event** — you get the join for free. There is no
"last worker" and no barrier to manage; the parent *is* the join point.

## How an agent decides to delegate (runtime)

This is the part that surprises people: **insight-flow doesn't run anything.** It
produces the prompt and the subagent files; the **harness** (Claude Code /
Cursor) does the spawning. An agent delegates based on three signals:

1. **Its own prompt** — the `## Subagents` section explicitly tells it to use the
   **Task tool** to spawn the relevant subagent(s). (Strongest signal.)
2. **Each subagent's `description`** — Claude and Cursor **auto-delegate** by
   matching the task to a subagent's description. This is why `description`
   matters: it's the routing key.
3. **Explicit invocation** — a human (or the agent) names it: in Cursor
   `/review-security <…>`, or "use the review-correctness subagent."

When the agent calls the Task tool with a subagent, the harness loads that
`.claude/agents/<name>.md`, runs it in a **separate context window** (with its
own `tools`/`model`), and returns its result to the parent. Multiple subagents
can run in **parallel** via concurrent Task calls.

### It's recommended, not forced

Delegation is **model-driven and non-deterministic** — insight-flow makes it
*available and recommended*, but nothing forces the model to delegate. That's
deliberate: it means **graceful degradation** — the orchestrator still completes
on its own if it doesn't delegate, or if the harness has no subagents (so flows
stay portable across Claude, Cursor, and bare setups).

### Caveat: a fresh session loads the subagents

Claude Code and Cursor load available subagents **at session start**. After
installing an orchestrator (which writes the `.claude/agents/*.md` files), start
a **fresh session** for the named subagents to be spawnable.

## Subagents vs handovers

Both move work between agents, but they're different mechanisms — pick by shape:

| You want…                                  | Use          | How                                                            |
| ------------------------------------------ | ------------ | ------------------------------------------------------------- |
| The next single agent in a pipeline        | **Handover** | A flow edge `from → to`.                                      |
| **One of several** next agents (a choice)  | **Handover** | Multiple handovers + a [`when`](../concepts/handover.md) reason per branch — the agent free-picks. |
| **Several agents at once** (fan-out)       | **Subagents**| Declare `subagents`; the Task tool spawns them in parallel.   |
| Wait for several to finish, then continue  | **Subagents**| Automatic — the orchestrator resumes when its subagents return. |

The rule of thumb: a **handover moves the single task token** (so it's inherently
sequential or 1-of-N), while **subagents run concurrent work inside one step**
(so they're how you get parallelism *and* a free join). A cross-task "wait for N
independent agents" barrier is deliberately **not** modeled — insight-flow gates
and advises flows, it doesn't schedule them.

## Authoring

Three ways, same result:

- **Dashboard** — Modules → New (kind `subagent`); set it on an agent's
  `subagents` in the agent editor. Browse it under the agent's composition map.
- **[Composer MCP](../composer-mcp/index.md)** — `create_module` with
  `kind: "subagent"`, then `create_agent`/`update_agent` with a `subagents`
  array; `install(kind: "agent" | "flow", …)` emits the files. This is how an AI
  assistant builds your subagents for you.
- **JSON** — drop the definitions in `insightFlow/{modules,agents,projects}/`.

### Worked example — a delivery pipeline

A 5-agent flow where three agents fan out:

```
intake ─(when "brief & research gathered")▶ architect ─(when "design approved")▶ builder
  ⤳ web-researcher, codebase-scout                                                  │
                                                          (when "implementation complete", auto)
                                                                                     ▼
verifier ◀────────────────────────────────────────────────────────────────────── builder
  ⤳ review-correctness, review-security, perf-auditor          ⤳ frontend-dev, backend-dev
   ├─(when "all checks pass")▶ shipper
   └─(when "blockers were found")▶ builder        ← 1-of-N branch + back-edge
```

- `intake`, `builder`, `verifier` are **orchestrators** (they declare
  `subagents`). `verifier` mixes **built-in** subagents (`review/correctness`,
  `review/security`) with a **custom** one (`perf-auditor`).
- Every edge carries a **`when`** reason; the verifier's two outgoing handovers
  render as an explicit 1-of-N pick in its `## Handover` section.

## See also

- [Everything is a module](../concepts/modules.md) — the `subagent` kind among the others.
- [From modules to agents](../concepts/agents.md) — composing agents + the orchestrator field.
- [The handover system](../concepts/handover.md) — handovers, `mode`, and the `when` branch reason.
- [Composer MCP](../composer-mcp/index.md) — authoring subagents/agents/flows as tools.
