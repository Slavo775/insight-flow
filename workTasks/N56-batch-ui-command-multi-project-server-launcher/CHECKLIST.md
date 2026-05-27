# N56 — batch-ui command — multi-project server launcher — Checklist

## Done criteria

- [ ] `~/.insight-flow/batch-ui.json` is created on first `--add` call on macOS/Linux; `%USERPROFILE%\.insight-flow\batch-ui.json` on Windows
- [ ] `insight-flow batch-ui --add "Label" /path` registers project and writes registry
- [ ] `insight-flow batch-ui --list` prints all registered projects
- [ ] `insight-flow batch-ui` shows interactive multi-select checkbox prompt on a TTY
- [ ] Last selected entries are pre-checked on subsequent runs
- [ ] Selected projects are spawned as child `insight-flow ui --port <N>` processes on auto-assigned ports starting at 6007
- [ ] Each spawned process is detached (survives parent exit)
- [ ] `--no-open` suppresses browser launch; default opens each URL in the system browser
- [ ] Non-TTY (piped input) mode selects all projects and runs without interactive prompt
- [ ] Works on macOS, Linux, and Windows (spawn uses `insight-flow.cmd` on `win32`)
- [ ] `pnpm --dir packages/taskflow run build` succeeds with no TypeScript errors

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` (tsc) passes with zero errors
- [ ] No regressions in existing `insight-flow ui` behavior
- [ ] `insight-flow batch-ui --list` on an empty registry prints a friendly "No projects registered" message

## Verification

- [ ] `insight-flow batch-ui --add "Test" $(pwd)` → entry appears in `~/.insight-flow/batch-ui.json`
- [ ] `insight-flow batch-ui --list` → shows "Test" row with correct path
- [ ] `insight-flow batch-ui --no-open` → spawns server at `:6007`, process survives after command exits, `curl http://localhost:6007` returns HTML
- [ ] `echo "" | insight-flow batch-ui --no-open` → non-interactive path runs without hanging
