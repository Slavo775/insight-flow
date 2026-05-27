# N56 — batch-ui command — multi-project server launcher

**Type:** feat
**Priority:** medium
**Created:** 2026-05-27

## Problem

Running dashboards for multiple insight-flow projects requires manually `cd`-ing into each project directory and running `insight-flow ui` in separate terminals. There is no way to launch several project dashboards at once from a single command, and no global place to register which projects you care about.

## Goal

1. Add a global registry file (`~/.insight-flow/batch-ui.json` on Mac/Linux, `%USERPROFILE%\.insight-flow\batch-ui.json` on Windows) where users list named project entries (label + absolute path).
2. Add `insight-flow batch-ui` command that reads the registry, shows an interactive multi-select prompt, starts the master server (`:6100`) if not running, spawns a dashboard server for each selected project on auto-assigned ports, and prints the URLs.
3. Optionally open all dashboard URLs in the default browser after launch (`--open` flag, defaulting to `true`).
4. Cross-platform: works on macOS, Linux, and Windows (path resolution, browser-open command).
5. Selected projects persist as the default selection for the next `batch-ui` run (stored back in `batch-ui.json` as `lastSelected`).

## Scope

### In scope

- New command `batch-ui` in `packages/taskflow/src/commands/batch-ui.ts`.
- CLI wiring in `packages/taskflow/src/cli.ts`.
- Global registry file: `~/.insight-flow/batch-ui.json` — read/write from `packages/taskflow/src/global-config.ts` (new file).
- Sub-command `insight-flow batch-ui --add "<label>" <path>` to register a project without editing JSON by hand.
- Sub-command `insight-flow batch-ui --list` to print registered projects.
- Interactive multi-select prompt using the already-bundled `readline` (no new deps); fall back to non-interactive mode if stdin is not a TTY (selects all projects).
- Browser-open helper using `open` (macOS), `xdg-open` (Linux), `start` (Windows) — no new npm dep.
- `--no-open` flag to suppress browser launch.
- Master server detection before spawning (reuse existing `MASTER_PID_FILE` logic from `server/index.ts`).

### Out of scope

- GUI configuration screen inside the dashboard (future).
- Port conflict resolution beyond picking the next free port.
- Authentication or shared login across projects.
- Changes to the existing `insight-flow ui` command behavior.

## Implementation plan

1. **Global config helpers** (`packages/taskflow/src/global-config.ts`)
   - Export `getGlobalConfigDir(): string` — returns `path.join(os.homedir(), ".insight-flow")` (cross-platform via `node:os` + `node:path`).
   - Export `readBatchUiRegistry(): BatchUiEntry[]` and `writeBatchUiRegistry(entries)`.
   - `BatchUiEntry` shape: `{ label: string; path: string }`.
   - Export `readBatchUiLastSelected(): string[]` and `writeBatchUiLastSelected(labels: string[])`.
   - `mkdirSync` the config dir with `{ recursive: true }` on first write.

2. **`--add` and `--list` sub-commands** (`packages/taskflow/src/commands/batch-ui.ts`, `cmdBatchUiAdd`, `cmdBatchUiList`)
   - `insight-flow batch-ui --add "My App" /abs/path/to/project` — validates path exists, appends entry, writes registry.
   - `insight-flow batch-ui --list` — prints table of label + path.

3. **Interactive multi-select prompt** (inside `cmdBatchUi`)
   - If stdin is a TTY: render checkbox list with arrow-key navigation using `node:readline` raw-mode (up/down to move, space to toggle, enter to confirm). Show last-selected entries pre-checked.
   - If not a TTY (piped / CI): select all entries, print selected list, proceed.

4. **Port allocation** (`packages/taskflow/src/commands/batch-ui.ts`)
   - Start scanning from port `6007` upward; for each selected project, find the next free port via a TCP `net.createServer` probe.
   - Store `{ label, path, port }` list for the spawn phase.

5. **Process spawning**
   - Use `child_process.spawn("insight-flow", ["ui", "--port", String(port)], { cwd: projectPath, detached: true, stdio: "ignore" })` + `.unref()` so child processes outlive the parent.
   - On Windows replace `insight-flow` with `insight-flow.cmd` (detect via `process.platform === "win32"`).
   - Print each `[label] http://localhost:<port>` line as spawned.

6. **Browser open**
   - After all spawns: if `--open` (default true), wait `1500 ms` then call the platform open command once per URL: `open <url>` / `xdg-open <url>` / `start "" <url>`.
   - Use `child_process.exec` (fire-and-forget).

7. **CLI wiring** (`packages/taskflow/src/cli.ts`)
   - Add `batch-ui [--add <label> <path>] [--list] [--no-open]` to the help text.
   - Route `command === "batch-ui"` to `cmdBatchUi(opts)` from the new command file.

8. **Types** (`packages/taskflow/src/types.ts`)
   - Add `BatchUiEntry` interface export (reuse from global-config or define there and re-export from types).

## Verification

```bash
# Register two projects
insight-flow batch-ui --add "Insight Flow" /path/to/insight-flow
insight-flow batch-ui --add "My Other App" /path/to/other-app
insight-flow batch-ui --list
# → table showing both entries

# Launch interactively
insight-flow batch-ui
# → checkbox prompt, select both, enter
# → "[Insight Flow] http://localhost:6007"
# → "[My Other App] http://localhost:6008"
# → browser opens both tabs

# Non-interactive (pipe)
echo "" | insight-flow batch-ui --no-open
# → starts both servers without browser, no prompt hang

# Windows smoke test (manual)
# insight-flow.cmd batch-ui --add "App" C:\path\to\app && insight-flow.cmd batch-ui
```

## Notes

- Cross-platform path: `os.homedir()` returns `C:\Users\<user>` on Windows, `/home/<user>` on Linux, `/Users/<user>` on macOS — no special casing needed beyond the `insight-flow.cmd` wrapper for spawn.
- The master server at `:6100` is already managed by the existing `ui` command's `startServer`; `batch-ui` delegates per-project servers to child `insight-flow ui` processes, so no new server logic is needed.
- Future: a `--kill` sub-command to stop all batch-spawned servers (would need PID tracking in global config).
- Related: N50 (reduce token waste), N55 (v0.8.0 release) — ship after v0.8.0.
