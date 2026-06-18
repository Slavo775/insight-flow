# N152 — surface silent fail-open in writeStatus flow resolution (N131) — Checklist

## Done criteria

- [ ] `status-write.ts` catch emits a one-line stderr warning including the error message
- [ ] Fail-open behavior unchanged (still falls back to canonical validation; never blocks)
- [ ] No changes outside `status-write.ts`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes

## Verification

- [ ] Manual: malformed `insightFlow/projects/*.json` → status command still succeeds AND prints the warning to stderr
