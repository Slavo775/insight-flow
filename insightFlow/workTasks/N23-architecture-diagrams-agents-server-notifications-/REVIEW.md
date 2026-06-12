# N23 — Architecture diagrams: agents, server, notifications, activity — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-24
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

N23 creates `docs/architecture-diagrams.md` with four Gemini-ready diagram prompts, and adds `agents.extend` entries to `taskflow.config.json` so that agents are reminded to keep the prompts in sync with code changes. No source code was modified. Risk is low — docs-only change with a config extension. Two factual errors were found in Diagram 3 by reading `notify-hook.ts` and `commands/notify.ts` against the prompt: the status-check logic is mis-attributed to the CLI rather than the shell hook, and the browser notification mechanism is mis-described as a Service Worker.

## Checklist verification

- [x] Diagram 1 prompt covers all 8 agents, all status transitions, quality gate note — **pass**
- [x] Diagram 2 prompt covers master server, project server, lock file, iframe injection, shard hydration — **pass**
- [ ] Diagram 3 prompt covers Stop hook, OS notifications, browser notifications, config gates — **fail** (two factual errors; see Blockers)
- [x] Diagram 4 prompt covers agent phase calls, enrichment hooks, JSONL file, ActivityEngine, WebSocket, verbosity config — **pass**
- [x] Each prompt is copy-pasteable and self-contained — **pass**
- [x] No source code changed — **pass**
- [x] `pnpm build` passes — **pass**

## Blockers

**1. Diagram 3 — `insight-flow notify` does not read `master.json` or check task status**

- File: `docs/architecture-diagrams.md`, Diagram 3 section; also `TASK.md` Diagram 3 section
- Current prompt says: "`insight-flow notify` reads `workTasks/master.json` to get currentTaskId. Loads the current task's status from the shard JSON. If status is one of: implemented | approved | … → fires an OS-level desktop notification."
- Why it's wrong: `cmdNotify` in `packages/taskflow/src/commands/notify.ts:4-16` takes a message argument and fires the notification unconditionally (only gate: `config.notifications.cli === false` → exit 0). The status check and conditional logic live entirely in the **shell hook script** (`packages/taskflow/src/notify-hook.ts:32-46`): it runs `insight-flow current`, parses the JSON output with grep/cut, and uses a `case` statement to decide whether to call `insight-flow notify`.
- Fix: Correct the Diagram 3 prompt to show the flow as:
  1. Stop hook shell script → runs `insight-flow current` → extracts `status` from JSON
  2. `case $STATUS in implemented|approved|…)` → calls `insight-flow notify "<taskId> <status>"`
  3. `insight-flow notify` → fires platform-specific OS notification (osascript / notify-send / PowerShell toast)
  The status check is in the hook, not in the CLI.

**2. Diagram 3 — browser notifications do not use a Service Worker**

- File: `docs/architecture-diagrams.md`, Diagram 3 section; also `TASK.md` Diagram 3 section
- Current prompt says: "The project server dashboard HTML registers a Service Worker."
- Why it's wrong: `packages/taskflow/src/server/dashboard.ts:555-595` uses `window.Notification` directly — `Notification.requestPermission()`, `new Notification(title, { silent: !sound })`. No Service Worker is registered anywhere in the codebase.
- Fix: Replace "registers a Service Worker" with "uses the Web Notifications API directly (`new Notification(...)`) — no Service Worker involved."

## Non-blocking

- `taskflow.config.json` agents.extend entries are accurate and appropriately scoped. The four diagram-update reminders are correctly wired to `taskmaster`, `taskmaster-change`, `task-implement`, and `task-review-fix`.
- The maintenance header in `docs/architecture-diagrams.md` ("If any of the following areas change…") is a good addition — makes the file self-documenting.
- Diagrams 1, 2, 4 prompts are factually accurate against the source; style guidance and component descriptions match the actual code paths.
- The spec (Goal #5) said prompts live in TASK.md; user explicitly requested `docs/` during implementation. Both locations now have the prompts, which is fine — `docs/` is the canonical copy going forward.

## Security & edge cases

None — docs and config only.

## Notes

- Both blockers are in Diagram 3 only. Diagrams 1, 2, 4 are approved as-is.
- Both files (`docs/architecture-diagrams.md` and `TASK.md`) need the same fix — the prompt text is duplicated.
- After fix, the corrected Diagram 3 flow: Claude Code harness → Stop hook shell → `insight-flow current` → `case` on status → `insight-flow notify` → platform OS notification (osascript/notify-send/PowerShell).


---

## Round 2

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-24
**Verdict:** approved

### Summary

Both round 1 blockers are resolved. Diagram 3 in both `docs/architecture-diagrams.md` and `TASK.md` now correctly describes the notification flow: the shell hook owns the status check via `insight-flow current` + `case $STATUS`, and the browser channel uses the Web Notifications API directly with no Service Worker. The Style line was also corrected to place the condition diamond in the hook. No other content was changed. Approved.

### Checklist verification

- [x] Diagram 1 prompt — pass (unchanged from round 1)
- [x] Diagram 2 prompt — pass (unchanged from round 1)
- [x] Diagram 3 prompt — **pass** (both blockers fixed)
  - Shell hook correctly shows: `insight-flow current` → grep/cut extract → `case $STATUS` → conditional `insight-flow notify` call
  - `insight-flow notify` correctly described as message-only, no status check, platform-specific OS call (osascript/notify-send/PowerShell)
  - Browser notifications correctly described as Web Notifications API directly, no Service Worker
  - Style line correctly places condition diamond inside/after the hook box
- [x] Diagram 4 prompt — pass (unchanged from round 1)
- [x] Each prompt copy-pasteable and self-contained — pass
- [x] No source code changed — pass
- [x] `pnpm build` passes — pass
- [x] Fix applied consistently in both files (docs/ and TASK.md) — pass

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

None.

### Notes

`docs/` is now the canonical location for the prompts; TASK.md carries a copy for version-tracking with the task itself. Both are in sync.


---

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-24
**Verdict:** approved

### Blockers

None.

### Suggestions (non-blocking)

None.

### Notes

approved push all things
