# N66 — promote batch-init and batch-prompt-build to top-level commands — Checklist

## Done criteria

- [ ] `insight-flow batch-init` is a top-level command in `cli.ts`
- [ ] `insight-flow batch-prompt-build` is a top-level command in `cli.ts`
- [ ] `opts.init` and `opts["prompt-build"]` branches removed from the `batch-ui` block in `cli.ts`
- [ ] Help text shows `batch-init` and `batch-prompt-build` as standalone commands
- [ ] `## Upgrading insight-flow` section in `packages/taskflow/README.md` with 3-step workflow
- [ ] `### Batch operations` subsection removed from the `## Multi-project launcher` section

## Quality gates

- [ ] `pnpm build` passes with no TypeScript errors

## Verification

- [ ] `insight-flow batch-init < /dev/null` completes with `X/Y succeeded`
- [ ] `insight-flow batch-prompt-build < /dev/null` completes with `X/Y succeeded`
- [ ] `insight-flow help` shows `batch-init` and `batch-prompt-build` as top-level entries
- [ ] `insight-flow batch-ui --init < /dev/null` no longer triggers init (falls through to UI launcher)
