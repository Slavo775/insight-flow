---
title: Prompt cookbook
sidebar_label: Prompt cookbook
sidebar_position: 3
---

# Prompt cookbook

Copy-paste templates for `/task-authoring-analyze`. There is one template each
for a **module**, an **agent**, and a **flow** (with its handovers), plus one
filled example of each. A good prompt answers what the analyst asks anyway, so
you get a better design on the first pass and fewer questions.

This page is the **prompt** path. To write the JSON yourself over the composer
MCP, see the guides for a [custom module](../guides/custom-module.md), a
[custom agent](../guides/custom-agent.md), and a
[custom flow](../guides/custom-flow.md).

## What a good prompt includes

The analyst works a fixed method (see the [Walkthrough](./walkthrough.md#1-start-with-analysis)).
Each template field feeds one step of it:

| Field | Feeds this step | What to write |
| --- | --- | --- |
| `Intent:` | **intent** | What you want to build: a flow, an agent, or a module. |
| `Goal:` | **goal** | One sentence: what the built thing must do. |
| `Design:` | **design** (flow → agents → modules) and **MCP discovery** | The parts you already see, the tools it needs (say if one is an MCP server), and your constraints. |
| `Handovers:` (flow only) | **design** — the flow's edges | Entry point, each edge as `on <status> → <next agent> (auto\|gated)`, and the finish. |
| `Reuse:` | **reuse** and **impact** | Existing modules / agents / flows you think fit, and what must not change. |
| `Opt-ins:` | the two opt-ins | **Activity engine** yes/no (live status, tokenless) and **harness**: Claude, Cursor, or both. |

**Keep the balance.** Give the **intent, goal, and constraints**. Do **not**
dictate the JSON — no ids, no module lists, no schema fields. Let the analyst
check the registry, remove duplicates, and push back. It follows the
[reuse-first rule](./agents-and-subagents.md#the-reuse-first-rule), so it may
reuse or extend something you didn't know existed.

Leave a field out if you don't know it — the analyst asks. Each block goes
**inside the quotes** after the command, like this:

```text
/task-authoring-analyze "Intent: one module
Goal: …"
```

## Module

The smallest part: one piece of prompt text, one shared file, one MCP server,
one hook, and so on.

**Template**

```text
Intent: one module (kind if you know it: section / include / mcp-server / hook / skill / …)
Goal: <one sentence — what this module adds to an agent>
Design:
  - Content: <the text, file, server, or script it carries>
  - Used by: <which agent(s) should compose it>
  - Tools / MCP: <a tool or MCP server it needs, or "none">
  - Constraints: <limits — short, no secrets in the text, …>
Reuse: <an existing module that might fit, or "none known">; must not change <anything that other agents rely on>
Opt-ins: activity engine — <yes / no / n/a>; harness — <Claude / Cursor / both>
```

**Example**

```text
Intent: one module (a section)
Goal: remind an agent to run step X and write the result into its report before it finishes.
Design:
  - Content: a short heading plus 3 bullet points — run step X, check the result, write it into the report.
  - Used by: my review agent, and later any other agent.
  - Tools / MCP: none.
  - Constraints: under 10 lines; plain text only.
Reuse: there may already be a "quality gates" section — reuse or extend it if it fits; don't change the built-in one.
Opt-ins: activity engine — n/a (no flow); harness — both.
```

## Agent

One runnable role: an ordered list of modules, plus any hooks, MCP servers,
skills, or subagents it needs.

**Template**

```text
Intent: one agent
Goal: <one sentence — what the agent does from start to finish>
Design:
  - Input: <what it reads first — the task spec, files, a status>
  - Steps: <the main steps, in order>
  - Output: <what it leaves behind — files, a status, a report>
  - Tools / MCP: <tools or MCP servers it needs, or "none">
  - Subagents: <parallel work to fan out, or "none">
  - Constraints: <what it must never do>
  - Hands over to: <the next agent and when, or "none — standalone">
Reuse: <existing agents or modules that might fit>; must not change <built-ins or agents that other flows use>
Opt-ins: activity engine — <yes / no>; harness — <Claude / Cursor / both>
```

**Example**

```text
Intent: one agent
Goal: read a finished task's changes and write a short summary of them into the task folder.
Design:
  - Input: the task spec and the list of changed files.
  - Steps: read the changes, group them by area, write SUMMARY.md.
  - Output: SUMMARY.md in the task folder; no code changes.
  - Tools / MCP: none — reading files is enough.
  - Subagents: one per area when there are more than 3 areas, in parallel.
  - Constraints: read-only except SUMMARY.md; never commit or push.
  - Hands over to: none — standalone.
Reuse: a reviewer agent may already read the changed files — reuse its modules if it fits.
Opt-ins: activity engine — yes; harness — Claude.
```

## Flow (+ handovers)

A set of agents joined by edges. Write each edge in the `Handovers:` block as
`on <status> → <next agent>`, then `(auto)` or `(gated)`, then a short `when`
reason. `gated` stops and waits for you; `auto` starts the next agent in the
same session. Don't make a back-edge (a loop back to an earlier agent) `auto`.

**Template**

```text
Intent: a whole flow
Goal: <one sentence — what the flow takes in and what it delivers at the end>
Design:
  - Agents: <each agent and its one job>
  - Tools / MCP: <tools or MCP servers any agent needs, or "none">
  - Constraints: <rules for the whole flow>
Handovers:
  - Entry: <the agent a person starts with>
  - on <status> → <next agent> (auto|gated) — when: <reason>
  - on <status> → <next agent> (auto|gated) — when: <reason>
  - Finish: on <status> → done (or a finish agent)
Reuse: <existing flows, agents, or modules that might fit>; must not change <built-in flows or shared agents>
Opt-ins: activity engine — <yes / no>; harness — <Claude / Cursor / both>
```

**Example**

```text
Intent: a whole flow
Goal: take a request, draft X, check the draft, and finish only when a person approves it.
Design:
  - Agents: draft-agent (writes the draft), check-agent (checks it against the request and lists problems).
  - Tools / MCP: none.
  - Constraints: nothing is published until a person approves.
Handovers:
  - Entry: draft-agent
  - on drafted → check-agent (auto) — when: a draft is ready to check
  - on check-failed → draft-agent (gated) — when: the problems need a person to look first
  - Finish: on checked → done
Reuse: the built-in review agent may fit as check-agent — make a custom variant if it needs changes.
Opt-ins: activity engine — yes; harness — both.
```

Is the work really several flows, one after another (for example prepare →
implement → deploy)? Then say so in `Intent:` — the analyst proposes a
**chain** that links existing flows instead of one big merged flow.

## Copy-paste tips

- Paste the filled block straight after `/task-authoring-analyze "` and close the quote.
- Say what you want and why — not the JSON. The analyst designs the definitions.
- Answer both opt-ins (activity engine, harness) up front to skip a round of questions.
- Expect push-back: the analyst may propose reuse or a smaller design. That is the point.
