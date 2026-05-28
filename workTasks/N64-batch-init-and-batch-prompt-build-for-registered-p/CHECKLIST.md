# N64 — batch-init and batch-prompt-build for registered projects — Checklist

## Done criteria

- [ ] `cmdBatchInit` exported from `packages/taskflow/src/commands/batch-ui.ts`
- [ ] `cmdBatchPromptBuild` exported from `packages/taskflow/src/commands/batch-ui.ts`
- [ ] `insight-flow batch-ui --init` wired in `cli.ts`, appears in help text
- [ ] `insight-flow batch-ui --prompt-build` wired in `cli.ts`, appears in help text
- [ ] Both commands run against all projects in non-TTY mode (`< /dev/null`)
- [ ] Both commands show per-project `✓ / ✗` result lines and a `X/Y succeeded` summary

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] No regressions in existing `batch-ui --list`, `--add`, `--remove`, and default launch

## Verification

- [ ] `insight-flow batch-ui --init < /dev/null` completes, prints per-project result, exits 0
- [ ] `insight-flow batch-ui --prompt-build < /dev/null` completes, prints per-project result, exits 0
- [ ] `insight-flow batch-ui --init --force < /dev/null` passes `--force` through to each project's init call
