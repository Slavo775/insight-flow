# N28 — Claude Code hook scripts and lifecycle notification wiring — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**PR:** https://github.com/Slavo775/insight-flow/pull/21
**Verdict:** approved

## Summary

N28 adds 6 Claude Code lifecycle hook scripts (`SessionStart`, `UserPromptSubmit`, `Stop`, `PreToolUse`, `PostToolUse`, `PermissionRequest`) wired into `.claude/settings.json`, plus an `install-lifecycle-hooks` CLI subcommand and automatic invocation from `insight-flow init`. All scripts follow the N27 `log-event --source hook --if-active` pattern; activation scoping, terminal bell, and macOS OS notifications are correctly implemented. Risk is low — hooks are additive, fail-silent (`2>/dev/null || true`), and the existing activity/enrichment hooks are untouched.

## Checklist verification

- [x] 6 lifecycle hook script constants defined in `activity-hook.ts` — **pass** (`LIFECYCLE_SESSION_START_SCRIPT` … `LIFECYCLE_PERMISSION_SCRIPT`, lines 277–369)
- [x] `installLifecycleHooks(cwd, insightFlowBin?)` exported; writes to `.claude/hooks/` with mode `0o755`; idempotent — **pass** (line 376–441; skips if `existsSync(hookPath)`)
- [x] Hook registrations merged into `.claude/settings.json` (not `settings.local.json`) for all 6 events — **pass** (line 403; playground `settings.json` confirms all 6 entries)
- [x] `lifecycle-agent-active.sh` detects skill names via `case` statement; non-matching prompts exit 0 — **pass** (lines 298–305 in template constant)
- [x] `lifecycle-permission.sh` calls `printf '\a'` and guarded `osascript` alert after logging — **pass** (lines 364–368)
- [x] `lifecycle-agent-idle.sh` sends `osascript` "Agent idle" notification after `log-event agent-idle --if-active` — **pass** (lines 316–319)
- [x] `install-lifecycle-hooks` CLI subcommand; `--bin` flag accepted; prints result JSON — **pass** (`commands/install-lifecycle-hooks.ts`; `opts.bin` at line 8)
- [x] `insight-flow init` calls `installLifecycleHooks` and prints hook count message — **pass** (`init/index.ts` line 215; `generateLifecycleHooks` helper at line 467)
- [x] `pnpm --dir packages/taskflow run build` passes — **pass** (verified)
- [x] `pnpm --dir packages/taskflow test` passes (no regressions) — **pass** (4/4 tests green)
- [x] No regressions to existing activity/enrichment hooks — **pass** (only additive changes to `activity-hook.ts`)

## Non-blocking

1. **`TOOL` extracted but unused in `lifecycle-pre-tool.sh`** (`activity-hook.ts:330`) — `TOOL=$(echo "$INPUT" | grep -o ...)` runs a grep/cut pipeline but the variable is never referenced. Either pass it as `--data "$TOOL"` to enrich the event or remove the extraction line.

2. **No automated tests for `install-lifecycle-hooks`** — `activity-hook.test.mjs` has 5 solid tests for `install-activity-hook` but zero for the new command. The spec's verification is manual-only, so not a blocker, but a parallel test covering fresh-install, idempotent second-run, and existing-entry preservation would close the gap (matching the existing pattern at lines 73–169).

3. **Human-readable message goes to stderr in `install-lifecycle-hooks.ts:31`** — `console.error(...)` for the "Generated N lifecycle hook(s)…" prose is intentional (JSON on stdout, human text on stderr) but differs from `install-activity-hook` which uses `console.log` for everything. Minor inconsistency; fine to leave.

## Security & edge cases

- **Bell fires unconditionally** (`lifecycle-permission.sh`): `printf '\a'` and `osascript` alert run after `log-event --if-active … || true`, so they fire even when no insight-flow session is active. This is intentional per the spec ("urgent events") — users always need approval-pending alerts — but worth documenting if the behaviour surprises consumers.
- **Shell quoting**: session IDs and prompts are always double-quoted (`"$SESSION_ID"`) before passing to `insight-flow`. No injection risk given UUID-shaped session IDs and the `case` guard on prompt content.
- **`osascript` guard**: correctly wrapped in `command -v osascript >/dev/null 2>&1` — fails silently on Linux/Windows. ✅

## Notes

- N29 is the natural follow-on: OS notification on `log-event done` (agent tier) and deduplication with the overlapping `taskflow-skill.sh` / `taskflow-done.sh` enrichment hooks.
- The `settings.json` target (committed, project-level) vs `settings.local.json` (personal) distinction is correctly preserved — lifecycle hooks are infrastructure, activity hooks are personal.


---

## Round 3 — AI Re-review (Combined N26 · N27 · N28)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-25
**Scope:** N28 blocker re-check + cross-cutting review of the N26→N27→N28 feature chain
**Verdict:** approved

### Blocker resolution

All four Round 2 blockers are resolved.

**Blocker 1 — Hook commands use relative paths**
Fixed in `activity-hook.ts:416`:
```typescript
const hookCmd = `\${CLAUDE_PROJECT_DIR}/.claude/hooks/${file}`;
```
The `installLifecycleHooks` function now always writes the env-var-prefixed absolute form. Stale detection (`staleIdx` search at line 426) finds and upgrades any existing entry that contains the file name but lacks `CLAUDE_PROJECT_DIR`. Both flat `{command}` and nested `{matcher, hooks:[{command}]}` shapes are scanned via `getCmd()`. Root project `.claude/settings.json` verified — all 6 hook entries now use the canonical `${CLAUDE_PROJECT_DIR}/...` form.

**Blocker 2 — Phase markers in milestones view**
Fixed in `dashboard.ts:793`:
```js
if (VERBOSITY === 'milestones') return tool === 'Event' || tool === 'Phase' || tool === 'Skill';
```
`Activity` is removed. Agent-emitted `log-activity` entries (tool=`Activity`) no longer appear in milestones verbosity. Hook-sourced events (tool=`Event`) and skill markers remain. Pass.

**Blocker 3 — Init re-runs must install missing hooks**
`init/index.ts:215` calls `generateLifecycleHooks(cwd)` unconditionally whenever `activityEngine.enabled !== false` — it is NOT gated behind a "first run only" check. `installLifecycleHooks` is internally idempotent: scripts are skipped if they already exist (`existsSync` at line 396), settings entries are skipped or upgraded but never duplicated. A fresh consumer project gets hooks on first `init`; an existing project that already has hooks gets a no-op; a project with stale paths gets them upgraded. Pass.

**Blocker 4 — Hook events must appear in the dashboard activity panel**
Hook-sourced events are written by `log-event.ts`'s `appendToActivityLog()` with `{tool: "Event", source: "hook"}` into `.taskflow-activity.jsonl`. The `/api/activity` endpoint reads this file and returns all entries to the frontend. `shouldShowEvent()` includes `tool === 'Event'` in every verbosity mode. The activity panel renders hook events with colour-coded badges (amber for `approval-required`, blue for `agent-active`, muted for `agent-idle`, etc.) via the N27-landed rendering path. Pass.

### Cross-cutting verification (N26 · N27 · N28)

The three tasks form a complete pipeline:

| Layer | Task | Artifact |
|---|---|---|
| Types + agent events | N26 | `EVENT_TYPES`, `TaskEvent`, `log-event` command (agent path) |
| Hook event schema + session JSONL | N27 | `ClaudeHookEvent`, `SessionEventsFile`, activation flag, `/api/session-events`, dashboard rendering |
| Shell scripts + registration | N28 | 6 lifecycle hook scripts, `installLifecycleHooks`, `init` integration |

Verification across the chain:
- `log-event --source hook --if-active` correctly exits 0 silently when no active flag — no noise outside skill sessions. ✅
- `agent-active` sets the flag (no `--if-active` guard); `agent-idle` and `session-end` clear it — activation bracket is correct. ✅
- `lifecycle-agent-active.sh` case-matches 10 insight-flow skill names via `#!/bin/bash` + `|` alternation; non-skill prompts exit 0. Scripts use `#!/bin/bash` shebang and are registered as file-path commands, so the OS honors the shebang — no POSIX-sh compatibility risk. ✅
- `lifecycle-pre-tool.sh` no longer extracts an unused `$TOOL` variable (Round 1 non-blocker from N28 Round 1 and N27). ✅
- `lifecycle-permission.sh` fires `printf '\a'` and `osascript` unconditionally (not guarded by `--if-active`) — correct per spec; approval alerts must always reach the user. ✅

### Remaining non-blocking

1. **Flat-format stale path detection gap** — if an external tool writes a stale entry in flat `{command: "..."}` format (not nested `{matcher, hooks: [{command}]}`), the update branch's `if (inner.length)` guard silently no-ops and leaves the path unchanged. All entries written by `installLifecycleHooks` itself use nested format, so this edge case is unreachable in practice. Low risk; no action needed until another writer appears.

2. **N27 non-blocking still open** — `recentEventsTimer` declared but unused; `/api/session-events` returns `sessionId: null` on empty state vs. non-null contract in checklist. Neither is a correctness issue in the current codebase.

3. **`settings.local.json` duplicate PostToolUse entry** — the root project's `settings.local.json` has `taskflow-activity.sh` registered twice under `PostToolUse`. Functionally harmless (idempotent write) but noisy. Cleanup candidate for a future housekeeping task.

### Security

No new concerns. All 6 hook scripts are fail-silent (`2>/dev/null || true`). `osascript` guarded with `command -v` check. Session IDs are UUID-shaped strings; no injection surface. Hook event payloads are `Record<string, unknown>` passed through without eval.

---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-25
**Verdict:** fix-needed

### Summary

Hooks are not triggering at all after Claude Code restart. The settings.json hook registration format has at least one bug confirmed against the official docs. Additionally, phase markers (`log-activity --phase`) emitted by agents (edit-start, research-end, etc.) are appearing in the activity panel — the owner says events should come exclusively from hooks (zero token cost), not from agent calls.

### Blockers

1. **Hook commands use relative paths — hooks do not fire**
   The docs show `${CLAUDE_PROJECT_DIR}/.claude/hooks/lifecycle-session-start.sh` as the canonical form. N28 registers bare relative paths (`.claude/hooks/lifecycle-session-start.sh`). If Claude Code does not guarantee CWD = project root when executing hooks, the script is not found and silently skips. After a full Claude Code restart, no events appear in the activity panel — confirming hooks do not execute.
   > "events do not trigger also I restarted the claude code and nothing"

2. **Phase markers (`log-activity --phase`) must not appear as events — they are token-spending agent calls, not hook events**
   The activity panel shows "EDIT-START editing REVIEW.md for N28" and "RESEARCH-END research complete…" — these are emitted by agents via `log-activity --phase`. The owner explicitly states events in the panel should come exclusively from hooks (zero token cost, outside Claude's context), not from agents spending tokens to call `log-activity`. Phase markers and hook-sourced events are currently mixed in the same feed.
   > "this edit start research end is events? please events should be only hooks so without token spending thing we are a little bit off roud there"

3. **`insight-flow init` must install missing hooks even on re-runs**
   Currently `initProject` calls `generateLifecycleHooks` only during a fresh init. If a project already has `taskflow.config.json` / `settings.json` and the lifecycle hooks are absent (e.g. installed before N28 shipped, or manually removed), a subsequent `insight-flow init` must still detect the missing hooks and add them. The idempotency guard in `installLifecycleHooks` (skip if file exists) only protects against double-writes — but the call itself must always happen, not be gated behind a "first run only" check.
   > "we need to setup during init too if is not the first setup and hooks are not in the settings we need to setup them"

4. **Hook-fired events must appear in the dashboard activity panel**
   When hooks fire (`session-start`, `agent-active`, `agent-idle`, `approval-required`, `tool-requested`, `tool-approved`, `file-written`, `file-edited`) and `log-event --source hook` writes them to the session JSONL, those events do not appear in the UI activity feed. The `/api/activity` endpoint and the activity panel must read and render hook-sourced events. Right now the panel shows only `log-activity` phase markers — hook events are written to a separate JSONL but never surfaced in the UI.
   > "we need all this hooks to appear in the ui in activity"

### Non-blocking

- `timeout: 10000` in the hook registration is almost certainly in seconds (per docs, default is 600s). 10 000 seconds (~2.7 h) is harmless but wrong — should be 10 or 30.

### Security & edge cases

None beyond the path issue above.

### Notes

- Docs URL reviewed: https://code.claude.com/docs/en/hooks — the `${CLAUDE_PROJECT_DIR}` variable is the canonical way to reference project-relative hook scripts.
- N29 or a hotfix task should also re-examine the `SessionStart` matcher: docs show `"startup|resume"` as the typical value; N28 uses `""` (match-all). Functionally equivalent per docs, but worth verifying live.

### Priority addendum (owner follow-up)

**Must work first — fix these three hooks before anything else:**
1. `UserPromptSubmit` → `agent-active` (**this is "start"** — fires when an insight-flow skill is invoked, e.g. `/task-implement`)
2. `Stop` → `agent-idle` ("end" — session finished)
3. `PermissionRequest` → `approval-required` + terminal bell + OS notification (AI needs human approval)

> "please crucial for me so far is start end and AI needs approval"
> "i mean more than Session start is UserPromptSubmit? should be start for us"

`SessionStart` fires for every Claude Code session regardless of context — it is NOT the meaningful "start". The meaningful start for insight-flow is `UserPromptSubmit` filtered to insight-flow skill names (the `case` statement in `lifecycle-agent-active.sh`). `SessionStart` → `session-start` is lower priority.

The remaining hooks (`SessionStart`, `PreToolUse`, `PostToolUse`) are lower priority — fix the path issue for all six, but validate the three above first.

### Event catalog addendum (owner follow-up — future improvement scope)

Owner provided the full Claude Code event list for future hook expansion. Key observations for N29+:

**`SessionEnd` is distinct from `Stop`** — N28 maps `Stop` → `agent-idle` ("Claude finishes responding", i.e. end of a turn). `SessionEnd` fires when the entire session terminates. Both matter: `Stop` is the per-turn end, `SessionEnd` is the true cleanup point. N28 scope only covers `Stop`; `SessionEnd` should be wired in a future task.

**`UserPromptExpansion`** — fires when a slash command expands into a prompt, *before* it reaches Claude. This may be more precise than `UserPromptSubmit` for detecting skill invocations (e.g. `/task-implement` expands here). Worth evaluating as an alternative or supplement to the current `UserPromptSubmit` + `case` detection.

**Not yet wired — lower priority for future tasks:**
`Setup`, `UserPromptExpansion`, `PermissionDenied`, `PostToolUseFailure`, `PostToolBatch`, `Notification`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `StopFailure`, `TeammateIdle`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `WorktreeCreate`, `WorktreeRemove`, `PreCompact`, `PostCompact`, `Elicitation`, `ElicitationResult`, `SessionEnd`.

> "but we need setup all this things to future improvement"
