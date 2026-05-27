# N55 — release v0.8.0 — changelog, README, version bump

**Type:** chore
**Priority:** high
**Created:** 2026-05-27

## Problem

Seven tasks have been merged to main since the last published release (v0.7.0 / package.json currently at 0.7.1), covering a new config UI page, interactive `init` prompts, browser-notification rework, prompt-build refactor, and agent-token savings. None of these appear in CHANGELOG.md yet. N49 (docs audit) is `approved` but not merged — it must be merged or deliberately deferred before cutting the release. The package version and changelog need to be updated and the package republished to npm.

## Goal

1. Confirm N49 is merged to main (or explicitly deferred to v0.8.1).
2. Write the `[0.8.0]` CHANGELOG entry covering all merged tasks since v0.7.0.
3. Audit `packages/taskflow/README.md` for anything made stale by N50–N54 and patch if needed.
4. Bump `packages/taskflow/package.json` `version` to `0.8.0`.
5. Build and publish to npm (`pnpm pack:taskflow` → `npm publish`).

## Scope

### In scope

- `packages/taskflow/CHANGELOG.md` — add `[0.8.0]` section above `[0.7.0]`.
- `packages/taskflow/package.json` — bump `version` field to `0.8.0`.
- `packages/taskflow/README.md` — patch any stale references caused by N50–N54 (e.g. `taskflow.prompt.json` references removed by N50, `activityEngine.phaseMarkers` behaviour changed by N53).
- `sync-roles` run to ensure templates are in sync before publish.
- npm publish of the updated package.

### Out of scope

- New features or bug fixes — this is packaging only.
- `AGENT_ENFORCEMENT.md` / role file content beyond what README references.
- Any tasks numbered N56+.

## Tasks included in this release

Verify each is status `merged` on main before writing the changelog entry:

| ID  | Type   | Title |
|-----|--------|-------|
| N45 | fix    | Overview card stuck on permission-required after permission granted |
| N46 | feat   | Config page showing all options and project setup |
| N49 | rework | Project-wide docs audit and update (**currently `approved`, not merged — merge or defer**) |
| N50 | rework | prompt-build reads from `taskflow.config.json`, drops `taskflow.prompt.json` |
| N51 | rework | `init` calls `prompt-build` to keep enforcement block in sync with config |
| N52 | rework | Browser notification on agent done replaces status-transition notifs |
| N53 | feat   | Interactive prompts in `init` for hooks and activity engine |
| N54 | rework | Reduce token waste in agent role files — extract `AGENT_EVENTS.md` |

**Note on 0.7.1:** `package.json` already shows `0.7.1` but there is no `[0.7.1]` changelog entry and no npm publish record. Confirm with `npm view insight-flow version` whether 0.7.1 was published. If it was published (covering N45), exclude N45 from the 0.8.0 changelog and adjust accordingly. If it was NOT published, include N45 in 0.8.0 and treat 0.7.1 as a local-only bump.

## Implementation plan

1. **Resolve N49** — run `insight-flow show --id N49 --summary`. If status is `approved`, merge its branch to main via `/task-git merge N49` before proceeding. If deferring, note it in the changelog `[Unreleased]` section.

2. **Check npm publish state** — run `npm view insight-flow version` (or `npm view insight-flow versions --json`). Determine whether 0.7.1 was published. This governs whether N45 goes into 0.8.0 or was already shipped.

3. **Write CHANGELOG entry** — edit `packages/taskflow/CHANGELOG.md`. Insert the new section between `## [Unreleased]` and `## [0.7.0]`. Follow the existing format exactly:
   - Section heading: `## [0.8.0] — 2026-05-27`
   - Sub-sections: `### Fixed`, `### Added`, `### Changed`, `### Docs` (omit any that are empty).
   - One bullet per task: `- **Nxx** — one-sentence plain-English description of user-visible effect.`
   - Do NOT include pure-internal rework details (e.g. `stripPhaseMarkers` implementation) — summarise user-visible impact only.

4. **Audit README** — scan `packages/taskflow/README.md` for:
   - References to `taskflow.prompt.json` (removed by N50 — replace with `taskflow.config.json` / `prompt-build` workflow).
   - Any mention of the old `init` flow that didn't have interactive prompts (N53 added Y/n questions for lifecycle hooks and activity engine).
   - Any mention of `AGENT_EVENTS.md` not yet present (N54 added it — confirm README reflects the new file is scaffolded).
   - Patch only what is factually wrong; do not expand or rewrite.

5. **Bump version** — in `packages/taskflow/package.json`, change `"version": "0.7.1"` → `"version": "0.8.0"`.

6. **Build and sync** — run:
   ```bash
   pnpm --dir packages/taskflow run sync-roles
   pnpm build
   ```
   Both must pass with no errors.

7. **Publish** — run `pnpm pack:taskflow` to inspect the tarball, then `npm publish --access public` from `packages/taskflow/`. Confirm the published version with `npm view insight-flow version`.

## Verification

- `npm view insight-flow version` returns `0.8.0`.
- `packages/taskflow/CHANGELOG.md` contains `## [0.8.0]` with entries for all included tasks.
- `pnpm build` passes clean after the version bump.
- N49 is either merged to main or documented as deferred in `[Unreleased]`.

## Notes

- Changelog format follows Keep a Changelog (keepachangelog.com). Descriptions are user-visible impact, not implementation details.
- Related: N44 (last release task, v0.7.0) — use its TASK.md as a reference for format.
- N49 (docs audit) should ideally ship with 0.8.0 since it audits docs for N46–N48 which are all in this release window.
- The `[Unreleased]` section stays empty in the final commit (ready for the next cycle).
