# N90 — Migrate 9 shipped roles to composer-generated (JSON canonical)

**Type:** feat
**Priority:** medium
**Created:** 2026-06-11

## Problem

- The composer model is proven (N88 spike, N89 v2) but only 2 of 9 roles are expressed as modules, and nothing consumes the composed output — the 9 hand-written `*_ROLE.md` files remain canonical, so shared changes still require editing up to 9 files and the JSON copies silently drift (N89 review non-blocking #1).
- Round 3 flips the source of truth: JSON modules become canonical, the committed role MD becomes composer-generated.

## Goal

1. All 9 shipped roles (`TASKMASTER_ROLE.md`, `TASKMASTER_CHANGE_ROLE.md`, `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_HUMAN_REVIEW_ROLE.md`, `TASK_INCIDENT_ROLE.md`, `TASK_REQUEST_CHANGES_ROLE.md`, `TASK_ANALYZER_ROLE.md`) expressed as composed-agent JSON + registry modules.
2. **Byte-exact reproduction** (human decision): composer output is byte-identical to the current hand-written files — exact wording preserved via role-scoped modules wherever shared wording differs (fixer/implementer NEVER nuances); `recorder-discipline` wired only where the hand-written text already says it.
3. Generated MD **committed** via an explicit compose-apply command (human decision: compose once, live in the project — never regenerated at build time). A drift test asserts committed MD == composer output, byte-exact.
4. Distribution intact: generated roles flow through `scripts/sync-role-templates.mjs` → `templates/roles/` → `insight-flow init`; `@includes` resolve in consumer projects; `agents.extend` marked-block injection (`prompt-build`, `applyAgentExtensions`) keeps working on generated files.
5. Switchover diff (hand-written → generated) is empty, proving zero behavioral change.

## Scope

### In scope

- `packages/taskflow/src/agents/modules/roles/*.json` — 7 new role module files (+ adjust the 2 existing for byte-exactness).
- `packages/taskflow/src/agents/modules/*.json` — new shared include-modules: `security` (`@AGENT_SECURITY.md` if referenced by roles), `notify` (`@AGENT_NOTIFY.md`), `config` (`@AGENT_CONFIG.md`), `pr-api` if needed — only those actually referenced by the 9 roles.
- `packages/taskflow/src/agents/composed/*.json` — 7 new composed-agent defs (+ 2 existing updated).
- `packages/taskflow/src/agents/compose.ts` — registry imports; renderer tweak: a body-only `section` module directly following a `section` block joins with a single newline (no blank line) so shared bullets continue the previous list, enabling byte-exactness with reuse. Update header comment: JSON is now canonical.
- `packages/taskflow/src/cli/commands/prompt-build.ts` — `--compose --apply` (or equivalent) writes generated MD to the repo-root role files; must preserve/emit the `agents.extend` marked blocks (`taskflow:*` markers) that `applyAgentExtensions` targets.
- The 9 root `*_ROLE.md` files — replaced by composer output (byte-identical; this is the only sanctioned way this task touches them).
- `packages/taskflow/scripts/sync-role-templates.mjs` — verify/extend so generated roles still sync to `templates/roles/`.
- `packages/taskflow/test/compose.test.mjs` — byte-exact drift test: for each of the 9 roles, `composeAgentById(id) === readFileSync(<role file>)`; keep structural tests.
- `packages/taskflow/src/core/schema/index.ts` — only if a renderer/markers need a schema affordance (e.g. marked-block module kind); minimize.

### Out of scope

- Wording improvements or prompt refactors of any role (byte-exact means none by definition) — separate task after migration.
- MCP / hook / skill emission (Round 4); dashboard agent-creator UI (Round 5); custom states.
- Build-time generation — compose runs only via the explicit CLI command.
- `AGENT_*.md` partial contents (the include targets stay hand-written files).

## Implementation plan

1. **Renderer fidelity first** (`compose.ts`) — implement the body-only-continuation rule; regenerate the 2 existing roles and byte-diff against `TASK_IMPLEMENTER_ROLE.md` / `TASK_REVIEW_FIXER_ROLE.md`; fix remaining deltas by adjusting role-scoped modules (restore implementer change-mode NEVER bullet, fixer review-specific NEVER wording, fixer scope-guard second bullet) — shared modules stay referenced where wording truly matches.
2. **Marked-block survival** — inspect `applyAgentExtensions` / `prompt-build` marker expectations (`taskflow:*` comment markers) in the current role files; ensure the composer emits them (likely as part of role-scoped module bodies or a renderer affordance). Verify `prompt-build` non-compose path operates unchanged on a generated file.
3. **Modularize the 7 remaining roles** — for each: decompose the hand-written MD into role-scoped `<role>/<slug>` section modules + shared include-modules (`enforcement`, `protocol`, `events`, plus `notify`/`config` where referenced, e.g. task-git-style roles); reuse `minimal-diff` / `scope-guard` / `recorder-discipline` ONLY where bullets match byte-for-byte; composed-agent def per role. Byte-diff each against its hand-written original until empty.
4. **Compose-apply command** (`prompt-build.ts`) — `--compose --apply` writes all 9 generated files to the repo root (and nothing else); refuses on unknown agent; prints a per-file changed/unchanged summary.
5. **Drift test** — extend `compose.test.mjs`: byte-equality for all 9 roles vs committed files; fails CI when someone edits MD by hand or edits JSON without re-applying.
6. **Distribution wiring** — run `sync-role-templates.mjs`; confirm `templates/roles/` matches; spot-check `insight-flow init` in the playground so scaffolded roles + `@includes` resolve.
7. **Switchover commit hygiene** — commit order: composer/module changes first, then the (empty-diff) regenerated role files, so the review artifact shows the 9 role files unchanged byte-for-byte.

## Verification

- `pnpm build` + `pnpm --filter insight-flow test` green, including the new 9-role byte-exact drift suite.
- `git diff` over the 9 `*_ROLE.md` files after compose-apply is **empty** (the headline acceptance criterion).
- `node packages/taskflow/dist/cli.js prompt-build` (non-compose, `agents.extend` path) still patches a generated role correctly in the playground.
- `sync-role-templates.mjs` produces unchanged `templates/roles/` output.

## Notes

- Round 3 of the agent-composer line: N88 (spike) → N89 (v2 model, PR #64) → **N90** → Round 4 (heterogeneous modules) → Round 5 (UI).
- Closes N89 review non-blocking #1 (drift check), #3/#4 (NEVER wording — preserved exactly via role-scoped modules), partially #2 (`recorder-discipline` wired only where text already matches byte-for-byte; broader adoption = future wording task).
- Registry will grow to roughly 45–55 role-scoped modules — flat JSON arrays per role in `modules/roles/` (N89 layout).
- Gotcha: `TASK_ANALYZER_ROLE.md` (the strategist) and `TASKMASTER_*` roles have less regular section structure than the implementer/fixer — expect more heading-less section modules; the schema already allows them.
- See `ANALYSIS.md` for options and open questions.
