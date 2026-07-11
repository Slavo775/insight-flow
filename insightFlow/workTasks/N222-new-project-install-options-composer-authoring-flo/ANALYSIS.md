# N222 — New Project install options + composer-authoring flow install — Analysis

**Created:** 2026-07-11
**Author:** task-analyze

## Problem framing

The spec: from the New Project flow the user should "choose the path, the name, and what they wanted to install — composer flow, default flow, activity engine, all things init offers." Investigation showed the hub's create endpoint hard-codes `initProject(dir, false, { yes: true })` (all defaults), and — critically — `init` has **no flow-selection** today: it always scaffolds the default roles via `buildSkillList` and never touches the flow-install machinery. So "install composer flow" is not a checkbox that exists; it requires teaching `init` to install a chosen built-in flow. The user clarified (AskUserQuestion) that "composer flow" means **install the composer-authoring flow** in addition to the default.

## Goal

- Surface init's real options in the modal (activity, lifecycle, editor, register-hub).
- Add an opt-in to also install the composer-authoring flow, backed by real flow-install into the project.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Options + composer-authoring opt-in (default always installed) | Matches the user's clarified intent; bounded scope; reuses `installPlan` | Needs the flow→disk emit path wired into init | L |
| B — Options only, no flow install | Small | Doesn't meet the "install composer flow" requirement | S |
| C — Full flow-registry picker (choose any flow) | Most flexible | Needs a flow registry surface + generalized init flow-install; much larger; premature | XL |

## Decision

- Chosen option: **A** (confirmed with the user — "Install the composer-authoring flow").
- Rationale: A delivers exactly what the user asked (default + optional composer-authoring) and reuses the existing `flowInstallPlan`/`installPlan` machinery rather than inventing a new one. C is the eventual direction but oversized for now; B fails the requirement.

## Open questions

- `[blocking]` Exact flow→disk function: confirm how a flow's `installPlan` output is written to `.claude/` (the path the dashboard/MCP flow-install uses via `emit.ts`/`compose.ts`). This is the main implementation unknown — timebox the investigation before wiring the UI.
- `[non-blocking]` Should composer-authoring pull in its `activity` bundle automatically (per composer conventions live-status is opt-in)? Keep activity as its own explicit toggle.
- `[non-blocking]` Editor "all" implications for flow install (claude + cursor emit differently) — verify both providers get the authoring commands.

## Sources

- None — self-contained. Code read: `agents/init/index.ts`, `agents/flow-install.ts` (exports incl. `flowInstallPlan`, `installPlan`), `agents/project/default.json`, `agents/project/authoring.json` (id `composer-authoring`), `agents/composer-conventions.ts`.

## Handoff brief

Title: New Project install options + composer-authoring flow install · type: feat · priority: medium. Add install choices (activity, lifecycle, editor, register-hub, and an opt-in composer-authoring flow) to the New Project modal, forward them through `POST /api/projects/create` to `initProject`, and teach `init` to install a chosen built-in flow via the existing `installPlan({ kind: "flow", id: "composer-authoring" })` emit path. Scope is default (always) + composer-authoring (opt-in); a general flow picker is a future task. Depends on N221; land last.
