# N53 — interactive prompts in init for hooks and activity engine — Checklist

## Done criteria

- [ ] `initProject` is async; `cli.ts` awaits it
- [ ] `promptUser` helper uses `node:readline`; respects `process.stdout.isTTY` (silent fallback when non-interactive)
- [ ] `--yes` / `-y` flag skips all prompts and applies defaults
- [ ] Re-run on existing configured project skips prompts entirely
- [ ] Lifecycle hooks question asked first (default yes); hooks installed on yes
- [ ] Activity engine question asked second (default no); config updated + hooks installed on yes
- [ ] One-line explanation printed before each prompt
- [ ] `taskflow.config.json` written back to disk with `activityEngine.enabled: true` when activity accepted

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] No regressions in existing non-interactive `init` behaviour

## Verification

- [ ] Fresh `init` → both prompts appear with correct defaults shown
- [ ] `y` to lifecycle → hook files present in `.claude/hooks/`, registered in settings
- [ ] `y` to activity → `taskflow.config.json` has `activityEngine.enabled: true`
- [ ] `n` / Enter on activity → `enabled` stays `false`, no activity hook files written
- [ ] `insight-flow init --yes` completes with no prompts
- [ ] Piped input (`echo "" | insight-flow init`) → no hang, defaults applied
