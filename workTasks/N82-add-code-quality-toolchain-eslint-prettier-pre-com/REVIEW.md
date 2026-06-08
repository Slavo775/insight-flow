# N82 — Add code-quality toolchain — ESLint + Prettier + pre-commit hooks + quality gates — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-08
**PR:** https://github.com/Slavo775/insight-flow/pull/57
**Verdict:** approved

## Summary

Adds the code-quality toolchain: ESLint 9 (flat config, typescript-eslint recommended) + Prettier with `eslint-config-prettier`, `lint`/`format` scripts, a husky + lint-staged pre-commit hook (prettier --write + eslint --fix on staged `src`, then `tsc --noEmit`), and `lint`/`format:check` wired into the `agents.extend` gates. Includes a one-time Prettier baseline (33 files) and small dead-code removals the new linter surfaced. Risk: **low** — no runtime logic changed; the only `src` edits are formatting + removing provably-unused code, all proven green→green (87 tests, typecheck, lint, format:check) and the hook verified to both pass and block.

## Checklist verification

- [x] ESLint + Prettier configured, matching style; `lint` + `format:check` pass — pass (both exit 0 on HEAD; style preserved via `.prettierrc` printWidth 100 / double quotes / 2-space).
- [x] Pre-commit hook runs + blocks failures — pass (verified: a malformed staged file is rejected with a readable `no-unused-vars` message; clean commits pass — every commit this task went through the hook).
- [x] `lint`/`format` scripts + `lint` wired into `taskflow.config.json` `agents.extend` — pass (task-implement + task-review-fix).
- [x] Added dependencies minimal/justified — pass (7 dev-deps for the ESLint+Prettier+husky+lint-staged choice the human selected over the leaner Biome).
- Quality gates: typecheck ✓ · lint ✓ · format:check ✓ · 87 tests ✓.

## Blockers

None.

## Non-blocking

1. **Pre-existing `pnpm typecheck` gate is broken (not introduced here).** The original `agents.extend` entries say "Run `pnpm typecheck`", but the **root** has no `typecheck` script — only `pnpm --dir packages/taskflow run typecheck` exists. My added lint/format lines use the correct `--dir` form; consider fixing the older typecheck line in a follow-up.
2. **`prepublishOnly` doesn't run `lint`.** It runs sync-roles + build + typecheck. Adding `lint` (+ `format:check`) would gate publishes on a clean lint. Small, recommended.
3. **ESLint lints `src` only; `test/*.mjs` are Prettier-formatted but not ESLint-linted.** Reasonable (they're `.mjs`, would need a JS-flavored config block); could be added later.
4. **Toolchain + 33-file Prettier baseline are in one commit.** Coherent, but a separate `style:` baseline commit would have made the logic-vs-formatting split easier to review. Cosmetic.

## Security & edge cases

- The hook's bare `lint-staged` relies on husky v9 adding `node_modules/.bin` to the hook PATH (standard; confirmed working across this task's commits). `which lint-staged` failing in an interactive shell is expected, not a defect.
- Prettier does not reformat embedded template-literal contents by default, so the dashboard's large inline HTML/JS strings are untouched — confirmed by the passing e2e smoke (dashboard still serves correctly).
- Dead-code removals verified safe: `writeMasterLock` had no callers (the folded master writes its own lock via `master/lock.ts` since N81); the removed `query.ts` imports and the unused catch binding are confirmed unreferenced by typecheck + tests.

## Notes

- Good catch during implementation: ESLint **10.4.1** crashes (`util.styleText is not a function`) when printing violations on Node 22 — pinned to **ESLint 9**, which actually validates the gate (the hook now prints real lint errors). This is why the toolchain choice was exercised end-to-end, not just configured.
- N83/N84 spec branches will need `main` merged in before their CLI works (the tracker entries live on `main` only) — same step taken here for N82.
