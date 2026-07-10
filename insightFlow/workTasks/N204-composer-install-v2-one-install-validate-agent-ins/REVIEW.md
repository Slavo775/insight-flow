# N204 — Composer install v2 — one install+validate agent (install-first), edge-case checklist, rollback-on-failure — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-08
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

Prompt/flow-definition + docs change. Merges `authoring-test` into `authoring-install` (install-first: plan → install → validate → done), adds the `composer-install-checklist` module, rewires the flow tail, and rolls back to the implementer on validation failure. Structure is clean and validates (5 agents, no dangling edges, 323/323). **One blocker:** the prescribed rollback mechanism can't actually re-enter the implementer's fix mode — the `install --fix-needed--> implement` path is broken as written.

## Checklist verification

- [x] `composer-install-checklist` module added — phases + edge cases + boundaries present.
- [x] `authoring-install/identity` rewritten (plan→install→validate→done), composes the checklist, keeps `done`.
- [x] `authoring-test/identity` removed; no `authoring-test`/`task-authoring-test` left in src or docs.
- [x] `composed/authoring.json` — `authoring-test` deleted; installer composes checklist + `authoring-install/handover-fix`.
- [x] `project/authoring.json` — 5 agents; `review --approved--> install`, `install --> done`, `install --fix-needed--> implement`; description updated.
- [x] `handovers-authoring.json` — `review → install` (renamed cleanly, ref updated), `install → implement` fix handover added, `test → install` removed.
- [ ] **Installer can emit `fix-needed` on rollback** — **FAILS in practice (Blocker 1):** the chosen `insight-flow status --status fix-needed` sets the status but not the review record `fix-start` requires.
- [x] Docs (agents-and-subagents 5 agents, walkthrough, index) updated.

## Verification performed

- `composer-authoring` loads via the real loader: **5 agents**, no dangling endpoints, valid path to `done`; install edges `fix-needed→implement`, `*→done`. All 5 compose. Installer prompt carries the four phases + installs flows + rollback + human-approval boundary.
- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **323 / 323** ✅ · lint 0 errors.

## Blockers

1. **The rollback → fix path is broken: `insight-flow status --status fix-needed` does not create the review record that `fix-start` requires.**
   - **Where:** `composer-install-checklist` + `authoring-install/identity` (both instruct `insight-flow status --id <id> --status fix-needed --by task-authoring-install`).
   - **Why:** `fix-start` (`packages/taskflow/src/cli/commands/fix.ts:18-22`) errors unless **the last review record** has `verdict === "fix-needed"` ("No fix-needed review found. Run review-end --verdict fix-needed first."). The generic `status` command (`cli/commands/status.ts`) sets `task.status` **only** — it writes no review record. So after a human-**approved** task (last review verdict `approved`) fails post-install validation and the installer sets `status=fix-needed`, the implementer's `/task-authoring-implement` → `fix-start` sees `lastReview.verdict === "approved"` and **aborts**. The `install --fix-needed--> implement` edge fires (nextSteps is status-based), but the implementer can't actually start the fix.
   - **Fix:** have the installer record its failure **as a fix-needed review**, mirroring how the reviewer routes to fix — e.g. `insight-flow review-start --id <id> --type ai --by task-authoring-install` then `insight-flow review-end --id <id> --type ai --verdict fix-needed --comment "post-install validation failed: <what>"`. `review-end --verdict fix-needed` writes both the review record **and** `status=fix-needed` (the N203 `ai-approved` divert only triggers on `verdict==="approved"`, so `fix-needed` is unaffected), and gives an audit trail of why the install failed. Update the wording in both the checklist module and `authoring-install/identity`; drop the raw `status` command. Re-verify: an approved→install→(validation fail)→implement `fix-start` succeeds.

## Non-blocking

1. Semantics: recording an `--type ai` review from the installer is slightly unusual (it isn't a code review), but it's the mechanism the lifecycle provides for reaching `fix-needed`, and it produces a useful record. Acceptable; flagging only so it's a conscious choice. (A dedicated verb would be cleaner but is out of scope.)

## Security & edge cases

- No executable code, input handling, or auth surface — prompt text + flow JSON + one test + docs. No concern.

## Notes

- Fifth in the composer-v2 series (N200–N203 → N204 install unified). Same merge-two-into-one pattern; targets `agents-approved`.
- The blocker is purely in the two prompt spots that name the rollback command — the flow graph, handovers, module wiring, and docs are otherwise correct.
- Consumer projects with the composer flow already installed keep a stale `task-authoring-test` command until re-install (out of scope, per spec — same as N202/N203).

---

## Fix (2026-07-08, task-review-fix)

- **Blocker 1 — resolved.** Both the `composer-install-checklist` module and `authoring-install/identity` now hand back on validation failure by **recording a fix-needed review** — `insight-flow review-start --id <id> --type ai --by task-authoring-install` then `insight-flow review-end --id <id> --type ai --verdict fix-needed --comment "…"` — instead of the raw `insight-flow status --status fix-needed`. This writes the review record `fix-start` (`fix.ts:20`) requires **and** sets `status=fix-needed` (the N203 `ai-approved` divert only triggers on `verdict==="approved"`, so `fix-needed` is unaffected). This is the same proven mechanism the reviewer uses to route to fix, so the `install --fix-needed--> implement` path now actually lets the implementer's fix mode start.
- **Gates:** JSON valid · `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **323 / 323** ✅ · 0 stale `--status fix-needed` refs · rendered `authoring-install` records the fix-needed review and no longer uses the raw status command.


---

## Round 2 — Human Review (approval)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-09
**Verdict:** approved

### Summary

Human approved. Verbatim:

> N204 is done please merge it into same branch as previous tasks

Direction: merge N204 into `agents-approved` (same integration branch as N200–N203).

### Blockers

- None.

### Notes

- Approval covers N204 as it stands (install-first + validate, edge-case checklist, rollback via a recorded fix-needed review — blocker cleared in the prior fix). Verified: build ✅, 323/323 tests, 5 agents, flow validates.
- The three small gaps surfaced in the last `/task-analyze` audit (review-template convention, `ready-to-implement`/`ready-to-install` naming, hooks in install validation) are **not** part of N204 — they remain open for a possible follow-up if the human wants them.
- Next: `/task-git` — commit + push `feat/N204-composer-install-v2`, then merge into `agents-approved`.
