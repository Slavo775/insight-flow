# N48 — readme-full-config-reference-and-init-guide — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**PR:** https://github.com/Slavo775/insight-flow/pull/31
**Verdict:** approved

## Summary

Docs-only change to `packages/taskflow/README.md`. Replaces the terse 3-line Install + Quickstart blocks with a full 6-step Getting started guide and expands Configuration from 10 to 25+ documented keys. All config interfaces from `types.ts` are now covered. No source files changed. Risk is minimal — pure documentation.

## Checklist verification

- [x] `## Getting started` replaces `## Install` + `## Quickstart` with 6 numbered subsections — **pass**
- [x] `### What init creates` lists `taskflow.config.json`, `workTasks/`, `master.json`, first shard, `.claude/commands/` (9 skill files), `CLAUDE.md`, `.claude/hooks/` — **pass** (full table with all 5 hooks)
- [x] `--examples` flag documented under Initialize subsection — **pass** (`README.md:36-41`)
- [x] `## Configuration` has `### Full example` block with all config keys — **pass**
- [x] Tables for Core, Activity engine (+3 rows), Notifications (+1 row), Agent behaviour, Multi-project master, Events — **pass**
- [x] Every field from `TaskflowConfig | ActivityEngineConfig | NotificationsConfig | MasterConfig | EventsConfig` has a table row — **pass** (all 22 leaf fields covered, cross-checked against `src/types.ts`)
- [x] `git diff --name-only` shows only `packages/taskflow/README.md` changed — **pass**
- [x] No source `.ts` files modified — **pass**

## Non-blocking

1. **Configuration intro sentence is backwards** (`README.md:190`). "Every key is optional *except* `workDir`, `shardSize`, `projectName`, `rolesDir`, and `server.port`" reads as if those keys are *required*, but `resolveConfig` provides defaults for every key including those. Suggested replacement: "All keys have defaults — `taskflow.config.json` itself is optional. The keys below are the ones most commonly customised; `insight-flow init` scaffolds them for you."

2. **`agents.extend` in Full example missing `taskmaster-change`** (`README.md:229`). Block lists 8 agents; `### Agent behaviour` table and `### Extending built-in agents` both correctly list 9. Add `"taskmaster-change": []` to the full example for consistency.

3. **`npx insight-flow` (dashboard without global install) not shown** in `### 1. Install`. Users who prefer npx throughout have no way to discover `npx insight-flow` to launch the dashboard. Consider a brief note after the global install block.

## Security & edge cases

None — documentation only.

## Notes

- `jsonc` fence label is correct for display; the note to strip `//` before runtime use is accurate.
- The `--examples` description ("produces a commented version") is slightly loose — init uses `"// key"` JSON comment-key stubs rather than true `//` comments — harmless in practice.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-26
**Verdict:** approved

### Summary

Three targeted fixes addressing all non-blocking findings from Round 1. Commit `be2e9cc` on branch `rework/N48-readme-full-config-reference-and-init-guide`. No source files changed — documentation only.

### Checklist verification

- [x] **Fix 1 — config intro sentence** (`README.md:191`): "Every key is optional *except* `workDir`, …" replaced with "All keys have defaults — `taskflow.config.json` itself is optional. The keys below are the ones most commonly customised; `insight-flow init` scaffolds them for you." — **pass**
- [x] **Fix 2 — `taskmaster-change` in Full example** (`README.md:238`): `"taskmaster-change": []` added as the 9th entry in `agents.extend` block — **pass**. Block now lists all 9 agents, matching the `### Agent behaviour` table and `### Extending built-in agents` section.
- [x] **Fix 3 — `npx insight-flow` in Install step** (`README.md:26`): `npx insight-flow  # launch dashboard` added under "Or one-off via npx" — **pass**. Users who prefer npx now see both init and dashboard commands.

### Blockers

None.

### Non-blocking

None.

### Security & edge cases

None — documentation only.

### Notes

All three Round 1 non-blocking findings are fully resolved. The README is consistent: full example matches the table sections, config intro is accurate, and both install paths (global + npx) are shown.


---

## Round 3 — approved

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-26
**Verdict:** approved

### Blockers

None.

### Notes

"okej done merge it"
