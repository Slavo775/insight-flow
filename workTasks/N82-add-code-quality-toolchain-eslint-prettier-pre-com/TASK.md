# N82 — Add code-quality toolchain — ESLint + Prettier + pre-commit hooks + quality gates

**Type:** feat
**Priority:** high
**Created:** 2026-06-08

## Problem

The repo ships **no ESLint/Prettier and no pre-commit hooks** (CLAUDE.md: "No ESLint / Prettier configured at the workspace root"). Code quality is enforced only by `tsc --noEmit` + `node:test`; style drift and lint-class bugs go uncaught, and nothing gates a bad commit. After the N81 restructure, this is the natural hardening step (original roadmap "Phase 2").

## Goal

1. ESLint + Prettier configured for the TypeScript codebase, matching the existing style (2-space indent, double quotes, tsconfig strict) with **zero churn** on current code.
2. A pre-commit hook runs typecheck + lint + format-check on staged files and blocks failures.
3. `lint` / `format` package scripts; `lint` wired into `taskflow.config.json` `agents.extend` quality gates.
4. Added dependency footprint kept minimal (native git hook, or husky+lint-staged only if justified).

## Scope

### In scope

- ESLint flat config (typescript-eslint) + Prettier config under `packages/taskflow` (and root if needed), tuned to current style.
- `lint`, `lint:fix`, `format`, `format:check` scripts in `packages/taskflow/package.json`.
- Pre-commit hook (native `.git/hooks` installer **or** husky+lint-staged) running typecheck + lint + format-check on staged TS.
- Wire `lint` (+ format-check) into `taskflow.config.json` `agents.extend.task-implement` / `task-review-fix` gates.
- One-time `format`/`lint --fix` pass **only** if it doesn't create a large churn diff; otherwise document the baseline.

### Out of scope

- Runtime behavior changes; the socket.io→native swap (N83); the storage migration (N84); the React dashboard.
- Full CI-provider config beyond local hooks (note as an optional follow-up).

## Implementation plan

1. **Pick toolchain** — typescript-eslint flat config + Prettier; decide native-hook vs husky+lint-staged (favor minimal deps).
2. **Add configs** (`eslint.config.js`, `.prettierrc`) tuned to current style; run lint to inventory existing violations.
3. **Resolve violations** by config tuning, not mass-rewrites — keep the diff minimal.
4. **Scripts + hook** — add package scripts, the pre-commit hook, and its installer.
5. **Wire gates** — add `lint` to `taskflow.config.json` `agents.extend`.
6. **Verify** — lint/format clean, hook blocks a malformed staged file, typecheck + tests still green.

## Verification

- `pnpm --dir packages/taskflow lint` exits 0; `format:check` exits 0.
- Staging a deliberately-malformed file → the pre-commit hook fails the commit; fixing it lets it commit.
- `pnpm --dir packages/taskflow test` + typecheck still green.

## Notes

- Decided via `/task-analyze` (see `ANALYSIS.md`). Follow-up to N81; original roadmap "Phase 2". North Star: **"lean now, scale deliberately"** — keep added deps minimal.
- Independent of N83 (transport) and N84 (storage). "Agents improvement" from the original Phase 2 framing is a separate, still-undefined item — not in this task.
