# N164 — Reuse one agent/command across multiple flows via idempotent install — Analysis

**Created:** 2026-06-22
**Author:** task-analyze

## Problem framing

- Symptom: `Install failed: command 'taskmaster-whats-new' is already managed by agent 'project:custom:react-news' — refusing to overwrite`.
- Real need: the **same agent** is legitimately used across several flows (`react-news`, `js-news`, `ts-news`, `vue-news` in `is-test`), each of which installs an agent that registers a command/skill of the **same name**. The first flow to claim the name wins; every later flow hard-fails.
- Cause: `packages/taskflow/src/agents/emit.ts` records command/skill ownership 1:1 by name and rejects any second claimant (`emit.ts:228` skill, `emit.ts:291` command) — **even when the incoming definition is identical** to what's already installed.

## Goal

1. Re-installing an identical command/skill definition is an **idempotent success** (no-op), not a conflict.
2. The same agent can appear in multiple flows without name collisions.
3. Only genuinely-different definitions surface a conflict (handed to N165's overwrite-with-diff path).

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Idempotent-on-identical + shared ownership | Zero-risk fix for the real case, preserves safety check for genuine conflicts | Need a robust "identical" comparison | M |
| B — Always allow overwrite | Simple | Easy to clobber a definition silently | S |
| C — Per-flow namespacing of command names | No collisions ever | Changes how commands are named/invoked | M–L |

## Decision

- Chosen option: **A** (confirmed by user).
- Rationale: the safety refusal exists on purpose (per `emit.ts` header comment). Identical re-install is provably safe → make it a no-op. Differing definitions remain protected and route to N165.

## Open questions

- `[blocking]` Definition of "identical": byte-equal vs **normalized deep-equal** (ignore key order / trailing whitespace)? Recommend normalized deep-equal to avoid false conflicts.
- `[non-blocking]` Ownership record: keep a single owner or move to a multi-owner set so the dashboard can show all flows using a shared agent?

## Sources

- `packages/taskflow/src/agents/emit.ts:228, :291` — provenance: analyzer-discovered, trust: high, fetched: 2026-06-22.
- `is-test/insightFlow/projects/{react,js,ts,vue}-news.json` — provenance: human-supplied, trust: high, fetched: 2026-06-22.

## Handoff brief

- Title: Reuse one agent/command across multiple flows via idempotent install · type: feat · priority: high. In `emit.ts`, when an incoming command/skill (and mcp server) definition is identical (normalized) to the installed one, treat the install as idempotent success instead of refusing; only differing definitions remain a conflict. Pairs with N165. Reproduce with the is-test news flows.
