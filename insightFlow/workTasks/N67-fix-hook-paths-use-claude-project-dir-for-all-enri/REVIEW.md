# N67 — fix hook paths: use CLAUDE_PROJECT_DIR for all enrichment hooks — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-28
**PR:** merged directly to `main` as commit `e6c16b3` (no PR — direct-to-main release flow used for v0.11.2)
**Verdict:** approved

## Summary

Three single-line string changes across two files: every hook-registration code path that wrote a `command` field into `.claude/settings.local.json` now uses the `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>` prefix instead of the bare relative path. Matches the existing pattern in `installLifecycleHooks()`. Risk: **very low** — replacement is mechanical, hook scripts already exist at the resolved path, and the lifecycle installer already used the same prefix successfully. Already shipped in v0.11.2 and v0.12.0; the upgrade path (re-run `insight-flow init`) rewrites consumer projects' `settings.local.json`.

## Checklist verification

- [x] `activity-hook.ts` PostToolUse registration uses `${CLAUDE_PROJECT_DIR}/...` — verified at `activity-hook.ts:130`.
- [x] `activity-hook.ts` enrichment loop `hookCmd` uses `${CLAUDE_PROJECT_DIR}/...` — verified at `activity-hook.ts:247` (escaped `\${...}` because it's inside a template literal).
- [x] `notify-hook.ts` Stop registration uses `${CLAUDE_PROJECT_DIR}/...` — verified at `notify-hook.ts:155`.
- [x] `.claude/settings.local.json` — current file in `main` has **6** `CLAUDE_PROJECT_DIR` occurrences and **0** stale `".claude/hooks/<file>"` paths. ⚠️ This file was NOT touched by the `e6c16b3` commit itself (see Non-blocking #1) — it was patched separately, likely by re-running `insight-flow init` after the binary upgrade. Functionally satisfied; process gap noted below.
- [x] `package.json` version bumped to `0.11.2` (now `0.12.0` after N70).
- [x] `CHANGELOG.md` has `## [0.11.2]` entry — verified at `packages/taskflow/CHANGELOG.md:9`.

## Non-blocking

1. **Checklist drift in the commit itself.** The spec listed `.claude/settings.local.json` as in-scope and the checklist marked it as a done-criterion, but `e6c16b3 --stat` shows only `activity-hook.ts`, `notify-hook.ts`, `CHANGELOG.md`, `package.json`, and tracker files. The settings file was cleaned up via the documented upgrade path (`insight-flow init`) rather than committed inline. Not a defect — the upgrade path *is* the fix for consumer projects — but next time, mention the out-of-band patch in the commit message or PR description so a reviewer can verify both halves in one place.

2. **No regression test.** A small `node:test` case asserting that `installEnrichmentHooks()` writes commands beginning with `${CLAUDE_PROJECT_DIR}/` (and similarly for `installActivityHook` and `installNotifyHook`) would prevent this exact bug class from regressing again. Three lines of test each. Not blocking — the runtime smoke (hook error banners no longer appear in Claude Code) is the user-visible signal — but cheap insurance for a fix that has bitten the project before.

3. **`HOOK_REL_PATH` constant intentionally untouched** per the spec's out-of-scope clause. Good — it's used for filesystem resolution (`existsSync(resolve(cwd, HOOK_REL_PATH, file))`), which CWD-resolves locally where it's fine. Worth a brief comment near the constant declaration ("kept relative; settings entries use the absolute form") so the next reader doesn't try to "consistency-fix" it back to a bug.

## Security & edge cases

- `${CLAUDE_PROJECT_DIR}` is expanded by Claude Code's shell at hook invocation time. If the var is unset (rare — Claude Code always sets it), the path becomes `/.claude/hooks/...` which fails open (script not found, hook errors but doesn't escalate). Safer than the prior failure mode where a relative path SOMETIMES worked depending on CWD, masking the bug until it bit someone.
- No injection surface: the file names are hard-coded constants in the source, not user input.

## Notes

- Build, typecheck, and pack all passed during the v0.12.0 release that includes this fix (N70 verified the full release chain). The user has confirmed runtime behaviour is good — the koktejl_new project running v0.12.0 receives hook events correctly.
- Related: this fix is what unblocked the N68 architecture work — without correct hook paths, the new `POST /log/events` endpoint would have received no traffic.
- Approval is recorded as a paper-trail review after-the-fact (work shipped in v0.11.2 before any AI review was logged). No code change required; this review is documentation.


---

## Round 2 — pending verdict

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-02
**Verdict:** approved

### Summary

Re-verified on current `main` (package at v0.13.0). The fix shipped in `e6c16b3` / v0.11.2 and remains intact — all three registration sites still emit `${CLAUDE_PROJECT_DIR}/.claude/hooks/<file>`. Round 1 review was written after-the-fact but never synced to the task shard (`status` stuck at `implemented`, `reviewCount: 0`); this round closes that tracker gap. No code changes required.

### Checklist verification

- [x] `activity-hook.ts` PostToolUse registration — `${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-activity.sh` at line 142.
- [x] `activity-hook.ts` enrichment loop `hookCmd` — `\${CLAUDE_PROJECT_DIR}/.claude/hooks/${file}` at line 259.
- [x] `notify-hook.ts` Stop registration — `${CLAUDE_PROJECT_DIR}/.claude/hooks/taskflow-notify.sh` at line 155.
- [x] `.claude/settings.local.json` — hook `command` entries all use `${CLAUDE_PROJECT_DIR}/...`; no bare `".claude/hooks/..."` paths in hook registrations.
- [x] CHANGELOG — `## [0.11.2]` entry documents N67 (line 45).
- [x] `pnpm --dir packages/taskflow run build` — passes (2026-06-02).

### Blockers

None.

### Non-blocking

1. **Tracker drift (process).** Round 1 `reviews.json` had an approved entry but `review-end` never updated the shard — `next-review` kept surfacing N67. Fixed by this round's `review-end`.
2. **Still no regression test** for `${CLAUDE_PROJECT_DIR}` prefix in installer output (same note as Round 1 — cheap insurance, not blocking).
3. **`HOOK_REL_PATH` comment** still absent near the constant — optional doc hardening.

### Security & edge cases

Unchanged from Round 1 — hard-coded filenames, no injection surface; unset `CLAUDE_PROJECT_DIR` fails open (script not found) rather than executing from wrong CWD.

### Notes

- Fix predates N68–N78; enrichment hooks on consumer projects still require `insight-flow init` after upgrade to rewrite stale relative paths.
- No PR — work merged direct-to-main in v0.11.2 release flow.
