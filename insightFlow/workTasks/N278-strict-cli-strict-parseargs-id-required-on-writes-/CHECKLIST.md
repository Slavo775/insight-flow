# N278 — Strict CLI — strict parseArgs, --id required on writes, status transition table, friendly errors — Checklist

## Done criteria

- [ ] `node:util` `parseArgs` with `strict: true` and a per-command option table replaces the hand-rolled parser; the parse function is exported (A11)
- [ ] Unknown flags, a positional task id and missing values exit 2 with a clear message; `--id=N05` works (A11)
- [ ] `--help` / `-h` prints usage for every command and never executes it (A11)
- [ ] Every state-changing command requires `--id`; only read commands keep the current-task fallback; role prompts that omitted `--id` are fixed and re-composed (A11)
- [ ] One core transition table is enforced in `setStatus`; `status` goes through `writeStatus`; `--verdict` is validated (A12)
- [ ] `review-end` / `fix-end` validate before saving the side file (A12)
- [ ] User errors print `error: <message>` with no stack and exit non-zero (A74)
- [ ] `replaceAll` uses a function replacer; `$` in titles survives scaffolding (A76)
- [ ] One `INCIDENT_OPEN_STATUSES` rule is used by storage and `show` (A72)
- [ ] `PRIORITY_WEIGHT`, the picker sort, slug and `loadFlows` live once in core; dashboard and agents no longer import from `cli/commands`; `storage-port.ts` deleted or fully routed (A76)
- [ ] `bulk-*` spawn works on Windows; `bulk-down` verifies PIDs before killing (A81)
- [ ] `packages/taskflow/README.md` command reference updated

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`scaffold-and-bundle`, `status-setter`, `transitions`, `flow-chains`, `picker-flow`, `published-surface` green)

## Verification

- [ ] Tests: parser edge cases, `--help` without side effects, `--id` required, rejected transitions, `$` in titles, stack-free errors
- [ ] Manual: `insight-flow merge --help` leaves the current task unchanged
- [ ] Manual: `insight-flow show --id N999` prints one line and exits 1
