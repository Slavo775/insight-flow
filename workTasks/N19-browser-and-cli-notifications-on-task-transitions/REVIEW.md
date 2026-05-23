# N19 — Browser and CLI notifications on task transitions — Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**PR:** https://github.com/Slavo775/insight-flow/pull/12
**Verdict:** fix-needed

## Summary

N19 ships browser and CLI notifications correctly for all agents except the git agent. The `insight-flow notify` CLI works, the dashboard Notification API diff is wired up, and all other role files have the WHEN TO NOTIFY section. However the git agent — which owns the `merge` milestone (the most important one) — was missed entirely because it has no standalone `TASK_GIT_ROLE.md` file; its prompt lives as an inline constant (`SKILL_GIT`) in `init/index.ts` and as a self-contained skill in `.claude/commands/task-git.md`. Neither received the WHEN TO NOTIFY section.

## Checklist verification

- [x] `TaskflowConfig.notifications: { browser, cli }` with defaults true/true — pass
- [x] Dashboard diffs snapshots, fires Notification API on watched status changes — pass
- [x] Settings popover with per-status toggles, sound, mute-focused (localStorage) — pass
- [x] Notification permission flow — pass
- [x] `insight-flow notify "<message>"` with `--title`, `--project` flags — pass
- [x] Platform auto-detect: osascript / notify-send / PowerShell; errors swallowed — pass
- [x] CLI exits <100 ms fire-and-forget — pass
- [x] `notifications.cli: false` → silent exit 0 — pass
- [x] Canonical + template role files have WHEN TO NOTIFY section — **partial fail** (git agent missing)
- [x] `insight-flow init` strips WHEN TO NOTIFY when notifications.cli is false — pass
- [x] README Notifications section — pass
- [x] typecheck ✓ build ✓ tests ✓ — pass

## Blockers

1. **Git agent missing WHEN TO NOTIFY — no merge notification fires**

   The `merge` milestone (`insight-flow notify "<task-id> merged"`) is the most valuable one and belongs to the git agent. The git agent prompt lives in two places that were both skipped:
   - `packages/taskflow/src/init/index.ts` — `SKILL_GIT` constant (~line 375) — no WHEN TO NOTIFY
   - `.claude/commands/task-git.md` — this project's canonical git skill — no WHEN TO NOTIFY

   There is no `TASK_GIT_ROLE.md` root file or template, so the loop that updated the 8 role files never touched the git agent.

   **Fix:** Add a WHEN TO NOTIFY block to both `SKILL_GIT` in `init/index.ts` and to `.claude/commands/task-git.md`:
   ```
   WHEN TO NOTIFY
   - After `insight-flow merge --id Nxx`: `insight-flow notify "<task-id> merged"`
   - Limit: 1 call per task. Skip if notifications.cli is false in config.
   ```

## Non-blocking

- The WHEN TO NOTIFY section in the other 8 role files lists `After merge` as a line, but only the git agent ever runs `insight-flow merge`. Harmless but redundant — could be cleaned up in a follow-on.

## Security & edge cases

None.

## Notes

- No `TASK_GIT_ROLE.md` exists anywhere in the repo; the git agent has always been an inline skill string. Any future changes to the git agent must update both `SKILL_GIT` in `init/index.ts` AND `.claude/commands/task-git.md`.


---

## Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Summary

Deeper audit after round 1. The WHEN TO NOTIFY gap is wider than the git agent alone. All nine `SKILL_*` constants in `init/index.ts` — the prompts that consumer projects actually get when they run `insight-flow init` — are condensed inline strings with no WHEN TO NOTIFY. Consumer project agents will never fire notifications. Additionally, even in this repo where the 8 skills reference `@TASK_*_ROLE.md`, the behavioral signal is too weak: the task-human-review agent ran a full review session and recorded `fix-needed` without calling `insight-flow notify "N19 needs fixes"`.

### Blockers

1. **All `SKILL_*` constants in `init/index.ts` missing WHEN TO NOTIFY — consumer projects get no notifications**

   When a user runs `insight-flow init` in their project, nine skill files are written from the inline `SKILL_*` constants (`SKILL_IMPLEMENT`, `SKILL_REVIEW`, `SKILL_GIT`, etc.). These are short bootstrap prompts with no `@TASK_*_ROLE.md` reference and no WHEN TO NOTIFY section. The template role files in `templates/roles/` are copied to `.claude/roles/` but the generated skills don't reference them. Net result: every consumer project agent silently skips notifications.

   **Fix:** Add a compact WHEN TO NOTIFY block to each `SKILL_*` constant in `packages/taskflow/src/init/index.ts`. Only the milestones relevant to each skill are needed (e.g. `SKILL_IMPLEMENT` → after implement-end; `SKILL_GIT` → after merge; `SKILL_REVIEW` → after review-end).

2. **task-git skill (`.claude/commands/task-git.md`) missing WHEN TO NOTIFY — same root cause as blocker 1 but affects this repo directly**

   Already captured in round 1. The file is a standalone inline prompt (not an `@` reference). The merge notification — the most valuable one — never fires. Same fix: add WHEN TO NOTIFY to the file and to the `SKILL_GIT` constant.

3. **WHEN TO NOTIFY section is too easy to skip — agents follow workflow steps, not standalone sections**

   Even with the section present in the role files (e.g. `TASK_HUMAN_REVIEW_ROLE.md`), the task-human-review agent completed a full review-end → fix-needed flow without calling `insight-flow notify "N19 needs fixes"`. The section sits between OUTPUT CONTRACT and ROLE-SPECIFIC OVERRIDES as a named block but is not embedded in the numbered workflow steps where agents actually execute work.

   **Fix:** Move the WHEN TO NOTIFY call into each role's workflow as a numbered step, not a standalone section. Example for TASK_HUMAN_REVIEW_ROLE.md lifecycle:
   ```
   - Lifecycle: review-start → record → review-end → (if fix-needed) insight-flow notify "<id> needs fixes" → (if approved) insight-flow notify "<id> approved" → /task-git
   ```

### Non-blocking

- The `WHEN TO NOTIFY` section in the 8 role files listing all 4 milestones (including `After merge`) is redundant for agents that never reach merge. No harm done, but the section could be agent-scoped to reduce noise.

### Security & edge cases

None.

### Notes

- The gap between consumer-project skills and this-repo canonical skills is a recurring pattern: changes to role file templates don't automatically propagate to the `SKILL_*` constants. Consider whether init should generate skills that reference `@roles/TASK_*_ROLE.md` instead of embedding inline strings — that would make future additions like WHEN TO NOTIFY automatic for all consumers.


---

## Round 3

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-23
**Verdict:** fix-needed

### Summary

Design direction change: WHEN TO NOTIFY should not be inlined in each role file: WHEN TO NOTIFY should not be inlined in each role file. Instead, create a shared `AGENT_NOTIFY.md` file (same pattern as `AGENT_ENFORCEMENT.md` and `AGENT_PROTOCOL.md`) referenced by all agents via `@AGENT_NOTIFY.md`. This supersedes the inline-block fix approach from rounds 1 & 2 and solves the "single source of truth" and "easy to skip" problems in one move.

### Blockers

1. **Replace inline WHEN TO NOTIFY blocks with a shared `@AGENT_NOTIFY.md` reference**

   All the WHEN TO NOTIFY text duplicated across 8 root role files and 8 template role files should be replaced with a single `@AGENT_NOTIFY.md` reference — exactly the same pattern as `@AGENT_ENFORCEMENT.md` and `@AGENT_PROTOCOL.md`.

   **Fix:**
   - Create `AGENT_NOTIFY.md` at the repo root with the canonical WHEN TO NOTIFY content (4 milestones + limit + skip-if-false note)
   - Create `packages/taskflow/templates/roles/AGENT_NOTIFY.md` with the same content (gets copied to `.claude/roles/` in consumer projects by `initProject`)
   - In all 8 root role files and 8 template role files: remove the inline WHEN TO NOTIFY block and add `@AGENT_NOTIFY.md` after `@AGENT_PROTOCOL.md`
   - In `.claude/commands/task-git.md` and `SKILL_GIT` constant: add `@AGENT_NOTIFY.md` (or inline it since task-git has no `@` reference chain)
   - In all other `SKILL_*` constants in `init/index.ts`: add `@AGENT_NOTIFY.md` reference (or a one-line inline note since these are condensed bootstrap prompts)
   - `insight-flow init` stripping logic: instead of regex-stripping per-file, simply empty or replace `AGENT_NOTIFY.md` in the consumer's `.claude/roles/` when `notifications.cli: false`

   **Why this is better than the round 2 fix:**
   - Single file to update if milestone list changes
   - Consistent with the existing shared-rules pattern
   - Stripping is cleaner (one file to blank, not a regex per role file)
   - Agents see it at a predictable position in every role load

### Non-blocking

- The `SKILL_*` constants (consumer bootstrap prompts) are too short to include the full `AGENT_NOTIFY.md` content inline. For those, a one-line reference like `@AGENT_NOTIFY.md` in the generated skill file (if the consumer's `.claude/roles/` path is accessible) would be ideal. If not, a single condensed line suffices: `After key milestones run: insight-flow notify "<task-id> <milestone>"`.

### Security & edge cases

None.

### Notes

- `AGENT_NOTIFY.md` should be listed alongside `AGENT_ENFORCEMENT.md` and `AGENT_PROTOCOL.md` in `README.md` and in the sync-role-templates script.


---

## Round 4

**Reviewer:** AI (task-review)
**Date:** 2026-05-23
**PR:** https://github.com/Slavo775/insight-flow/pull/12
**Verdict:** fix-needed

### Summary

Round 3 changes are structurally sound: `AGENT_NOTIFY.md` shared file is in place, all 16 role files reference it, `SKILL_*` constants carry inline notify steps, `stripWhenToNotify` now blanks the file instead of regex-stripping per file. Two issues remain. The browser notification title is missing the `<projectName>` prefix the spec requires. The `init --examples` path emits a duplicate `"notifications"` key because the key is already present in the base config before the stub is appended.

### Checklist verification

- [x] `TaskflowConfig.notifications: { browser, cli }` with defaults true/true — pass
- [x] Dashboard diffs snapshots, fires Notification API on watched status changes — pass
- [ ] Notification title format `<projectName>: <taskId> → <status>` — **fail** (`fireDesktopNotif` uses `taskId + ' → ' + status`, projectName absent)
- [x] Settings popover with per-status toggles, sound, mute-focused (localStorage) — pass
- [x] Notification permission flow — pass
- [x] `insight-flow notify "<message>"` with `--title`, `--project` flags — pass
- [x] Platform auto-detect: osascript / notify-send / PowerShell; errors swallowed — pass
- [x] CLI exits <100 ms fire-and-forget — pass
- [x] `notifications.cli: false` → silent exit 0 — pass
- [x] Canonical + template role files have `@AGENT_NOTIFY.md` — pass
- [x] `insight-flow init` strips WHEN TO NOTIFY (blanks AGENT_NOTIFY.md) when cli false — pass
- [x] SKILL_* constants carry inline notify steps — pass
- [x] README Notifications section — pass
- [x] typecheck ✓ build ✓ tests ✓ — pass

### Blockers

1. **Browser notification title missing `<projectName>` — spec deviation**

   `dashboard.ts:581`: `fireDesktopNotif` constructs the title as `taskId + ' → ' + status`. The CHECKLIST specifies `<projectName>: <taskId> → <status>`. Without the project name, notifications are ambiguous when multiple projects are open (N20 will compound this).

   The `projectName` is available server-side in `config`. Fix: embed it into the generated script as a JS literal and use it in `fireDesktopNotif`.

   ```typescript
   // in getScript, add to the var declarations block:
   var PROJECT_NAME = ${JSON.stringify(config.projectName || '')};
   ```

   ```javascript
   function fireDesktopNotif(taskId, status, sound) {
     var title = (PROJECT_NAME ? PROJECT_NAME + ': ' : '') + taskId + ' → ' + status;
     try { new Notification(title, { silent: !sound }); } catch(e) {}
   }
   ```

   `getScript` signature needs `projectName` added, or the value inlined at call site in `getDashboardHtml`.

2. **`buildConfigWithExamples` emits duplicate `"notifications"` key**

   `init/index.ts:534–558`: `buildConfigWithExamples` serialises `config` via `JSON.stringify`, which already includes `"notifications": {"browser":true,"cli":true}` (set on line 47). The stub then re-inserts `"notifications"` with JSONC comments before the closing brace, creating a duplicate key. Most parsers silently use the last value, but the output is confusing and technically invalid JSON.

   Fix: exclude `notifications` from the base config before stringifying:
   ```typescript
   const { notifications: _n, ...baseWithoutNotifications } = config;
   const base = JSON.stringify(baseWithoutNotifications, null, 2);
   ```

### Non-blocking

- `init/index.ts:166` comment says "Strip WHEN TO NOTIFY block from per-project role copies" — the function now blanks `AGENT_NOTIFY.md` instead. Update the comment.
- `README.md:173` says "omits the WHEN TO NOTIFY section from per-project role-file copies" — mechanism changed; update to "clears `AGENT_NOTIFY.md` in the project's roles directory".

### Security & edge cases

None.

### Notes

- `AGENT_NOTIFY.md` is not yet listed alongside `AGENT_ENFORCEMENT.md` / `AGENT_PROTOCOL.md` in `README.md` (carried from round 3). Non-blocking for N19.

## Round 4 — pending verdict

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-23
**Verdict:** pending

### Summary

### Checklist verification

### Blockers

### Non-blocking

### Security & edge cases

### Notes
