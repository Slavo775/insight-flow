# N58 — batch-ui: unregister command, port-collision guard, port-in-use warning — Checklist

## Done criteria

- [ ] `insight-flow batch-ui --remove "<label>"` removes the entry from `~/.insight-flow/batch-ui.json` and from `lastSelected`
- [ ] `--remove` with an unknown label prints error and exits 1
- [ ] `--remove` with empty/missing label prints usage and exits 1
- [ ] `insight-flow ui-batch-unregister` removes the entry matching `cwd` from registry and `lastSelected`
- [ ] `ui-batch-unregister` in an unregistered folder prints error and exits 1
- [ ] `cmdBatchUi` maintains a `claimedPorts` set so no two projects in one run get the same port
- [ ] `findFreePort` prints `(port N was occupied, skipped)` to stderr when it advances past an occupied port
- [ ] Both removal commands documented in `packages/taskflow/README.md` under "Multi-project launcher"
- [ ] `batch-ui --remove` and `ui-batch-unregister` appear in `insight-flow help` output
- [ ] `pnpm --dir packages/taskflow run build` succeeds with zero TypeScript errors

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` — zero errors
- [ ] `pnpm --dir packages/taskflow run build` — clean build
- [ ] `pnpm --dir packages/taskflow test` — all tests pass
- [ ] No regressions in `batch-ui --add`, `--list`, `ui-batch-register`, `ui-batch-down`

## Verification

- [ ] `insight-flow batch-ui --add "tmp" /tmp && insight-flow batch-ui --remove "tmp" && insight-flow batch-ui --list` → "tmp" not in list
- [ ] `insight-flow batch-ui --remove "nonexistent"` → exits 1 with "No project registered with label..."
- [ ] `cd /tmp && insight-flow ui-batch-unregister` → exits 1 with "is not registered"
- [ ] `cd <registered-path> && insight-flow ui-batch-unregister` → entry removed, exit 0
- [ ] After removing a label that was in `lastSelected`, run `batch-ui` → removed label is not pre-checked
