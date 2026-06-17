# N136 — Yalc local-publish scripts for test-project install — Checklist

## Done criteria

- [ ] `yalc` is in root `package.json` `devDependencies` and installed via pnpm.
- [ ] Root `package.json` has `yalc:publish` (build + `yalc publish`) and `yalc:push` (build + `yalc push`) scripts.
- [ ] `.gitignore` ignores `.yalc/` and `yalc.lock`.
- [ ] `packages/taskflow/README.md` has a "Local testing with yalc" section (publish → add → iterate → cleanup).
- [ ] Root `CLAUDE.md` Commands block points at the README section.

## Quality gates

- [ ] `npx tsc --noEmit` passes (no source touched, but confirm build is green)
- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] No regressions to `pack:taskflow` or the publish pipeline
- [ ] No `.yalc/` or `yalc.lock` left tracked in git

## Verification

- [ ] `pnpm yalc:publish` succeeds; `ls ~/.yalc/packages/insight-flow` contains `dist/cli.js`.
- [ ] In `/tmp/if-yalc-test`: `npx yalc add insight-flow && pnpm install`, then `npx insight-flow --version` prints the version.
- [ ] `.yalc/insight-flow/` contains only allowlisted files (`dist`, `schema`, `templates`, `README.md`, `LICENSE`) — no `src/`.
- [ ] `pnpm yalc:push` updates the linked test project in place after a `dist` change.
