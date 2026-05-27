# N58 — batch-ui: unregister command, port-collision guard, port-in-use warning

**Type:** fix
**Priority:** high
**Created:** 2026-05-27
**Modified:** 2026-05-27

## Problem

Four gaps reported after the N56 batch-ui release:

1. **No way to remove a project from the registry.** Users who accidentally registered the wrong folder (e.g. the playground instead of the project root) have no way to undo it short of manually editing `~/.insight-flow/batch-ui.json`.
2. **Port collision within a single `batch-ui` run.** The `findFreePort` helper probes a TCP port, closes the probe socket, then spawns the server. Between the probe closing and the child process binding, the OS can reassign that port, potentially giving the same port to a second project in the same loop iteration. Additionally, if the loop increments `port` but then the next `findFreePort` skips an occupied port and returns the same value that was just assigned, two projects can end up sharing a port — one fails silently, the other hangs.
3. **No warning when a port is already in use.** When old batch-ui servers are still running and a new `batch-ui` run skips those occupied ports, the user sees different URLs than expected with no explanation.
4. **Re-running `batch-ui` respawns already-running servers.** If the user runs `batch-ui` a second time and selects a project whose server is already tracked in `runningPids`, a duplicate process is spawned. The already-running server should be detected and skipped with an informational message: `[my-app] server on port 6007 already running, skipped`.

## Goal

1. Add `insight-flow batch-ui --remove "<label>"` to remove a project from the registry by label.
2. Add `insight-flow ui-batch-unregister` (mirror of `ui-batch-register`) — run inside a project folder to remove it from the registry using the path-match, no label required.
3. Fix `cmdBatchUi` to maintain an in-memory set of ports claimed in the current run so `findFreePort` never assigns the same port twice within one invocation.
4. Print a `(port <N> was occupied, skipped)` notice whenever `findFreePort` has to advance past an occupied port, so users know old servers are still running.
5. Skip already-running servers when re-running `batch-ui`: if a chosen project has a live entry in `runningPids` (matching by label) with a process that is actually alive (ESRCH check), print `[<label>] server on port <N> already running, skipped` and do not spawn a new process.
6. Document both removal commands and the "already running" behaviour in `packages/taskflow/README.md`.

## Scope

### In scope

- `packages/taskflow/src/commands/batch-ui.ts` — `cmdBatchUiRemove`, `cmdUiBatchUnregister`, `cmdBatchUi` port-collision fix, port-skip warning, already-running detection.
- `packages/taskflow/src/cli.ts` — routing + help text for `batch-ui --remove` and `ui-batch-unregister`.
- `packages/taskflow/README.md` — add `--remove`, `ui-batch-unregister`, and "already running" behaviour to the "Multi-project launcher" section.

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

5. **Already-running detection in `cmdBatchUi`** (`packages/taskflow/src/commands/batch-ui.ts`)
   - Before the spawn loop, load `const existingPids = readBatchUiRunningPids()` and build a lookup map: `const runningByLabel = new Map(existingPids.map(p => [p.label, p]))`.
   - At the top of each loop iteration, check if the chosen entry's label is in `runningByLabel`.
   - If found, verify the process is actually alive: `try { process.kill(pid, 0) } catch (e) { if e.code === "ESRCH" → process is dead, fall through to spawn }`.
   - If alive: print `  [<label>] server on port <N> already running, skipped` and `continue` — do not spawn, do not add to new `running` array.
   - Preserve the existing `running` entry in the final `writeBatchUiRunningPids` call (merge new spawns with surviving already-running entries so `ui-batch-down` can still reach them).

6. **CLI wiring** (`packages/taskflow/src/cli.ts`)
   - Import `cmdBatchUiRemove` and `cmdUiBatchUnregister` from `./commands/batch-ui.js`.
   - Route `command === "ui-batch-unregister"` to `cmdUiBatchUnregister()` (alongside existing `ui-batch-register` handler).
   - In the `batch-ui` branch add `else if (opts.remove) { cmdBatchUiRemove(opts); }`.
   - Help text additions:
     ```
     ui-batch-unregister                   Unregister this folder from batch-ui (mirror of ui-batch-register)
     batch-ui --remove "<label>"           Remove a registered project by label
     ```

7. **README** (`packages/taskflow/README.md`)
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
   - In the "Launch" section, add a note after the spawn output block:
     ```markdown
     If you run `batch-ui` while some servers are already up, already-running projects are skipped automatically:
     ```
       [my-app]       server on port 6007 already running, skipped
       [another-app]  http://localhost:6008
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

# Already-running detection: run batch-ui, then run it again with the same selection
# → already-running projects print "[label] server on port N already running, skipped"
# → only new/dead projects are spawned
# → ui-batch-down can still stop previously-running servers (their PIDs preserved in registry)

# Build passes
pnpm --dir packages/taskflow run build
```

## Notes

- The user's "taskflow-playground vs insight-flow" issue is a registry data problem (playground folder was registered instead of project root). With `--remove` they can clean it up: `insight-flow batch-ui --remove "taskflow-playground"`.
- The port-collision `claimedPorts` set fix ensures correctness within a single run even under rapid sequential `findFreePort` calls.
- `lastSelected` cleanup on remove prevents a ghost label from being pre-checked next time.
- Already-running detection uses `process.kill(pid, 0)` as a liveness probe (signal 0 checks existence without actually sending a signal). ESRCH means dead → fall through to spawn. EPERM means alive but no permission to kill → treat as alive (skip).
- `writeBatchUiRunningPids` must write the **union** of newly spawned processes and surviving already-running entries, not just the new ones — otherwise `ui-batch-down` loses track of the surviving servers.
- Related: N56 (original batch-ui implementation).
