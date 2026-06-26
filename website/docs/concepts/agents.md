---
title: From modules to agents
sidebar_label: From modules to agents
sidebar_position: 3
---

# From modules to agents

If a [module](./modules.md) is the atom, an **agent** is what you get by putting
atoms in order. A composed agent is nothing more than an _ordered list of module
ids_ plus a little identity — there is no per-agent prompt template, no special
casing. The `task-implement` agent, for instance, is literally this list
(`packages/taskflow/src/agents/composed/task-implement.json`):

```json
{
  "id": "task-implement",
  "title": "Task Implementer",
  "modules": [
    "task-implement/identity",
    "security",
    "enforcement",
    "protocol",
    "task-implement/input-contract",
    "task-implement/output-contract",
    "task-implement/role-specific-overrides",
    "task-implement/never",
    "minimal-diff",
    "task-implement/scope-guard",
    "scope-guard",
    "task-implement/handover-git-implemented",
    "task-implement/handover-git-changes",
    "actions"
  ]
}
```

The author controls placement explicitly: the order of the list is the order of
the prompt. Shared modules use flat ids (`security`, `minimal-diff`); role-scoped
modules are namespaced `<role>/<slug>` (`task-implement/input-contract`);
integration modules are namespaced `<integration>/<slug>` (`testing/hook`).

## Composition

`composeAgent` (`packages/taskflow/src/agents/compose.ts`) turns the list into
one role prompt:

1. **Resolve.** `resolveModules` walks the id list, looks each up in the
   registry, dedups by id (first wins), and **expands bundles** in place — a
   `bundle` module's children splice in at its position; the bundle itself
   contributes nothing. An unknown id throws before any output is produced.
2. **Render text.** Only the text kinds (`section`, `include`) become Markdown,
   in declared order, as a pure sequence of standalone blocks. The
   behavior-as-data kinds are transformed: each `status-transition` renders as an
   "Advance the flow" instruction, and **all** of an agent's `handover` modules
   collapse into a single "## Handover" section at the position of the first one.
3. **Collect artifacts.** The non-text kinds (`mcp-server`, `hook`, `skill`) are
   skipped by the Markdown pass and gathered separately by `collectArtifacts`
   for the install engine.

So one agent definition produces two things: a role prompt (its text) and a set
of installable artifacts (its MCP/hook/skill contributions).

## Bundles expand transparently

Because `resolveModules` expands bundles recursively, an agent can reference a
molecule and get all its atoms in place. This is how an integration ships as one
id but contributes its prompt, MCP server, and hook together. Dedup means
referencing the same module (or bundle) twice is harmless; a cycle throws.

## The JSON generates the `*_ROLE.md` files — drift-guarded

The JSON under `composed/` and `modules/` is the **source of truth** for the nine
shipped role prompts. The committed `*_ROLE.md` files at the repo root are
_generated_ from it via `insight-flow prompt-build --compose --apply`. They must
stay byte-identical to the composer's output — a test
(`test/compose.test.mjs`) enforces this. The workflow is: **edit the JSON,
re-run compose-apply, commit both** — never hand-edit the role Markdown, or the
drift guard fails.

```
modules/*.json  +  composed/<agent>.json
        │
        ▼  composeAgent (resolve → render → collect)
        │
        ├──▶  <AGENT>_ROLE.md     (text; drift-guarded)
        └──▶  .mcp.json / hooks / skills   (artifacts, at install time)
```

## Custom agents and installable commands

A composed agent can opt in (via its `command` field) to also install a runnable
**slash command** or **skill** carrying its own composed prompt — named by
`deriveCommandName` and guarded against colliding with the built-in command
names. When that command is installed, the prompt is stamped with a "Flow
identity" note so the agent identifies itself to insight-flow's lifecycle
commands (binding the task to its flow and attributing each status transition).

You don't author these JSON files by hand for project work — `agents.extend` and
`agents.custom` in [configuration](../configuration.md#agents) are the supported
surfaces. The module/agent JSON is the internal mechanism that makes those
surfaces possible.

## Orchestrators — agents that fan out to subagents (N191)

> Full guide: [Subagents & orchestration](../subagents/index.md) — including how
> an agent decides to delegate at runtime.

An agent can declare a `subagents` array of [`subagent`-module](./modules.md)
ids. When the agent is installed, those subagents are emitted (to
`.claude/agents/`) **and** its composed prompt gains a `## Subagents` section
listing them with fan-out / synthesize guidance — making it an **orchestrator**:

```jsonc
{
  "id": "custom:research-lead",
  "title": "Research lead",
  "modules": ["custom:research-lead-role"],
  "subagents": ["custom:web-researcher", "custom:codebase-explorer"]
}
```

At runtime the orchestrator spawns the relevant subagent(s) via the Task tool —
in parallel when their work is independent — and the **rejoin is automatic**: a
subagent's only exit is returning to its caller, and the Task tool waits for all
of them. So "fan out and rejoin" and "the worker hands back to the orchestrator"
are the same event, and you get them for free — no special handover. The
orchestrator then synthesizes the results and continues its own step (handing the
task onward with a normal handover). Both Claude and Cursor support this. Each
declared id must resolve to a `subagent` module, or validation fails.

The shipped **Task Reviewer** (`task-review`) is a built-in example (N192): it
declares the `review-correctness` and `review-security` subagents and fans out to
them when reviewing a diff, then synthesizes one verdict. The delegation is
permissive — if those subagents aren't installed (or the harness has none), the
reviewer still produces a verdict on its own, so the lifecycle degrades
gracefully.

## See also

- [Everything is a module](./modules.md) — the kinds an agent's list is made of.
- [Flows & the lifecycle](./flows.md) — how agents are wired into a lifecycle.
- [Built-in agents](../built-ins/default-agents.md) — each shipped agent's module
  list.
- [Agents](../agents/index.md) — what each agent does at runtime.
- [Composer MCP](../composer-mcp/index.md) — list, author, install, and delete
  agents as MCP tools.
