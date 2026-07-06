# N201 — Composer Taskmaster v2 — specialized spec-writer + templated scaffolding + change-handling — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-03
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Clean, well-scoped prompt/module/docs change on `feat/N201` (stacked on `agents-approved`, which has N200). It rewrites `authoring-create` into a create-and-change spec-writer, adds two composable `section` modules (`template-copy`, `authoring-spec-structure`), a "taskmasters are templated by default" convention, matching `agent-author` guidance, tests, and authoring docs. Build green, 321/321 tests, typecheck clean, lint 0 errors, Docusaurus build clean, drift guard intact. **One blocker**: the taskmaster's own `insight-flow create` omits `--with-analysis`, so `ANALYSIS.md` is never scaffolded — which breaks the very "scaffold, then fill; never write from scratch" discipline this task ships.

## Checklist verification

- [x] `authoring-create/identity` rewritten to create + change in one agent — pass.
- [x] Scaffold-via-create then fill; `set-flow` bind — pass **except** `--with-analysis` is missing (see Blocker 1).
- [x] Detailed spec structure (Description · Goal · Inventory of modules/subagents/agents/flows/relationships · Implementer subtasks · Verification) — pass (`authoring-spec-structure`).
- [x] Synthesizes from the analyst brief; no new subagents — pass.
- [x] `template-copy` + `authoring-spec-structure` authored, registered, composed into `authoring-create`; `plain-language` retained — pass.
- [x] "Taskmasters templated by default" convention + `agent-author` guidance — pass (consistent).
- [x] Authoring docs updated — pass.

## Blockers

1. **`ANALYSIS.md` is never scaffolded → contradicts the `template-copy` rule this task ships.** `packages/taskflow/src/agents/modules/roles/authoring.json` (`authoring-create/identity`) — the create command is `insight-flow create --title "…" --type feat --tags authoring`, with **no `--with-analysis`**. Confirmed in `packages/taskflow/src/cli/commands/create.ts:101` (`scaffoldTaskDocs`): `ANALYSIS.md` is only copied when `withAnalysis` is true. Per N200, the analyst (`authoring-analyze/identity`) writes `ANALYSIS.md` **after** the taskmaster creates the folder ("you never run `insight-flow create` yourself — the Composer Taskmaster does. Once it returns the new task folder, write an `ANALYSIS.md`"). So without the flag, the folder has no `ANALYSIS.md` template and the analyst must write it **from scratch** — exactly what the new `template-copy` module forbids ("Never write a task file from scratch… `ANALYSIS.md` with `--with-analysis`"). **Fix:** add `--with-analysis` to the taskmaster's create command in `authoring-create/identity`.

## Non-blocking

1. **Stale reuse wording in the author subagents (pre-existing, N200-era).** `packages/taskflow/src/agents/modules/integrations/composer-subagents.json` — `agent-author` step 2 (and the sibling `module-author`/`flow-author`) still say "small change + unreferenced → `update_agent`", which reads as licensing in-place edits of a built-in. That contradicts the shipped **custom-only** rule (`composer-conventions.ts`: in-place `update_*` only for a `custom:` def you own; built-ins are read-only). N201 edited `agent-author` (added the taskmaster-default sentence) but did not reconcile step 2. Out of N201's declared scope, but a good cleanup: qualify step 2 as "your own `custom:` def + unreferenced → `update_agent`".
2. **Nit — loose test assertion.** `packages/taskflow/test/compose.test.mjs` — `/change/i.test(md)` stays green even if the create-vs-change wording were removed (the word "change" appears in handovers/conventions). Tighten to a specific phrase, e.g. `/creating a new spec and changing an existing/i`.

## Security & edge cases

- None. No secrets, no new runtime logic — the change is composable `section` modules + a prompt + a convention + tests + docs.
- Drift guard: the changed modules compose only into the authoring flow; the 9 shipped role MD files stay byte-identical (drift test passed).

## Notes

- Sibling of N200; built on `agents-approved`. If N200 later merges to `main`, rebase.
- The blocker is a one-flag fix; the two non-blocking items are optional (NB-1 is pre-existing and arguably its own cleanup task).
- One `review-correctness` subagent ran; its findings are folded in above.

## Fix applied (2026-07-04, `task-review-fix` — "all issues")

1. **Blocker resolved** — `authoring-create/identity`: the create command is now `insight-flow create --title "…" --type feat --tags authoring **--with-analysis**`, so `ANALYSIS.md` is scaffolded from the template for the analyst to fill (no more writing from scratch). Test tightened: the N201 test now asserts `--with-analysis` is present.
2. **NB-1 resolved (custom-only reconciliation)** — reworded the pre-N200 reuse wording in every composer author subagent (`module-author`, `agent-author`, `flow-author`, `relationship-author`) and the `module-analyst` action map: edit-in-place is now scoped to "your own `custom:` def AND unreferenced"; a built-in (or a referenced def) → a `custom:` variant. This aligns the subagents with the shipped custom-only rule. (The other analysts use a neutral condensed action list — left as-is.)
3. **NB-2 resolved (test nit)** — the loose `/change/i` assertion is now `/creating a new spec and changing an existing/i` (specific to the create-vs-change wording).

Gates: `pnpm build` ✅ · 321/321 tests ✅ · typecheck ✅ · `eslint src` 0 errors ✅.
