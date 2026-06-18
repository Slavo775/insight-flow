# N145 — prompt wiring — auto-vs-gated handover language + in-session chaining

**Type:** feat
**Priority:** medium
**Created:** 2026-06-17

## Problem

- N142 renders a minimal `## Handover` section, but the agent-facing *behavior contract* needs to be precise and safe. Since the model is **agent free-picks** + in-session chaining, the composed prompt must tell an agent: here are your candidate handovers, choose by judgment, then for `auto` invoke the next slash-command in-session and for `gated` STOP for explicit human go-ahead.
- Without careful wording, `auto` handovers risk: bypassing `AgentGitPermissions`/consent, infinite cycles (review ↔ review-fix), or chaining when a `gated` user stayed silent. This task finalizes the language and the cross-cutting guardrails.

## Goal

1. The composed `## Handover` section clearly instructs: list candidates → free-pick by judgment → `auto` chains the next slash-command in-session; `gated` stops for explicit human go-ahead.
2. Prompt language reinforces that `auto` NEVER bypasses `AgentGitPermissions` (`types.ts:347`) or outward-action consent — the mode only governs whether to pause, not whether permissions apply.
3. Edge-case guidance baked into the prompt: cycles (cap hops / force-gate on a back-edge), and gated + silent user (do NOT chain).
4. Shared enforcement rules updated where appropriate so every agent inherits consistent handover discipline.

## Scope

### In scope

- `packages/taskflow/src/agents/compose.ts` — refine `handoverSection` (from N142) body text to the final contract (candidate listing, free-pick, auto/gated behavior, the permissions/consent caveat, cycle + silent-user rules). Keep it a single rendered `## Handover` section.
- `packages/taskflow/src/agents/modules/enforcement.json` and/or `protocol.json` — add the shared handover-safety clauses (auto ≠ bypass permissions/consent; gated requires explicit go-ahead; no auto-chain on a cycle back-edge) so all agents inherit them; reference `AGENT_ENFORCEMENT.md`/`AGENT_PROTOCOL.md` root docs.
- Regenerate all affected `*_ROLE.md` via `insight-flow prompt-build --compose --apply`; commit JSON + MD together.
- `AGENT_ENFORCEMENT.md` / `AGENT_PROTOCOL.md` (root) — mirror the new shared clauses (the `sync-role-templates.mjs` keeps templates in sync at publish).

### Out of scope

- Schema/compose plumbing (N142) and editor CRUD (N143) — assumed merged.
- FlowEditor diagram badges (N144).
- No runtime enforcement engine; this is descriptive prompt guidance (the harness + `AgentGitPermissions` remain the actual gates).

## Implementation plan

1. **Finalize `handoverSection` text.** Replace N142's minimal body with the full contract: (a) "you may have several handovers — pick the one matching your outcome"; (b) auto → "invoke `/<cmd>` directly to continue"; (c) gated → "STOP and ask for explicit human go-ahead before invoking `/<cmd>`"; (d) caveat: "auto does not bypass git permissions or consent — those still apply"; (e) cycle rule + silent-user rule.
2. **Shared enforcement clauses.** Add concise handover-safety bullets to `enforcement.json`/`protocol.json` so they compose into every agent. Mirror in the root `AGENT_ENFORCEMENT.md`/`AGENT_PROTOCOL.md`.
3. **Cycle guard wording.** State a simple rule (e.g. "never auto-chain back to an agent already run for this task in this session; force gated").
4. **Regenerate + verify MD.** `pnpm --dir packages/taskflow build` → `prompt-build --compose --apply`; review the `*_ROLE.md` diff for correctness and that only intended sections changed.
5. **Tests.** Extend `test/compose.test.mjs` to assert the final handover wording for auto and gated (command name, "STOP"/"go-ahead" for gated, permissions caveat present).

## Verification

- `pnpm --dir packages/taskflow run build` + `npx tsc --noEmit` pass.
- `pnpm --dir packages/taskflow test` passes incl. the updated compose assertions and the byte-identical role-MD check (now reflecting the new wording).
- Manual read of a regenerated `*_ROLE.md` (e.g. `TASK_IMPLEMENTER_ROLE.md`) shows a coherent `## Handover` section + the shared safety clauses.

## Notes

- Depends on **N142** (renders the section it refines). Independent of N143/N144 but should land after N142.
- Reuse: `compose.ts:227` (`transitionSection` as the structural sibling), `agents/modules/enforcement.json`/`protocol.json`, `packages/taskflow/scripts/sync-role-templates.mjs`, `test/compose.test.mjs`.
- Honors the recorded `explicit-consent-before-acting` preference: `gated` is the default and `auto` is explicitly bounded by permissions + consent.
