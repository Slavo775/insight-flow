# N271 — Full codebase audit — security, data safety, antipatterns, fragile code → fix tasks — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-10-20
**PR:** (no PR yet — commit `007d08d` on `chore/N271-audit-fixes`)
**Verdict:** APPROVED

## Summary

N271 is a documentation deliverable, not a code change: it produced `AUDIT.md` (81 findings, every one with severity, category, file:line, scenario, fix and confidence), a verdict on all 86 claims in `AUDIT-SEED.md` (60 kept, 25 changed, 0 fully rejected), the "looks solid" list, a test-coverage map, and the 15 fix tasks N272–N286 with dependencies, order and the locked decisions carried into each spec. The commit touches only tracker files and task folders — no source. Risk: none to the product; the risk is a wrong finding leading to a wrong fix task, which the per-task reviews (N272…) check downstream.

## Checklist verification

- [x] `AUDIT.md` written with Summary · Findings · Seed verdicts · Looks solid · Test coverage map — pass (7/7 sections present, plus the created-tasks section)
- [x] Every `AUDIT-SEED.md` bullet (T1–T14) has one verdict row with reason + file:line — pass (86 bullets ↔ 86 rows, machine-counted)
- [x] Every finding has severity, category, file:line, scenario, fix, confidence and seed ref / "new" — pass (81 findings; 38 are new)
- [x] New findings for the thin areas (composer MCP, flow-chain code, compose/modules, sync-role-templates, tarball) — pass (e.g. A14/A53 MCP, A73 chain-advance, A19 compose contradiction, A80 template sync, A65/A67 tarball)
- [x] Fix-task list with title · type · priority · AUDIT IDs · deps/order · "waits for N267" — pass (15 rows in §7, order in §6)
- [x] Locked decisions written into the affected fix tasks — pass (`--id` on writes → N278; bind 127.0.0.1 → N272; `@`-include roles → N275; N267 ordering → N277/N278)
- [x] Human gave an explicit "create it" before any `/taskmaster` call — pass (conversation: "create tasks please")
- [x] Fix tasks created; IDs listed under `## Created tasks` — pass (N272–N286)
- [x] Quality: no source changes (`git show 007d08d --stat -- packages/ .github/` is empty); nothing written outside the task folders + tracker; no server run against real data — pass

## Non-blocking

1. `AUDIT-SEED.md` headers say line numbers are from `6fe34db`; 2 of 12 spot-checked references had drifted by one line (the SW cache name, `readBody`) and were corrected in `AUDIT.md`. Future audits should record the exact tree SHA on every finding (the `AUDIT.md` header does, at `30277e0`).
2. One self-referential caveat: this reviewer is the same model that produced the audit. The deliverable is verified by objective counts and file:line checks rather than by re-judging each finding; the downstream per-task reviews (which include independent correctness + security sub-reviews) are the real second opinion on the findings that became code.

## Security & edge cases

None — no code. The findings themselves are security content; their accuracy is tested where they were implemented (N272–N284 reviews).

## Notes

- The seed came from a different model (Opus 5.5) and was treated as claims; the audit explicitly rejected one sub-claim (T13-1 "destroy before 413") and lowered/raised severities with evidence — the "claims, not facts" framing worked.
- Follow-ups surfaced by the audit but not yet in a task: the A51 hub registry/lock cluster (deferred from N282) and the A64 route-table rewrite (deferred from N284) — both recorded in those tasks' checklists.
