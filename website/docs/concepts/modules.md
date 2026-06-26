---
title: Everything is a module
sidebar_label: Everything is a module
sidebar_position: 2
---

# Everything is a module

insight-flow's whole agent layer is built from one shape. A **module** is a
single registry entry, validated by `AgentModuleSchema` — a discriminated union
keyed on `kind` in `packages/taskflow/src/core/schema/index.ts`. Whether it is a
paragraph of prompt text, an MCP server, a hook, or a rule about handing work to
the next agent, it is the same kind of thing: a small, named, validated unit you
can compose. That uniformity is the point — agents and flows are then just
_lists of module ids_, not bespoke data structures.

Every module carries a common base: an `id` (filename-safe; custom ids are
`custom:<slug>`), a `title`, an optional `description` (browsing UIs only —
never rendered into prompts or artifacts), a `source` (`builtin` or `custom`),
and an optional `target` (`claude` / `cursor` / `both`).

## The eight kinds

The discriminated union has **eight** `kind`s:

| `kind`              | What it is                                                              |
| ------------------- | ----------------------------------------------------------------------- |
| `section`           | An optional heading + a pre-formatted body of prompt text.              |
| `include`           | A verbatim `@<ref>` reference line (e.g. `@AGENT_ENFORCEMENT.md`).      |
| `mcp-server`        | An MCP server merged into the project's `.mcp.json`.                    |
| `hook`              | A Claude Code settings hook (optionally shipping its own script).       |
| `skill`             | A skill written to `.claude/skills/<name>/SKILL.md`.                    |
| `bundle`            | A module composed of other modules — the "molecule" tier.               |
| `status-transition` | Behavior-as-data: on completing a turn, an agent advances the status.   |
| `handover`          | Behavior-as-data: on completing a turn, an agent hands work to another. |
| `subagent`          | A native subagent written to `.claude/agents/<name>.md` (read by Claude and Cursor). |

These fall into three categories, plus the molecule.

## Category 1 — prompt text (`section`, `include`)

These render into the composed role Markdown as a pure sequence of blocks.

- **`section`** — an optional `heading` line plus a `body`. A module may be
  heading-only (it reserves a section that following modules continue), body-only
  (it continues the previous block — e.g. shared bullets appended under the
  preceding heading), or both. Bodies are emitted exactly as authored so the
  generated files can be byte-exact.
- **`include`** — emits a single `@<ref>` line. This is how shared protocol
  files like `@AGENT_ENFORCEMENT.md` get pulled into a role. Consecutive
  `include` modules group together without blank lines.

Everything the agent _says_ comes from these two kinds.

## Category 2 — installable artifacts (`mcp-server`, `hook`, `skill`, `subagent`)

These contribute **nothing** to the role Markdown. Instead the composer's
`collectArtifacts` (`packages/taskflow/src/agents/compose.ts`) gathers them, and
the install engine writes them to disk:

- **`mcp-server`** — merged into `.mcp.json` under `mcpServers[name]`, deduped by
  name (a same-name/different-config collision is an error). Its `config` may
  carry `${VAR}` placeholders, with optional `inputs` metadata to title/mask
  them.
- **`hook`** — reconciled into `.claude/settings.json` via a taskflow-managed
  manifest. A hook may ship its own `script`, written to `.claude/hooks/` and
  made executable.
- **`skill`** — written to `.claude/skills/<name>/SKILL.md`. The `name` is a
  restricted path segment so it can never traverse.
- **`subagent`** (N190) — a native subagent written to `.claude/agents/<name>.md`,
  which **both Claude and Cursor read** (Cursor also reads `.claude/agents/` for
  compatibility). The file carries union frontmatter so one file serves both
  harnesses: `name` + `description` (both), `tools` (Claude's allowlist),
  `readonly` / `is_background` (Cursor), and `model` only when set (vendor model
  ids differ; absent means inherit). `description` drives auto-delegation. This is
  the building block a fan-out **orchestrator** agent delegates to — see
  [Subagents & orchestration](../subagents/index.md).

## Category 3 — behavior-as-data (`handover`, `status-transition`)

These are the most distinctive kinds. They contribute neither prompt text nor an
artifact directly — they are **declarations** that the composer turns into
prompt instructions, so behavior lives as data instead of being hardcoded:

- **`status-transition`** (N128) — declares that `agent`, on completing its
  turn, advances the task to status `sets` (optionally only `from` a given
  status). The composer renders it as an "Advance the flow" instruction telling
  the agent to call the flow-validated setter, so a custom flow's agents emit
  _that flow's_ statuses rather than canonical literals.
- **`handover`** (N142) — declares that the agent it is composed into hands work
  to agent `to` (optionally only when the task is `on` a given status), with a
  `mode` of `auto` or `gated`. See [the handover system](./handover.md).

Because these are data, a custom flow can describe its own transitions and
handovers without anyone editing source code — the prompts are generated from
the declarations.

## The molecule — `bundle`

A **`bundle`** (N95) lists other module ids in its `modules` array. It is a
molecule built from atoms — e.g. an integration bundle might group its MCP
server, a prompt section, and a hook. At resolution time `resolveModules`
expands a bundle recursively, splicing its children in at the bundle's declared
position; the bundle itself contributes nothing. Repeated bundle refs are
deduped, and a bundle reachable from its own expansion throws a cycle error.

## Locked modules

Some modules are **locked** — read-only, never user-overridable or ejectable.
There are two flavors:

1. **The cross-cutting baseline trio.** `LOCKED_MODULE_IDS` in
   `packages/taskflow/src/core/locked.ts` is exactly `security`, `enforcement`,
   and `protocol`. These carry the safety, enforcement, and protocol rules every
   agent inherits, so they are off-limits to user editing. (This list is kept
   zod- and fs-free on purpose so both the server and the dashboard bundle import
   the same set without drift.)

2. **Locked by kind.** The _canonical lifecycle's_ `status-transition` and
   `handover` modules are also locked — a project may add its own, but it cannot
   rewrite the shipped lifecycle's transition/handover behavior. This is what
   keeps the default flow's guarantees intact while still letting custom flows
   declare their own.

## See also

- [From modules to agents](./agents.md) — how an ordered list of modules becomes
  one role prompt.
- [Built-in modules](../built-ins/default-modules.md) — the shipped registry,
  module by module.
- [The handover system](./handover.md) — the `handover` kind in depth.
- [Configuration](../configuration.md#agents) — `agents.extend` and
  `agents.custom`.
- [Composer MCP](../composer-mcp/index.md) — list, author, install, and delete
  modules as MCP tools.
