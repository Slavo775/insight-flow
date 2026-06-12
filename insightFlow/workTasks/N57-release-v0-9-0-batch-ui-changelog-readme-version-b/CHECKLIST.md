# N57 — release v0.9.0 — batch-ui changelog, README, version bump — Checklist

## Done criteria

- [ ] `packages/taskflow/CHANGELOG.md` has `## [0.9.0] — 2026-05-27` section with N56 batch-ui entries
- [ ] `packages/taskflow/CHANGELOG.md` `[Unreleased]` section is empty
- [ ] `packages/taskflow/README.md` heading reads `## What's new in 0.9.0`
- [ ] README 0.9.0 bullets cover `batch-ui`, `ui-batch-register`, `ui-batch-down`
- [ ] `packages/taskflow/package.json` `"version"` is `"0.9.0"`
- [ ] `pnpm --dir packages/taskflow run build` succeeds (zero TypeScript errors)
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] Package published: `npm view insight-flow version` returns `0.9.0`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` — zero errors
- [ ] `pnpm --dir packages/taskflow run build` — no errors, `dist/cli.js` updated
- [ ] `pnpm --dir packages/taskflow test` — all tests pass

## Verification

- [ ] `node -e "console.log(require('./packages/taskflow/package.json').version)"` → `0.9.0`
- [ ] `grep "## \[0.9.0\]" packages/taskflow/CHANGELOG.md` → match found
- [ ] `grep "What's new in 0.9" packages/taskflow/README.md` → match found
- [ ] `npm view insight-flow version` → `0.9.0`
