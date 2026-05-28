# N72 — browser notif: change 'Awaiting input' to 'Done' when agent finishes — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** https://github.com/Slavo775/insight-flow/pull/47
**Verdict:** fix-needed

## Summary

The working-tree edits to `packages/taskflow/src/server/dashboard.ts` are correct and match the spec exactly (5 +, 8 -; two title literals + two comments). Locally rebuilt + served HTML on http://localhost:6006/ confirms `var title = ... + 'Done';` and `var label = toStatus === 'done' ? 'Done' : 'Permission required';`. Build + tests green (7/7). **However, the implementation diff is uncommitted on `fix/N72-browser-notif-awaiting-input-to-done` — PR #47 currently contains only the task scaffold (TASK.md / CHECKLIST.md / tracker shards), not the dashboard.ts fix.** Risk: low (string-literal change, no logic), but the PR as-is is not mergeable.

## Checklist verification

- [x] `fireDesktopNotif()` uses `'Done'` — pass (line 906 in working tree).
- [x] `fireStatusDesktopNotif(toStatus)` `'done'` branch uses `'Done'`; `'awaiting-permission'` branch unchanged — pass (line 922 working tree, `'Permission required'` intact).
- [x] Inline N68 round-3 comment block updated — pass (replaced with one-line N72 rationale).
- [x] `grep "Awaiting input" packages/taskflow/src/server/dashboard.ts` returns zero matches — pass (`exit=1`, no matches).
- [x] `pnpm --dir packages/taskflow run build` passes — pass.
- [x] `pnpm --dir packages/taskflow test` passes — pass (7/7).
- [x] No unrelated diffs in `packages/taskflow/src/server/dashboard.ts` — pass (diff is the 4 in-scope lines + comment swap, nothing else).
- [ ] Manual: finish a Claude turn in the playground → browser notification title reads `<project>: Done` — **pending human verification** (server is running on :6006 ready to test).
- [ ] Manual: permission-required state → title still `<project>: Permission required` — **pending human verification**.
- [x] Project-name prefix and silent/sound behavior unchanged — pass (only the literal strings changed; `PROJECT_NAME` prefix logic, `CONFIG_SOUNDS_ENABLED`, `notifSettings.sound`, and `silent: !sound` flag are byte-identical).

## Blockers

1. **`packages/taskflow/src/server/dashboard.ts` — implementation diff not committed.** `git log main..HEAD` on `fix/N72-browser-notif-awaiting-input-to-done` shows only `18ed5ec chore(tasks): scaffold N72 …`. `git status` shows `M packages/taskflow/src/server/dashboard.ts` in working tree. The PR therefore does not contain the fix.
   - **Why:** `/task-implement` set status to `implemented` but did not invoke `/task-git`, so the wording change was never committed. A reviewer cannot approve a PR whose only commit is the task spec.
   - **Fix:** stage `packages/taskflow/src/server/dashboard.ts` only (leave the unrelated working-tree noise alone — `AGENT_ENFORCEMENT.md`, `packages/insight-flow-master/src/overview.ts`, `workTasks/N67/*`, etc.), commit as `fix(dashboard): N72 — notif title 'Done' replaces 'Awaiting input'`, push, and re-run `/task-review`. Existing tracker push entry (commit `18ed5ec`) will get a second push entry for the fix commit — that's expected.

## Non-blocking

- N72 leaves two parallel notification code paths (`fireDesktopNotif` for legacy `agent-done` socket and `fireStatusDesktopNotif` for N68 derived `status`). The spec already calls this out as out of scope, but a future small task collapsing them into one helper would remove the "two strings to keep in sync" risk that just bit us in the comment-grep round.
- The comment on line 902 "N68's turn-end wording" is correct but slightly cryptic for readers who don't know N68. Tying it to N62/N68 explicitly (e.g. `// N72 (replaces N68 round-3 wording)`) would be marginally clearer, but not worth a re-roll.

## Security & edge cases

- None. Pure string-literal swap inside a function whose preconditions (`Notification` API present, permission granted, mute-when-focused check) are untouched. No new user input flows, no new escape requirements, no auth surface affected.

## Notes

- Related: N68 (introduced the displaced wording), N62 (sound notification subsystem).
- Manual verification handoff: dashboard running on http://localhost:6006/ from the freshly built local dist (PID listening on 6006). Grant Notification permission via the gear icon, finish a Claude turn, expect `insight-flow: Done`. For the permission path: trigger any tool that needs approval and confirm `insight-flow: Permission required`.
- Once the blocker is resolved (commit + push), this can flip straight to `approved` — there is nothing else outstanding.
