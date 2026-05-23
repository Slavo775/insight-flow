# N21 — Richer activity feed — phase milestones and free hook enrichment — Review

## Human Review — Round 1

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Overview card activity section has wrong visual treatment** — `packages/insight-flow-master/src/overview.ts` → `renderActivityMini` / `renderCard`

   The activity mini-feed renders as a bare `<div class="proj-activity-feed">` below the count chips with no wrapping box. In the screenshot it shows as a single muted plain-text line ("use rtk git push -u origin HEAD") with no visual hierarchy — does not match the dark `proj-task` wrapper that the current-task section uses.

   **Human said:** "please activity show as active task same wrapper and use all data what you have for this"

   **Fix:** Wrap the activity mini-feed in the same `proj-task`-style dark box used for the current task. Inside it, render all available fields from the activity event — tool, action, label, message, skill — not a single truncated string. Use the badge classes already defined (`proj-activity-badge-phase`, etc.) to show the event type and full data clearly.

### Suggestions (non-blocking)

- Consider showing the active/idle badge inside the activity wrapper box (co-located with the feed) rather than in the card header, so the visual connection between "last activity" and "idle/active state" is obvious.

### Notes

- Only the overview card activity rendering is flagged in this round. The rest of the N21 implementation (aside panel, timestamps, log-activity command, enrichment hooks, PHASE MARKERS in role files, master endpoint) was not reviewed from this screenshot.


---

## Round 2 — AI Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Summary

Full implementation of N21 is in place across all target files. The round-1 blocker (overview card activity wrapper) is fixed. One new blocker found: `log-activity.test.mjs` is not registered in the `pnpm test` script, so `pnpm --dir packages/taskflow test` does not exercise the new tests. README documentation is missing (non-blocking for merge but checklist-required). Everything else checks out.

### Checklist verification

**Config** ✅ — `phaseMarkers`, `hookEnrichment`, `verbosity` added to `types.ts` + `config.ts`; `buildConfigWithExamples` emits JSONC comments for all three.

**Free hooks** ✅ — `UserPromptSubmit` (skill detection), `Stop` (completed event via `.last-skill` side file), `PreToolUse` (command classifier) all generated in `activity-hook.ts`. `init/index.ts` gates generation on `hookEnrichment !== false`. Idempotent.

**`log-activity` subcommand** ✅ — `commands/log-activity.ts` appends one JSONL line with `tool: "Phase"`; exits < 100ms (verified by test); respects `phaseMarkers: false`; `--phase done` → `action: "done"` confirmed.

**Dashboard aside panel** ✅ — Popup replaced by `<aside>`, collapse/expand with `localStorage` persistence, newest-first (`unshift` + `insertBefore(item, firstChild)`), cap at 50, `refreshTimestamps()` called on every WS message (snapshot, file-change, activity events), `shouldShowEvent` enforces `verbosity`. Event renderers for Phase / Skill / Tool+label / fallback all present.

**Master server activity endpoint** ✅ — `GET /api/activity/:projectId` added in `server.ts`; returns last 3 from `entry.state.recentActivity`; 404 for unknown project; 200 with `[]` if `recentActivity` is absent (uses `?? []`).

**Overview card active/idle** ✅ — `deriveIdleStatus` returns `'idle'` only when last event is `Phase+done`, `'active'` otherwise, `'none'` with no events. Idle/active badge moved inside `proj-task` wrapper (round-1 suggestion implemented). No timeout path exists.

**Agent role files** ✅ — All 9 canonical role files + 8 templates have `<!-- taskflow:phase-markers:start/end -->` block. `stripPhaseMarkers` in `init/index.ts` removes it when `phaseMarkers: false`.

**`pnpm test` wires** ❌ — `log-activity.test.mjs` runs cleanly (4/4 pass) but is **not added to the `test` script** in `packages/taskflow/package.json`. `pnpm --dir packages/taskflow test` skips it entirely.

**README** ❌ — No new documentation for free hooks, `log-activity` CLI, three config toggles, verbosity modes, done-event idle convention, or master server endpoint. Checklist item not met.

### Blockers

1. **`log-activity.test.mjs` not registered in `pnpm test` script** — `packages/taskflow/package.json` test script does not include `node test/log-activity.test.mjs`. CI / `pnpm --dir packages/taskflow test` never runs the new tests. Add `&& node test/log-activity.test.mjs` to the script string.

### Non-blocking

1. **README undocumented** — Checklist requires a new "Activity feed enrichment" section covering hooks, CLI, config toggles, verbosity, done-event idle, master endpoint. Missing entirely. Should be addressed before v0.5.0 release (N22).

2. **Typo in variable name** — `overview.ts:182` uses `var idgeBadge` (missing `l`). Harmless (local var, not referenced externally), but worth a one-character fix.

3. **`log-activity-done.test.mjs` referenced in CHECKLIST but not created** — Coverage is provided by the existing `log-activity.test.mjs` (test 2 checks `action === "done"`). No functional gap, but checklist wording is misleading.

### Security & edge cases

- `renderActivityMini` in `overview.ts` passes all values through `escHtml()` before insertion — no XSS risk from malicious activity event content.
- `cmdLogActivity` swallows all `appendFileSync` errors — correct for fire-and-forget; log file path is config-controlled, not user-supplied at runtime.
- Hook scripts use `printf` for JSONL writing with `%s` substitution — shell injection is not possible as values come from Claude Code's own JSON output, not external user input.
- `PreToolUse` classifier uses `grep -q` pattern matching — truncation/edge cases in long commands are benign (classifier falls back to no-label, which is correct).

### Notes

- The master server endpoint reads from `entry.state.recentActivity` (push model) rather than reading `.taskflow-activity.jsonl` directly as the spec proposed. This is the correct architectural choice given the master has no filesystem access to project directories — no fix needed.
- Round-1 suggestion (idle badge co-located with activity wrapper) is implemented.


---

## Human Review — Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Overview card activity text must be white and larger** — `packages/insight-flow-master/src/overview.ts` → `.proj-activity-item` CSS

   Currently activity text is muted/dim. Human said: "please activity white text and bigger".

   **Fix:** Change `.proj-activity-item` text color from `var(--text-muted)` to `var(--text)` (white) and increase font-size.

2. **Overview card grid layout must be responsive** — `packages/insight-flow-master/src/overview.ts` → `#grid` CSS

   The card grid should behave like the project grid: 1 project = full width; 2 projects = 50% each (2-column); 3–4 projects = 50% width × 50% height (2×2). Human said: "width like grid should be if one on the full available space if 2 width 50% if 3 and 4 height 50% width 50%".

   **Fix:** Use CSS grid with responsive column rules — 1 card fills full row, 2 cards split 50/50, 3–4 cards form a 2×2 grid with equal height cells.

3. **Activity in overview card may not be in sync with the dashboard** — `packages/insight-flow-master/src/overview.ts` → `renderActivityMini` + data source

   Human said: "activity seems dont know if we have all activiti 1:1 with dashboard". The overview card currently renders up to the last 3 events from `state.recentActivity`. This data comes from the project's push to the master server — it may lag or miss events that have been written to the activity log but not yet pushed. The dashboard reads the JSONL file directly via the WebSocket feed.

   **Fix:** Verify the overview card always reflects the latest pushed activity state. At minimum, document and/or surface the 3-event limit clearly, and ensure the field shown (`recentActivity`) is populated on every project state push.

### Suggestions (non-blocking)

- None in this round.

### Notes

- Screenshot shows 1 project card ("insight-flow") with "down" badge. Activity section is visible with EDIT/READ badges and truncated paths in muted color. Grid is currently full-width for a single project (correct), but multi-project layout has not been verified visually.


---

## Human Review — Round 4

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Blockers

1. **Activity events appear duplicated in the feed** — `packages/taskflow/src/server/activity.ts` → `ActivityEngine.readNewLines`

   Screenshot shows "completed N21 fix — all blockers resolved" DONE event appearing three times in the activity panel at the same timestamp.

   **Human said:** "why 3 times?"

   **Root cause:** `readNewLines` uses `existingCount = this.events.length` as the index of the first unprocessed line in the JSONL file. But `this.events` is a ring buffer — once it reaches `maxEvents`, old entries are evicted and `this.events.length` stays capped at `maxEvents`. After the first eviction, the next call to `readNewLines` uses `existingCount = maxEvents` as the start index, even though the file may have `maxEvents + N` lines already processed. This causes lines `[maxEvents .. lines.length-1]` to be re-emitted on every subsequent read — including events that were processed long ago.

   With `maxEvents = 200` and the `fs.watch` watcher plus 500ms fallback poll both calling `readNewLines`, a busy session easily exceeds 200 events. After that, each new append re-emits a batch of already-seen events.

   **Fix:** Introduce a private `linesProcessed` counter (never decremented) as the canonical line offset. Use it instead of `this.events.length` as the loop start index. Ring buffer eviction must not affect it.

### Suggestions (non-blocking)

- None in this round.

### Notes

- Duplicate events also cause incorrect idle/active state cycling (an old DONE event re-emitted resets the panel to idle unexpectedly).
- The ring buffer eviction logic at `activity.ts:86-88` is correct for the in-memory cap; only the line-offset tracking is wrong.
