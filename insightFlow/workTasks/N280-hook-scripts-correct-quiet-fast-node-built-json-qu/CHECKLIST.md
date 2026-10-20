# N280 — Hook scripts correct, quiet, fast — node-built JSON, quoted paths, local bin, silent stdout, active-flag fast path — Checklist

## Done criteria

- [ ] The activity hook writes JSON via node (or correct escaping); commands are truncated to 120 chars (A26)
- [ ] Every emitted hook command quotes `"$CLAUDE_PROJECT_DIR"`; `IF_CMD` is a bash array (A40a)
- [ ] Lifecycle scripts and flow installs resolve the local binary first (`RESOLVE_BIN`) (A40b)
- [ ] All background `log-event` calls redirect stdin, stdout and stderr; the hook path prints nothing (A40c)
- [ ] One Stop produces at most one notification, and only for active sessions (A40d)
- [ ] An inactive session spawns no node per tool call; heavy commands are lazy-imported in `cli.ts`; before/after CPU numbers in the PR (A41)
- [ ] The Cursor gate never emits "allow" for unparsed or non-sensitive input; it parses in node (A42)
- [ ] Activation: Cursor only on a known slash command; Claude also recognizes `.claude/skills/<n>/SKILL.md` (A42)
- [ ] `migrate-hooks` refreshes all bundled scripts and stale registrations; `BUNDLED_HOOKS_VERSION` bumped; the CLI warns on an old version; header comment corrected (A46)

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regressions in affected area (`activity-hook`, `cursor-hooks`, `cursor-provider`, `notify`, `log-event`, `init` green)

## Verification

- [ ] Script-execution tests: escaped quotes, path with a space, empty stdout, exit 0, no node spawn when inactive, Cursor bypass not allowed, migrate-hooks refresh
- [ ] Manual: every line of a fresh `.taskflow-activity.jsonl` parses
- [ ] Manual: a plain chat spawns no node per tool call
