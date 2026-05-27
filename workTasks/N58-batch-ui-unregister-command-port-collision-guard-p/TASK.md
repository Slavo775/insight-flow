# N58 — batch-ui: unregister command, port-collision guard, port-in-use warning

**Type:** fix
**Priority:** high
**Created:** 2026-05-27

## Problem

Three gaps reported after the N56 batch-ui release:

1. **No way to remove a project from the registry.** Users who accidentally registered the wrong folder (e.g. the playground instead of the project root) have no way to undo it short of manually editing `~/.insight-flow/batch-ui.json`.
2. **Port collision within a single `batch-ui` run.** The `findFreePort` helper probes a TCP port, closes the probe socket, then spawns the server. Between the probe closing and the child process binding, the OS can reassign that port, potentially giving the same port to a second project in the same loop iteration. Additionally, if the loop increments `port` but then the next `findFreePort` skips an occupied port and returns the same value that was just assigned, two projects can end up sharing a port — one fails silently, the other hangs.
3. **No warning when a port is already in use.** When old batch-ui servers are still running and a new `batch-ui` run skips those occupied ports, the user sees different URLs than expected with no explanation.

## Goal

1. Add `insight-flow batch-ui --remove "<label>"` to remove a project from the registry by label.
2. Add `insight-flow ui-batch-unregister` (mirror of `ui-batch-register`) — run inside a project folder to remove it from the registry using the path-match, no label required.
3. Fix `cmdBatchUi` to maintain an in-memory set of ports claimed in the current run so `findFreePort` never assigns the same port twice within one invocation.
4. Print a `(port <N> was occupied, skipped)` notice whenever `findFreePort` has to advance past an occupied port, so users know old servers are still running.
5. Document both removal commands in `packages/taskflow/README.md`.

## Scope

### In scope

- `packages/taskflow/src/commands/batch-ui.ts` — `cmdBatchUiRemove`, `cmdUiBatchUnregister`, `cmdBatchUi` port-collision fix, port-skip warning.
- `packages/taskflow/src/cli.ts` — routing + help text for `batch-ui --remove` and `ui-batch-unregister`.
- `packages/taskflow/README.md` — add `--remove` and `ui-batch-unregister` to the "Multi-project launcher" section.

### Out of scope

- GUI for registry management.
- Changes to `ui-batch-down` or any other command.
- `insight-flow-master` package.

## Implementation plan

1. **`cmdBatchUiRemove(opts)` in `packages/taskflow/src/commands/batch-ui.ts`**
   - Read: `const label = (opts.remove as string).trim()`.
   - If `label` is empty: print `"Usage: insight-flow batch-ui --remove \"<label>\""` and exit 1.
   - Load registry; find entry with matching label.
   - If not found: print `"No project registered with label \"<label>\". Run \`insight-flow batch-ui --list\` to see registered projects."` and exit 1.
   - Remove entry, write registry, also remove from `lastSelected` if present.
   - Print: `Unregistered "<label>" → <path>`.

2. **`cmdUiBatchUnregister()` in `packages/taskflow/src/commands/batch-ui.ts`**
   - Find entry where `e.path === process.cwd()`.
   - If not found: print `"<cwd> is not registered. Run \`insight-flow batch-ui --list\` to see registered projects."` and exit 1.
   - Remove entry, write registry, also remove from `lastSelected`.
   - Print: `Unregistered "<label>" → <cwd>`.
   - No `taskflow.config.json` check needed — matching by path is sufficient.

3. **Port-collision fix in `cmdBatchUi`** (`packages/taskflow/src/commands/batch-ui.ts`)
   - Introduce `const claimedPorts = new Set<number>()` before the spawn loop.
   - Change `findFreePort` signature to `findFreePort(from: number, claimed: Set<number>): Promise<number>`.
   - Inside `findFreePort`: after TCP probe succeeds, check `if (claimed.has(port)) return findFreePort(port + 1, claimed)` before resolving.
   - After assigning a port: `claimedPorts.add(port)`.
   - Pass `claimedPorts` to all `findFreePort` calls in the loop.

4. **Port-skip warning in `findFreePort`**
   - When the TCP probe fails (port occupied) and we recurse, print to stderr:
     ```
     (port <N> was occupied, skipped)
     ```
   - Only print once per skipped port to avoid noise if many ports are occupied.

5. **CLI wiring** (`packages/taskflow/src/cli.ts`)
   - Import `cmdBatchUiRemove` and `cmdUiBatchUnregister` from `./commands/batch-ui.js`.
   - Route `command === "ui-batch-unregister"` to `cmdUiBatchUnregister()` (alongside existing `ui-batch-register` handler).
   - In the `batch-ui` branch add `else if (opts.remove) { cmdBatchUiRemove(opts); }`.
   - Help text additions:
     ```
     ui-batch-unregister                   Unregister this folder from batch-ui (mirror of ui-batch-register)
     batch-ui --remove "<label>"           Remove a registered project by label
     ```

6. **README** (`packages/taskflow/README.md`)
   - In the "Register your projects" section, add after the existing `ui-batch-register` example:
     ```markdown
     To unregister a project from a folder:
     ```bash
     cd /path/to/my-app
     insight-flow ui-batch-unregister
     # → Unregistered "my-app" → /path/to/my-app
     ```
     Or by label from any directory:
     ```bash
     insight-flow batch-ui --remove "my-app"
     ```
     ```

## Verification

```bash
# Remove by label
insight-flow batch-ui --add "test-proj" /tmp && \
insight-flow batch-ui --remove "test-proj" && \
insight-flow batch-ui --list
# → should NOT show "test-proj"

# Remove unknown label → error
insight-flow batch-ui --remove "does-not-exist"
# → "No project registered with label..." exit 1

# Unregister from folder
cd /path/to/registered-project && insight-flow ui-batch-unregister
# → "Unregistered ..." and entry gone from --list

# Unregister from unregistered folder → error
cd /tmp && insight-flow ui-batch-unregister
# → "<cwd> is not registered..." exit 1

# Port collision: register 3+ projects, start servers on 6007-6009, then run batch-ui again
# → should see "(port 6007 was occupied, skipped)" etc.
# → all assigned ports are unique

# Build passes
pnpm --dir packages/taskflow run build
```

## Notes

- The user's "taskflow-playground vs insight-flow" issue is a registry data problem (playground folder was registered instead of project root). With `--remove` they can clean it up: `insight-flow batch-ui --remove "taskflow-playground"`.
- The port-collision `claimedPorts` set fix ensures correctness within a single run even under rapid sequential `findFreePort` calls.
- `lastSelected` cleanup on remove prevents a ghost label from being pre-checked next time.
- Related: N56 (original batch-ui implementation).
