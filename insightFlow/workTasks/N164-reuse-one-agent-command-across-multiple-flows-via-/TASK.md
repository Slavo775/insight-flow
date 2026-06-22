# N164 — Reuse one agent/command across multiple flows via idempotent install

**Type:** feat
**Priority:** high
**Created:** 2026-06-22

## Problem

Installing a flow whose agent registers a command/skill name already owned by another flow's agent hard-fails (`command 'taskmaster-whats-new' is already managed by agent 'project:custom:react-news' — refusing to overwrite`), even when the incoming definition is identical. This blocks the legitimate case of reusing the same agent across several flows (react/js/ts/vue news).

## Goal

1. Re-installing an identical (normalized) command/skill/mcp-server definition is an idempotent success, not a conflict.
2. The same agent can appear in multiple flows without name collisions.
3. Genuinely-different definitions still raise a conflict (routed to N165's overwrite-with-diff).

## Scope

### In scope

- `packages/taskflow/src/agents/emit.ts` — the three ownership/conflict checks (`:94` mcp server, `:228` skill, `:291` command): compare incoming vs installed definition; if equal → no-op success.
- A normalized deep-equal helper for config comparison.

### Out of scope

- The overwrite-with-diff UX for differing definitions (that's N165).
- Per-flow command namespacing (rejected option).

## Implementation plan

1. **Add normalized compare** — helper that deep-equals two definitions ignoring key order / insignificant whitespace.
2. **Skill check (`emit.ts:228`)** — if an existing owner exists but the incoming skill definition is identical, return success instead of throwing.
3. **Command check (`emit.ts:291`)** — same idempotent treatment.
4. **MCP server check (`emit.ts:94`)** — if `.mcp.json` already defines the server with an identical config, treat as no-op.
5. **Ownership record** — ensure re-install by another flow doesn't error; decide single-owner vs multi-owner set (see open question).

## Verification

- `pnpm --dir packages/taskflow test` passes (extend emit/install tests with an identical-redefinition case).
- Manual: in `is-test`, install `react-news` then `js-news`/`ts-news`/`vue-news` sharing `taskmaster-whats-new` — second+ installs succeed without the refusal.

## Notes

- Open: define "identical" = normalized deep-equal (recommended). See ANALYSIS.md. Pairs with N165; sequence before/with N165. Reproduce with `is-test/insightFlow/projects/*-news.json`.
