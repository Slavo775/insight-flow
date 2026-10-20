# N286 — Tests, docs and hygiene — untested CLI commands, MCP tool tests, test-port isolation, doc drift — Checklist

## Done criteria

- [ ] Round-trip tests execute the incident, change-request, `mr-update` and `migrate-hooks` command families; `update` is covered without installing (A70)
- [ ] Every composer MCP tool has a test over `StdioClientTransport` (A70)
- [ ] Spawned test servers use OS-assigned ports; teardown awaits child exit; no 500 ms CLI timeouts remain (A70)
- [ ] Higher test concurrency adopted after 5 green runs, or the remaining shared state is documented (A70)
- [ ] `test:node` fails fast on a stale `dist/` (A70)
- [ ] `CLAUDE.md` paths, tooling, test description and architecture list match the tree; `package.json` description fixed (A71)
- [ ] The `engines` policy was confirmed with the human and applied (or a Node 18 CI job added) (A71)
- [ ] The chain-advance lifecycle-field behaviour was decided by the human and documented or implemented, with a test (A73)
- [ ] Bugs found by the new tests are filed as new tasks, not fixed here

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (full suite green 5 runs in a row)

## Verification

- [ ] New round-trip and MCP tests present and green
- [ ] Stale-dist guard demonstrated (touch a `src/` file → fast failure with hint)
- [ ] Every `CLAUDE.md` file path resolves in the tree
