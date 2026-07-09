# N205 — Composer flow polish — review-template convention, status display names, hooks in install validation — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-09
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

The three N205 changes are all correct and low-risk (prompt/definition/title edits, no CLI/flow-graph/agent change). The **doc-sync audit** you asked for turned up **one** stale line — `index.md:86` still says "the **8** agent commands" when the composer flow now has **5**. That's the only blocker; it predates N205 (leftover from N202–N204) but is exactly the kind of out-of-sync doc you asked to catch.

## Checklist verification

- [x] **A** — `COMPOSER_RULES` has the "Reviewers are templated too" bullet; renders into `authoring-create` and `authoring-review` (via `composer-authoring-conventions`).
- [x] **B** — `ready`.title = "ready to implement", `approved`.title = "ready to install"; **ids unchanged** (`ready`/`approved` still present; the `review --approved--> install` edge and the `ai-approved` divert are intact).
- [x] **C** — `composer-install-checklist` validate step names **hooks** and requires artifacts "present and correct" (agent md created / hook installed & correct / command installed & correct / `.mcp.json` resolves).
- [x] Docs updated where they list validation artifacts (`agents-and-subagents.md`, `walkthrough.md` now name hooks + "correct").
- [ ] **Docs fully in sync** — **FAILS:** `index.md:86` "8 agent commands" is stale (Blocker 1).

## Verification performed

- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **324 / 324** ✅ · typecheck ✅ · lint 0 errors.
- Loader: `ready`.title / `approved`.title updated, ids unchanged; **5 agents** unchanged; no id renames; `approved` still drives `review → install`.
- **Doc-sync sweep** across `website/docs`: no references to the removed agents (`Composer Tester/Fixer/Human Review`, `task-authoring-test/fix/human-review`) remain; agent-count mentions are "5" everywhere **except** the one below.

## Blockers

1. **`website/docs/authoring/index.md:86` — stale agent count ("8 agent commands").**
   - **Why:** The line reads ``- `.claude/commands/task-authoring-*.md` — the 8 agent commands``. The composer flow has been **5 agents** since N204 (N202 dropped the fixer, N203 the human-review, N204 the tester). A reader is told the install emits 8 commands when it emits 5. This is the doc-sync gap you asked to verify.
   - **Fix:** change "the **8** agent commands" → "the **5** agent commands". (The adjacent "12 per-kind subagents" on line 87 is still correct — subagents were untouched.)

## Non-blocking

- None. (The three N205 changes are clean.)

## Security & edge cases

- No executable code, input handling, or auth surface — prompt text + a status `title` string + docs + one test. No concern.

## Notes

- The blocker is a pre-existing doc staleness (N202–N204 changed the agent count but missed this one line), surfaced by the explicit doc-sync check. N205's own edits are all correct.
- Sixth composer-flow task (N200–N204 → N205 polish). Targets `agents-approved`.

---

## Fix (2026-07-09, task-review-fix)

- **Blocker 1 — resolved.** `website/docs/authoring/index.md:86` "the **8** agent commands" → "the **5** agent commands" (composer flow has 5 agents since N204). Line 87's "12 per-kind subagents" left as-is (still correct).
- **Doc-sync re-sweep:** across all of `website/docs`, no stale agent counts and no references to the removed agents (Tester/Fixer/Human-Review, `task-authoring-test/fix/human-review`) remain. Everything is in sync.
- **Gates:** `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **324 / 324** ✅.


---

## Round 2 — AI re-review (blocker fix + doc-sync)

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-07-09
**Verdict:** approved

### Summary

Round-1 blocker fixed and re-verified. `index.md:86` now reads "the 5 agent commands"; a full re-sweep of `website/docs` shows no stale agent counts and no references to the removed agents. All three N205 changes (A/B/C) remain correct. **Approved.**

### Checklist verification

- [x] **A** — reviewers-templated convention present and composed into the authoring agents.
- [x] **B** — status titles "ready to implement" / "ready to install"; ids `ready`/`approved` unchanged; edges + `ai-approved` divert intact.
- [x] **C** — installer validate step names hooks + "installed and are correct".
- [x] **Docs fully in sync** — Blocker 1 resolved; re-sweep clean.

### Verification performed

- `index.md:86` = "the 5 agent commands" ✅. Doc-sweep across `website/docs`: no stale counts, no `Composer Tester/Fixer/Human Review`, no `task-authoring-test/fix/human-review`.
- `pnpm --dir packages/taskflow run build` ✅ · `pnpm --dir packages/taskflow test` → **324 / 324** ✅.

### Blockers

- None.

### Non-blocking

- None.

### Security & edge cases

- No executable/auth surface — prompt text + a status title + docs + one test. No concern.

### Notes

- N205 (composer-flow polish) is clean end-to-end; the composer-v2 series (N200–N205) is code-complete. Targets `agents-approved`.
