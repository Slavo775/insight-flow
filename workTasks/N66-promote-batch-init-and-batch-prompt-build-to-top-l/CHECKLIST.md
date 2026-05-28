# N66 — promote bulk-init and bulk-prompt-build to top-level commands — Checklist

## Done criteria

- [ ] `insight-flow bulk-init` is a top-level command in `cli.ts`
- [ ] `insight-flow bulk-prompt-build` is a top-level command in `cli.ts`
- [ ] `opts.init` and `opts["prompt-build"]` branches removed from the `batch-ui` block in `cli.ts`
- [ ] Help text shows `bulk-init` and `bulk-prompt-build` as standalone commands
- [ ] `## Upgrading insight-flow` section in `packages/taskflow/README.md` with 3-step workflow using `bulk-init` / `bulk-prompt-build`
- [ ] `### Batch operations` subsection removed from the `## Multi-project launcher` section
- [ ] `packages/taskflow/package.json` version is `0.11.1`
- [ ] `packages/taskflow/CHANGELOG.md` has `## [0.11.1]` entry documenting the rename

## Quality gates

- [ ] `pnpm build` passes with no TypeScript errors

## Verification

- [ ] `insight-flow bulk-init < /dev/null` completes with `X/Y succeeded`
- [ ] `insight-flow bulk-prompt-build < /dev/null` completes with `X/Y succeeded`
- [ ] `insight-flow help` shows `bulk-init` and `bulk-prompt-build` as top-level entries
- [ ] `insight-flow batch-ui --init < /dev/null` no longer triggers init (falls through to UI launcher)
