---
title: Agents
sidebar_label: Overview
sidebar_position: 1
---

# Agents

**Agents** are the role-driven actors that move a task through its [flow](../flow/index.md).
Each agent is a Claude Code **slash command** with a focused job — analyze, write a
spec, implement, review, fix, git, and so on. They hand work to one another at the
[flow's transitions](../flow/transitions.md).

## The 10 agents

| Agent | Command | Role |
|-------|---------|------|
| [Analyze](./task-analyze.md) | `/task-analyze` | Challenge the brief, propose options, then hand off. |
| [Taskmaster](./taskmaster.md) | `/taskmaster` | Generate a well-structured task spec. |
| [Taskmaster Change](./taskmaster-change.md) | `/taskmaster-change` | Modify an existing task's spec. |
| [Implement](./task-implement.md) | `/task-implement` | Implement the spec (or a change request). |
| [Review](./task-review.md) | `/task-review` | AI code review against the spec. |
| [Human Review](./task-human-review.md) | `/task-human-review` | Record human review feedback. |
| [Review Fix](./task-review-fix.md) | `/task-review-fix` | Fix review blockers. |
| [Git](./task-git.md) | `/task-git` | Branch, commit, push, PR, merge. |
| [Incident](./task-incident.md) | `/task-incident` | Track and resolve production incidents. |
| [Request Changes](./task-request-changes.md) | `/task-request-changes` | Record post-delivery change requests. |

## Everything is a module

insight-flow uses an **"everything-is-a-module"** composition model. An agent isn't a
monolithic prompt — it's an **ordered list of modules** that are resolved and rendered
into the final role. Module kinds include:

| Kind | What it contributes |
|------|---------------------|
| `section` | A heading + body of prompt text. |
| `include` | A verbatim `@<ref>` line referencing a shared file. |
| `bundle` | Expands into child modules (recursively). |
| `status-transition` | Behavior-as-data: status-machine rules. |
| `handover` | A flow edge (which agent hands to which). |
| `mcp-server` / `hook` / `skill` | Artifacts collected for `.mcp.json`, `.claude/settings.json`, `.claude/skills/`. |

Modules live in a registry: **built-in** modules (flat names like `enforcement`,
`security`, `protocol`, and role-scoped ones like `task-git/workflow-push`), plus
**integration** modules (namespaced, e.g. `testing/hook`). Composition resolves an
agent's module list, de-duplicates by id, and expands bundles — then renders text
modules as ordered blocks and collects the non-text artifacts.

### Customizing in user-space

You can override or extend the shipped agents **without forking**. User modules are
namespace-prefixed with **`custom:`** so they can't accidentally shadow a built-in.
The canonical role files are *generated* from modules via
`insight-flow prompt-build --compose --apply`.

## Extending agents {#extending-agents}

`init` ships **zero technology assumptions** — no package manager, language, or git
host is baked into the prompts. Add your stack's commands in `taskflow.config.json`:

```jsonc
{
  "agents": {
    "extend": {
      "task-implement": ["Run `pnpm typecheck && pnpm lint && pnpm test` before marking implemented."],
      "task-review-fix": ["Re-run quality gates after every blocker fix."],
      "task-git": ["For PR creation: `gh pr create --title \"<title>\" --body-file <path>`."]
    }
  }
}
```

Each string is appended to that agent's loaded prompt. If `agents.extend` is empty
for an agent, it runs with the canonical (technology-agnostic) prompt only and notes
in its report that the relevant step was skipped.

## Canonical prompts

The full, byte-for-byte agent prompts live in the synced **Reference** section of
this site (generated from the `*_ROLE.md` files at the repo root). The pages here are
the curated narrative; the Reference is the raw source of truth.
