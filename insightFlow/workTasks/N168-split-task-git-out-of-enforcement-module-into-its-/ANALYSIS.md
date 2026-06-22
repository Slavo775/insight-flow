# N168 — Split task-git out of the enforcement module — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- Symptom: git/PR responsibilities are bundled inside the `enforcement` module. In `is-test`, agents (e.g. `taskmaster-whats-new.json`) pull `"enforcement"` in their `modules[]`, which today carries task-git behaviour.
- Desired: **task-git should be its own module**, separate from enforcement, that an agent **explicitly hands over to**, rather than git being implied by pulling enforcement.

## Goal

1. Extract git/PR responsibilities into a standalone `task-git` module.
2. `enforcement` no longer implies git behaviour.
3. Agents reference task-git explicitly and can hand over to it within a flow.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — New `task-git` module + remove git rules from enforcement + update role templates | Clean separation, explicit handover | Migration for agents relying on enforcement-git | M |
| B — Keep coupled, gate git with a flag | Small diff | Doesn't deliver the requested separation | S |
| C — Inline git per-agent | Flexible | Duplication, no shared module | M |

## Decision

- Chosen option: **A**.
- Rationale: matches the user's mental model (git is a distinct concern with its own handover), and aligns with the existing module-composition design.

## Open questions

- `[blocking]` Where do the enforcement git rules actually live — `AGENT_ENFORCEMENT.md`, the module registry, and/or `templates/roles/`? Locate before extracting.
- `[blocking]` Backward compatibility: existing agents that relied on enforcement-implied git need a migration so they keep working.
- `[non-blocking]` "Handover to task-git inside an agent" may lean on the N166 terminal/handover model — confirm dependency direction.

## Sources

- `AGENT_ENFORCEMENT.md`, `TASK_GIT_ROLE.md`, `packages/taskflow/templates/roles/` — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.
- `is-test/insightFlow/agents/*.json` (`modules[]` arrays) — provenance: human-supplied, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Split task-git out of enforcement module into its own handover-able module · type: rework · priority: medium. Extract git/PR responsibilities from `enforcement` into a standalone `task-git` module that agents reference explicitly and hand over to; remove git behaviour from enforcement and provide a migration for agents that relied on it. Related: N166 (handover model).
