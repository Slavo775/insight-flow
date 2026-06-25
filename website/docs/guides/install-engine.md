---
title: Install & uninstall modules
sidebar_label: Install engine
sidebar_position: 7
---

# Install & uninstall modules

The install engine turns a **target** — a flow, an agent, or a single module —
into concrete project files: `.mcp.json` MCP servers, `.claude/settings.json`
hooks, `.claude/skills/<name>/SKILL.md` skills, and `.claude/commands/<name>.md`
slash commands. It is driven from the **dashboard**, with a preview plan, live
progress, and reference-safe uninstall.

## 1. Open the dashboard

```bash
insight-flow ui            # → http://localhost:6006
```

Browse to a flow, agent, or module. An **Install** button is offered for any
target that has installable artifacts. (A pure `section` / `include` module has
none, so it isn't installable on its own — install the agent or flow that uses
it.)

## 2. Review the install plan

Before anything is written, the engine derives the **install plan** — the
deduped, ordered list of artifacts the target would write (MCP first, then hooks,
skills, commands), each with its target path. For a flow, that's every artifact
contributed by its agents **plus** its `install` list, flattened and deduped.

The modal shows each step, e.g.:

```
MCP server: context7        → .mcp.json
Hook: PostToolUse           → .claude/settings.json
Skill: my-skill             → .claude/skills/my-skill/SKILL.md
Command: /task-spec-writer  → .claude/commands/task-spec-writer.md
```

## 3. Fill `${VAR}` inputs {#var-inputs}

If any `mcp-server` config (or hook command) contains a `${VAR}` placeholder, the
plan lists it as a **required input**. insight-flow resolves these itself (it does
not rely on Claude Code's own `${VAR}` expansion). Inputs are **secret by
default** — masked in the UI and kept out of logs.

- Submitted values are substituted into the resolved config that's written to
  disk.
- New values are persisted to a gitignored secrets file so a re-install doesn't
  re-prompt.
- Runtime/build placeholders (`${CLAUDE_PROJECT_DIR}`, `${ARGUMENTS}`,
  `${INSIGHT_FLOW_BIN}`) are **never** treated as inputs — they're left literal.

Submit the plan to run it. Progress streams step-by-step, each reported as
`created` / `updated` / `unchanged` / `removed`. A re-install with identical
artifacts reports every target `unchanged` (the engine is idempotent).

## 4. The manifest

Every write is tracked in a sidecar manifest at
**`.claude/taskflow-managed.json`**, bucketed per install target
(`flow:<id>` / `agent:<id>` / `module:<id>`). The manifest is what makes
install/uninstall reference-safe: applying target A only touches A's own entries,
and an artifact owned by more than one target is never removed while another
target still claims it. Commit this file — it's how the engine knows what it owns.

## 5. Conflicts, undo & uninstall

- **Conflict.** If `.mcp.json` already defines a server with a **different**
  config, the install stops with a conflict (HTTP 409) rather than clobbering it.
  The modal shows a before/after diff and offers an explicit **overwrite (force)**.
- **Undo a force overwrite.** A forced overwrite snapshots the prior `.mcp.json`
  entry; an immediate **Undo overwrite** restores it.
- **Uninstall.** The **Uninstall** button shows an uninstall plan first — each
  owned artifact is marked `removed` (no other target owns it) or `retained`
  (still owned elsewhere). Running it drops the target's manifest claim and
  physically removes only the unshared artifacts; an mcp entry that overwrote a
  prior config is **restored to its snapshot** instead of deleted.

## See also

- [Author a custom module](./custom-module.md) ·
  [Compose a custom agent](./custom-agent.md) ·
  [Define a custom flow](./custom-flow.md)
- [Concepts → Modules](../concepts/modules.md) ·
  [Flows](../concepts/flows.md)
