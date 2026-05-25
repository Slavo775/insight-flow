# N42 — Git operation permissions in config with task-git enforcement — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Blockers

1. **GIT PERMISSIONS section is in the wrong file (`AGENT_NOTIFY.md`).** `AGENT_NOTIFY.md` is for notification-related cross-cutting rules only — sticking git permission enforcement there is wrong. If this protocol needs to be shared/common across agents, create a dedicated common file (e.g. `AGENT_CONFIG.md` or similar) for config-reading protocols.

2. **Consistency with `agents.extend` config reading.** The same `cat taskflow.config.json` pattern for git permissions should be consistent with how agents read `agents.extend`. If we always do `cat taskflow.config.json` and extract things, it should live in one common place — not buried in a file named "notify".

### Suggestions (non-blocking)

- The `@`-include file name matters semantically — `AGENT_NOTIFY.md` implies notifications, not config enforcement.

### Notes

- The 9 config keys and the enforcement logic itself are correct — only the placement needs to change.
- `AGENT_NOTIFY.md` should be restored to its original content (notifications only).


---

## Round 2 — AI Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

N42 adds a structured `agents.git.permissions` block (9 boolean flags) to the config system and wires it so task-git can enforce per-operation blocks. The human review correctly relocated the protocol doc from `AGENT_NOTIFY.md` to a new `AGENT_CONFIG.md`. The TypeScript changes (`types.ts`, `config.ts`) and `init/index.ts` scaffolding are all correct. One blocker found in `AGENT_CONFIG.md`'s READING AGENT EXTENSIONS section.

### Checklist verification

- [x] `AgentGitPermissions` interface in `types.ts` with all 9 keys (optional booleans) — `types.ts:252-262`
- [x] `AgentsConfig.git.permissions` field in `types.ts` — `types.ts:267`
- [x] `DEFAULTS` in `config.ts` includes all 9 keys, `forcePush: false`, rest `true` — `config.ts:32-46`
- [x] `resolveConfig` deep-merges `agents.git.permissions` — `config.ts:61-89` correctly computes `mergedAgentsGitPerms` and reassembles `agents`
- [ ] `AGENT_NOTIFY.md` contains GIT PERMISSIONS section — **spec superseded by human review**: moved to `AGENT_CONFIG.md`. CHECKLIST item is stale but the intent is satisfied.
- [x] `init/index.ts` scaffolds all 9 keys in generated config — `init/index.ts:636-649`
- [x] Build passes — verified

### Blockers

1. **`AGENT_CONFIG.md` — "READING AGENT EXTENSIONS" section is wrong and misleading.**
   File: `AGENT_CONFIG.md:8-25`
   
   The section tells agents to run a node one-liner at the start of every run to extract `agents.extend` strings. This is incorrect: extensions are applied to role files at `insight-flow init` / `prompt-build` time by the CLI — the strings are already baked into the agent's loaded prompt before Claude sees it. An agent running this node snippet would find entries it already has in its context and act on them a second time, or worse, waste tokens on a pointless shell call on every invocation.
   
   **Fix:** Remove the "READING AGENT EXTENSIONS" section entirely from `AGENT_CONFIG.md`. `AGENT_PROTOCOL.md` already covers extensions correctly. `AGENT_CONFIG.md` should only contain the GIT PERMISSIONS section (which IS something the agent must check at runtime, since it's a behavioral guard, not a prompt extension).

### Non-blocking

1. **`CHECKLIST.md` item 5 names `AGENT_NOTIFY.md`** — now stale (GIT PERMISSIONS moved to `AGENT_CONFIG.md` per human review). No code impact; just documentation drift.

2. **`sync-role-templates.mjs` does not list `AGENT_CONFIG.md`** — the template was copied manually. If the sync script runs again in future it won't propagate edits to `AGENT_CONFIG.md` from repo root. Same situation as `AGENT_NOTIFY.md` (also not in the sync list), so consistent — but worth adding both to the script in a follow-up.

### Security & edge cases

- Permission checks are honour-system (agent reads and respects flags). No CLI-level enforcement. This is by spec (no CLI changes in scope for N42) — acceptable.
- `forcePush: false` default is conservative and correct.
- Deep-merge handles the edge case where a user sets only `push: false` — all other keys inherit defaults correctly. Traced through: ✅

### Notes

- The READING AGENT EXTENSIONS blocker is purely in the doc file (`AGENT_CONFIG.md`) — no TypeScript or config changes needed for the fix.
- `AGENT_CONFIG.md` will be cleaner and more focused after removing the incorrect section.
