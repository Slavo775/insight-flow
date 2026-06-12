# N63 — release v0.10.0 — security guardrails, master fixes, sound fix, README — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.10.0`
- [ ] `packages/taskflow/CHANGELOG.md` has a `[0.10.0]` entry covering N59 (Security), N60, N61, N62 (Fixed)
- [ ] `packages/taskflow/README.md` `## What's new` section is updated to `0.10.0`
- [ ] Root `CHANGELOG.md` has matching `[0.10.0]` entry
- [ ] `pnpm build` exits 0 with no errors
- [ ] `npm publish --access public` succeeds from `packages/taskflow/`
- [ ] `npm view insight-flow version` returns `0.10.0`

## Quality gates

- [ ] `pnpm build` passes (tsc compile + dist output)
- [ ] `packages/taskflow/dist/cli.js` exists after build
- [ ] No code changes in this PR — only version, docs, changelog

## Verification

- [ ] `node -e "console.log(require('./packages/taskflow/package.json').version)"` → `0.10.0`
- [ ] `grep '0.10.0' packages/taskflow/CHANGELOG.md` matches
- [ ] `grep '0.10.0' CHANGELOG.md` matches
- [ ] `grep "What's new in 0.10.0" packages/taskflow/README.md` matches
- [ ] `npm view insight-flow version` → `0.10.0` (post-publish)
