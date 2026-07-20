# N256 — Trim agent role-prompt token waste via JSON modules + fix template sync — Checklist

> Re-confirmation (per the task's own open questions) invalidated most of the audit's premise — same overstatement pattern as N253/N255. What was genuinely safe/valuable is done; the rest is documented below with reasons.

## Done criteria

- [x] **Enforcement trim** — removed the redundant HANDOVER RULE from `AGENT_ENFORCEMENT.md` (loaded via `@`-include in all 9 role prompts). Verified `AGENT_PROTOCOL.md`'s HANDOVER DISCIPLINE covers all 3 of its points; enforcement even said "See @AGENT_PROTOCOL.md". Done the sanctioned way: `prompt-build --apply` (the generator `buildEnforcementBlock()` never had it).
- [x] **Fixed a real month-old drift** — the HANDOVER RULE was hand-added to the committed `.md` in commit 072a049 (N142–N146) without updating the generator, and nothing guarded it. Regenerating removed it AND restored generator↔file consistency.
- [x] **Added a drift guard** — `compose.test.mjs` now byte-asserts `AGENT_ENFORCEMENT.md === buildEnforcementBlock()` (the file had no guard, unlike the 9 role files — which is why it drifted). Exported `buildEnforcementBlock` for the test.
- [~] **TASK_GIT appendix — NOT removed.** Re-confirmation: `PR_API.md` only has the *prefill-URL* examples, NOT the `gh pr create` / `glab mr create` CLI or Bitbucket examples the appendix carries. Removing it would lose content the audit assumed was duplicated.
- [~] **TASK_ANALYZER untrusted-data line — NOT removed.** It's the framing premise the analyzer-specific security rules build on (no-auto-fetch, external-content marker, refuse-on-external-brief); dropping it for ~30 words weakens coherence.
- [~] **sync-role-templates.mjs — NOT changed.** Not a real bug: `AGENT_ENFORCEMENT.md`/`PR_API.md` reach consumers via init (`applyEnforcement` from the single generator) and docs via `sync-docs.mjs` → `website/docs/reference`. One source, disjoint sync paths — no drift.

## Quality gates

- [x] `npx tsc --noEmit` passes
- [x] lint passes (eslint clean; prettier applied)
- [x] `pnpm --dir packages/taskflow test` passes (374/374 — 373 + 1 new drift guard) — **including `compose.test.mjs`**
- [x] No behavior wording lost (removed text is fully covered by `@AGENT_PROTOCOL.md`, which every role also loads)

## Verification

- [x] `git diff` on `AGENT_ENFORCEMENT.md` = exactly the 6 HANDOVER RULE lines removed, nothing else
- [x] `prompt-build --apply` reported `patched: []` (all role files already in sync — no collateral change)
- [x] New guard test fails if `AGENT_ENFORCEMENT.md` and its generator ever diverge again
