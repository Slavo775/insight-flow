# N97 — Onboard task-git into the composer, registry, and project flow — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-12
**PR:** https://github.com/Slavo775/insight-flow/pull/74
**Verdict:** fix-needed

## Summary

task-git onboarding (PR #74, `9f2e16a`): byte-faithful decomposition verified (role file = inline prompt + exactly the two permitted deltas), the 10th composed agent, the 3-line command pointer (already picked up by the live skill list), templates/init shipping, fixed `agents.extend.task-git`, and the flow backbone on the project map — all solid and live-verified. **However, adversarial testing found one divergence channel**: in consumer projects, `prompt-build --apply`'s enforcement patcher (`patchRoleFileWithRef`) injects `@AGENT_ENFORCEMENT.md` into the scaffolded `TASK_GIT_ROLE.md` — it lacks the `@ref` and contains `---` separators, so the "insert after first `---`" fallback fires. Consumer copies silently diverge from the canonical generated file, violating the project's own no-silent-prompt-divergence standard. Verdict: **fix-needed** (1 blocker, decision required).

## Checklist verification

- [x] Byte-faithful decomposition; only deltas = include normalization + actions block — pass (round-trip asserted)
- [x] `notify` + `config` include modules — pass
- [x] task-git ∈ COMPOSED_AGENTS; `/api/agents` lists 10 — pass (live)
- [x] TASK_GIT_ROLE.md generated, drift ×10, templates synced, init scaffolds — pass (live smoke)
- [x] Command file = 3-line pointer — pass (live skill list confirms)
- [x] Flow edges per spec — pass (live `/api/project`)
- [~] No content rewording / no enforcement include added — pass **in the canonical repo**; broken in consumers by the patcher (Blocker 1)

## Blockers

1. **Consumer `TASK_GIT_ROLE.md` diverges via the enforcement patcher.** Repro (run during review): fresh `init --yes` → `prompt-build --apply` → `@AGENT_ENFORCEMENT.md` appears at line 10 of `.claude/roles/TASK_GIT_ROLE.md`. Why it matters: canonical says task-git has no enforcement include (the N97 fidelity rule), but every consumer that runs prompt-build gets one injected — silent canon/consumer divergence, the exact disease the drift suite exists to prevent.
   **Fix — pick one deliberately:**
   (a) *Adopt enforcement in canon* (recommended): add `enforcement` to `composed/task-git.json` (after `config`), regenerate — the patcher then finds the `@ref` and skips, canon == consumer everywhere, and task-git carrying the enforcement git rules is arguably the correct end-state anyway (the patcher's design invariant is "every role references enforcement").
   (b) *Exempt the file*: skip TASK_GIT_ROLE.md in `patchRoleFileWithRef` — preserves strict fidelity but leaves task-git the only unenforced role and adds a special case.

## Non-blocking

1. The examples appendix is one large module — fine per fidelity rule; revisit if per-host examples ever need independent reuse.
2. The dropped `---` between the role include and `INPUT:` in the new command pointer is a cosmetic difference from the old file — harmless.

## Security & edge cases

- No new I/O surfaces; the decomposition is data-only; pointer file behavior identical to the other nine commands.

## Notes

- Found because the review re-ran the consumer smoke with `--apply` — the same command consumers run routinely.
- `/task-review-fix` should implement option (a) unless the human prefers (b).


---

## Fix — Round 1 blocker resolved

**By:** task-review-fix · **Date:** 2026-06-12

- **Option (a) implemented** — `enforcement` adopted into `composed/task-git.json` (after `config`); `TASK_GIT_ROLE.md` regenerated (includes now `@AGENT_NOTIFY.md` / `@AGENT_CONFIG.md` / `@AGENT_ENFORCEMENT.md`), template re-synced. Canon == consumer everywhere: re-ran the exact review repro — fresh init → `prompt-build --apply` → **file byte-identical before/after** (patcher finds the ref and skips), exactly one enforcement reference (from generation, line 3).
- This is a deliberate, human-visible prompt change (task-git now carries the enforcement baseline) — the patcher's design invariant ("every role references enforcement") now holds for all 10 roles by construction.
- **Gates:** build ✅ · 122/122 ✅ · lint at baseline · drift suite green (×10, regenerated file committed).
