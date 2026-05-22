# N04 — Publish package to npm as `insight-flow` under sslavo account — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` has `name: "insight-flow"`
- [ ] `packages/taskflow/package.json` has `bin: { "insight-flow": "./dist/cli.js" }`
- [ ] `packages/taskflow/package.json` version bumped to `0.3.0`
- [ ] `packages/taskflow/README.md` install/usage examples reference `insight-flow` (not `taskflow`)
- [ ] CLI banner / help output (if any) uses `insight-flow` as the program name
- [ ] Root `README.md` documents `npm i insight-flow` / `npx insight-flow` install path
- [ ] `npm pack` produces a valid tarball that installs cleanly in a scratch dir
- [ ] `npx insight-flow init` from the packed tarball scaffolds expected files
- [ ] `npm publish` succeeded under the `sslavo` account
- [ ] `npm view insight-flow` shows the new package live with correct metadata

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run build` produces `dist/cli.js` and `dist/index.js`
- [ ] `pnpm lint` passes at repo root
- [ ] No regressions: `pnpm dev` still boots the dashboard SPA

## Verification

- [ ] `npm whoami` returns `sslavo` before publishing
- [ ] `npx insight-flow@0.3.0 init` in a fresh `/tmp` dir produces the same files as the local dev build
- [ ] `grep -ri "npx taskflow\|npm i taskflow\|npm install taskflow" packages/taskflow/ README.md` returns zero hits
- [ ] PR description explicitly notes that `npm publish` is a manual post-merge step (not run by CI)
