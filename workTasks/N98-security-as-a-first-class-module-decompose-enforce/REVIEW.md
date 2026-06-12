# N98 — Security as a first-class module — decompose enforcement, baseline trio on every agent — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**PR:** https://github.com/Slavo775/insight-flow/pull/76
**Verdict:** fix-needed

## Summary

Security-as-module (PR #76, `c225992`): the `security` include module is wired into all 10 defs with a well-chosen, tested ordering rule (immediately before `enforcement` — byte-preserving the pre-N98 effective reading order), `buildEnforcementBlock()` is decomposed, no double-includes, fresh-init smoke green, 123/123. **However, the ANALYSIS's own open question turned out to be a real regression**: the upgrade path for *existing* consumers silently drops security from every prompt. Reproduced during review: a legacy consumer (old role files without the security include) upgrades the package and runs `prompt-build --apply` → their `AGENT_ENFORCEMENT.md` regenerates *without* the embedded security line, but their role files never gain the new include (only re-init/template refresh updates those) → **zero security references remain anywhere**. The fresh-init smoke couldn't catch this; only the upgraded-consumer path shows it. Verdict: **fix-needed** (1 blocker).

## Checklist verification

- [x] `security` module registered + described — pass
- [x] All 10 defs reference it; ordering rule consistent + documented + tested (`security` index = `enforcement` index − 1) — pass
- [x] `buildEnforcementBlock()` decomposed; repo-root file regenerated; 0 security refs in it — pass
- [x] Exactly one standalone security include per role file — pass (analyzer's 2nd grep hit is prose)
- [x] Templates re-synced (10 copied) — pass
- [x] Baseline-trio test — pass
- [x] Partials' content untouched — pass
- [~] "Consumers heal automatically" — **true only for fresh inits**; broken for upgraders (Blocker 1)

## Blockers

1. **Legacy-consumer upgrade drops security from all prompts.** Repro (run during review): temp project with an old-style role file (`@AGENT_ENFORCEMENT.md`, no security include) + old generated enforcement file → run the new `prompt-build --apply` → enforcement regenerates without `@AGENT_SECURITY.md`, role files unchanged → `grep AGENT_SECURITY` finds **0** refs in both. The prompt-injection guardrails silently disappear for every existing consumer who upgrades — the worst possible silent failure for this particular content.
   **Fix:** extend the existing legacy patcher in `applyEnforcement`/`patchRoleFileWithRef` (prompt-build.ts) — when a role file contains a standalone `@AGENT_ENFORCEMENT.md` but no standalone `@AGENT_SECURITY.md`, insert the security line immediately above the enforcement line (idempotent; same migration pattern the enforcement `@ref` patcher already implements). Add an upgraded-consumer test/smoke reproducing this exact scenario.

## Non-blocking

1. The ANALYSIS flagged this exact risk as an open question with "verify and document the sequencing" — future specs should promote "verify" items like this into the checklist so the implementer's smoke covers them.

## Security & edge cases

- This IS the security finding. Canonical repo and fresh consumers are correct; only the upgrade window is affected — but that window is every existing install.

## Notes

- Everything else in the change is clean and would be approved as-is once the patcher closes the upgrade gap.
- `/task-review-fix` next.


---

## Fix — Round 1 blocker resolved

**By:** task-review-fix · **Date:** 2026-06-12

- **Security migration patcher** ✅ — `patchRoleFileWithSecurityRef` in prompt-build.ts: any rolesDir file with a standalone `@AGENT_ENFORCEMENT.md` but no standalone `@AGENT_SECURITY.md` gets the security line inserted immediately above (idempotent). Wired into all three `patchRoleFileWithRef` paths (already-has-ref, inline-block replacement, fresh insertion), so every legacy shape migrates.
- **Upgrade-path test** ✅ — `test/security-migration.test.mjs` reproduces the exact review scenario via the real CLI: legacy consumer → `prompt-build --apply` → security include present exactly once, immediately above enforcement; regenerated enforcement security-free; second apply a no-op.
- **Live re-verification** ✅ — the review repro now ends with `@AGENT_SECURITY.md / @AGENT_ENFORCEMENT.md / @AGENT_PROTOCOL.md` in the legacy role file.
- **Bonus**: the canonical repo's own tracked legacy copies under `.claude/roles/` (pre-N98 artifacts) were migrated by the new patcher on the verification run — committed with this fix (incl. its `AGENT_CONFIG.md` copy, which standalone-includes enforcement and therefore also gains the security line — consistent with the migration's premise).
- **Gates:** build ✅ · tests **124/124** ✅ · lint at baseline · canonical root role files untouched by `--apply` (drift suite green).


---

## Round 2 — re-review after fix

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**Verdict:** approved

### Summary

The Round 1 blocker (legacy-consumer upgrade silently dropping security from all prompts) is fixed and independently re-verified. `patchRoleFileWithSecurityRef` (prompt-build.ts) inserts the standalone `@AGENT_SECURITY.md` immediately above `@AGENT_ENFORCEMENT.md` in any role file missing it, is idempotent (line-exact check), and is wired into **all three** `patchRoleFileWithRef` paths (already-has-ref, inline-block replacement, fresh insertion) — every legacy shape migrates. `test/security-migration.test.mjs` reproduces the exact review scenario through the real CLI (`dist/cli.js`), asserting: security present exactly once, positioned above enforcement, regenerated enforcement security-free, second `--apply` a no-op. Approved.

### Checklist verification

- [x] All Round 1 passes still hold (registry module, 10 defs + ordering rule, decomposed `buildEnforcementBlock`, templates, trio test, partials untouched)
- [x] Re-verified this round: build green, **124/124 tests** (was 123 + new migration test), `grep -cx "@AGENT_SECURITY.md"` = 1 for every one of the 10 role files, `grep -c AGENT_SECURITY AGENT_ENFORCEMENT.md` = 0
- [x] Blocker 1 closed: upgraded-consumer path now patches role files; covered by a dedicated CLI-level test

### Blockers

None.

### Non-blocking

1. (Carried from Round 1, unchanged) Promote ANALYSIS "verify" items into the checklist in future specs.

### Security & edge cases

- Files with no `@AGENT_ENFORCEMENT.md` anchor are left untouched by the patcher — correct: pre-N98 such files never received security via the embedded line either, so no regression is possible there.
- The repo's own `.claude/roles/` legacy copies were migrated by the patcher (incl. `AGENT_CONFIG.md`, consistent with the migration premise).

### Notes

- Ready to merge (PR #76). Tracker-shard + master.json conflict with main (N99–N112 specs landed there) is bookkeeping-only; resolve as union.
