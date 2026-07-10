# N211 — Flow-aware live-status — recognize all installed flows/agents; composer opt-in for activity module — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-10
**Verdict:** approved

## Summary

Small, focused fix (5 files, +18/−6). **Part 1:** `activity/agent-active`'s `lifecycle-agent-active.sh` (in `activity.json`) drops the hardcoded default-only command whitelist and instead sets `active` when the submitted command's slash file exists (`.claude/commands/$SKILL.md`). This makes the dashboard live-status (`active` → then the `--if-active`-gated `permission-required` / `idle` / tool events) work for the composer flow and every future custom flow, and fixes `task-analyze` for free. **Part 2:** the composer authoring roles + conventions now ask the user (opt-in) whether to add the `activity` integration to a custom flow, worded as tokenless, attach it on yes, and validate recognition on install. Docs updated. Low risk — the change is hook-script text + prompt/convention text; no control-flow code paths.

## Checklist verification

- [x] `lifecycle-agent-active.sh` rewritten to existence check; hardcoded `case…esac` whitelist removed — verified in diff (`activity.json`).
- [x] `task-analyze` sets `active` — proven by hook simulation (fired).
- [x] `task-authoring-*` sets `active` — proven by hook simulation (`task-authoring-create/-implement/-review` fired).
- [x] Unknown command (no command file) does **not** fire — proven (`/bogus-cmd`, plain chat → no event; 3 fires / 5 prompts).
- [x] Composer asks opt-in activity question, tokenless wording — `authoring-analyze` step 7 rewritten + new `COMPOSER_RULES` "Live activity" bullet.
- [x] Attaches `activity` to the flow's `install` on yes — `authoring-implement/identity` + `COMPOSER_RULES`.
- [x] Install/review validates recognition + reports it — `composer-install-checklist` step 3.
- [x] Docs updated — `authoring/index.md` (new section) + `built-ins/default-modules.md` (`agent-active` row corrected).
- [x] Cursor noted out of scope — TASK.md "Out of scope".
- [x] Build ✅ · test **325/325** ✅ · typecheck ✅.

## Blockers

None.

## Non-blocking

1. **No regression test.** Nothing asserts the emitted `agent-active` hook uses the existence check — a future edit could silently reintroduce a hardcoded list. Consider a small test that composes/emits the `activity` integration and asserts `lifecycle-agent-active.sh` contains `.claude/commands/$SKILL.md` and no command whitelist. Verification here was by manual simulation only.
2. **Pre-existing: stdout not redirected on the backgrounded log call.** `… log-event agent-active … 2>/dev/null &` redirects only stderr. `UserPromptSubmit` hook stdout is injected into model context in Claude Code; if `log-event` ever printed to stdout it could leak into the prompt. Not introduced by N211 (every lifecycle hook shares this pattern) and the call is backgrounded, but a future sweep to `>/dev/null 2>&1` on all lifecycle hook calls would harden it.

## Security & edge cases

- **Path traversal — safe.** `$SKILL` is constrained by `grep -o '^/[a-zA-Z][a-zA-Z0-9_-]*'` (letters/digits/`_`/`-` only), so it can never contain `/` or `..`; tested `/../../etc/passwd` → empty → early exit, `/a/b` → `a`, `/foo.bar` → `foo`. The `-f` argument and `$DIR` are quoted. No injection.
- **`CLAUDE_PROJECT_DIR` fallback** to `.` is reasonable; in the real hook context Claude Code sets it.
- **Accepted trade-off (design):** any installed `.claude/commands/*.md` sets active, including a non-insight-flow command. Confirmed acceptable with the user during analysis; documented.
- **Cursor** uses `.cursor/…`, not `.claude/commands/` — these hooks are Claude-only and Cursor live-status is explicitly out of scope (separate `cursor-hooks` path).

## Notes

- MVP of the /task-analyze diagnosis in `iThinkToday/admin`. A stopgap patch of the same hook was already applied to that project by hand; the release ships it for real (and for the other built-in flows).
- Related: N207 (activity on by default), N200–N206 (composer flow), N210 (home base).
- Follow-ups: Cursor live-status; the regression test above.


---

## Round 2 — human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-10
**Verdict:** approved

### Summary

"approved please commit push merge release as a fix" — human sign-off. Ship it: commit → push → merge to `main` → release as a **fix** (patch) via release-please.

### Blockers

None.

### Suggestions (non-blocking)

- The two AI non-blocking items (regression test; stdout redirect sweep) accepted as follow-ups, not required for this release.

### Notes

- Releases as a patch (`fix:` → 2.3.0 → 2.3.1). Also fixes the other built-in flows and lets the composer offer the activity opt-in on new custom flows.
