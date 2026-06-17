# N136 — Yalc local-publish scripts for test-project install

**Type:** feat
**Priority:** medium
**Created:** 2026-06-17

## Problem

- Testing the published `insight-flow` package today means either `pnpm pack:taskflow` + manual `npm install ./insight-flow-1.0.0.tgz` in a scratch project, or a hand-rolled `npm link` that ignores the `files` allowlist and the `dist/` build step. There is no one-command "publish to a local store, then install in a test project" loop, so verifying the real install shape (bin wiring, `files`-allowlisted contents, prod deps) before a real npm publish is tedious and error-prone.

## Goal

1. One root command publishes the freshly-built package to the local yalc store: `pnpm yalc:publish`.
2. One root command rebuilds + pushes to every linked test project in place: `pnpm yalc:push`.
3. `yalc` is a tracked dev dependency so the scripts work without a global install.
4. A documented, copy-pasteable workflow for adding/updating/removing the package in a test project.

## Scope

### In scope

- `packages/taskflow/package.json` (the publishable package) — verify `files` / `bin` already produce the right install shape (no change expected; confirm only).
- Root `package.json` — add `yalc:publish` and `yalc:push` scripts (sibling to existing `pack:taskflow`) and `yalc` under `devDependencies`.
- Docs — add a "Local testing with yalc" section to `packages/taskflow/README.md` and a one-line pointer in root `CLAUDE.md` Commands block.
- `.gitignore` — ignore the `.yalc/` dir and `yalc.lock` that yalc drops into any project where the package is *added* (relevant if `playground/` is ever used as the test consumer).

### Out of scope

- The real npm publish pipeline (`prepublishOnly`, `publishConfig`) — unchanged.
- CI integration / automated yalc steps in any workflow.
- Changing the package's `files` allowlist, `bin`, or build (`tsup` + `vite`) wiring.

## Implementation plan

1. **Add yalc as a dev dependency.**
   - `pnpm add -Dw yalc` at the repo root (workspace root). Pin the resolved version in root `package.json` `devDependencies`.
2. **Add root scripts.** In root `package.json` `scripts`, alongside `pack:taskflow`:
   - `"yalc:publish": "pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow exec yalc publish"`
   - `"yalc:push": "pnpm --dir packages/taskflow run build && pnpm --dir packages/taskflow exec yalc push"`
   - Rationale: yalc must run inside `packages/taskflow` so it reads that package's `package.json` + `files` allowlist; we build explicitly first rather than relying on yalc's script-running behavior. `yalc push` = publish **and** update every project that already added it.
3. **Confirm install shape.** `yalc publish` copies exactly what `npm pack` would (the `files` array: `dist`, `schema`, `templates`, `README.md`, `LICENSE`) plus the `bin` mapping. No package.json change expected — confirm during verification.
4. **Ignore yalc artifacts.** Add `.yalc/` and `yalc.lock` to `.gitignore` so a test consumer inside the repo (e.g. `playground/`) doesn't leak yalc state into commits.
5. **Document the loop** in `packages/taskflow/README.md` (new "Local testing with yalc" section):
   - Publish: `pnpm yalc:publish`
   - In the test project: `npx yalc add insight-flow && pnpm install`, then run `npx insight-flow --version` / `npx insight-flow ui`.
   - Iterate: after code changes, `pnpm yalc:push` (auto-updates linked projects); if needed, `npx yalc update` in the consumer.
   - Cleanup: `npx yalc remove insight-flow && pnpm install` in the consumer; `npx yalc installations clean insight-flow` to forget links.
6. **Cross-link** from root `CLAUDE.md` Commands block: one line pointing at the README section.

## Verification

- `pnpm yalc:publish` succeeds and the package lands in the store: `ls ~/.yalc/packages/insight-flow` shows a versioned copy containing `dist/cli.js`.
- In a throwaway dir (`/tmp/if-yalc-test`): `npx yalc add insight-flow && pnpm install`, then `npx insight-flow --version` prints the version and `npx insight-flow ui` boots the dashboard.
- Confirm only allowlisted files were copied (no `src/`, no `node_modules/`) under `.yalc/insight-flow/`.
- `pnpm yalc:push` after a trivial `dist` change updates the test project in place without a re-add.
- `git status` shows no `.yalc/` or `yalc.lock` tracked.

## Notes

- yalc store lives at `~/.yalc`; per-project copies live in `<project>/.yalc/` with a `file:.yalc/insight-flow` dep injected into the consumer's `package.json` — remember to remove it before committing the consumer.
- The package `bin` is `insight-flow` → `./dist/cli.js`; after `yalc add` + install, it's available via the consumer's `node_modules/.bin` (`npx insight-flow` / `pnpm exec insight-flow`). For a global-CLI feel, `npx yalc link insight-flow` is an alternative but `add` is preferred because it mirrors a real npm install.
- Related: `pack:taskflow` (existing tarball path) and the `files`/`prepublishOnly` config in `packages/taskflow/package.json`.
