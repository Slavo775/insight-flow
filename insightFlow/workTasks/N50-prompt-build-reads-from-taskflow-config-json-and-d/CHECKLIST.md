# N50 — prompt-build reads from taskflow.config.json and drops taskflow.prompt.json — Checklist

## Done criteria

- [ ] `prompt-build` reads exclusively from `taskflow.config.json` — no `taskflow.prompt.json` reference remains in code or help text
- [ ] GIT RULE block lists each denied git operation explicitly based on `agents.git.permissions`
- [ ] `remoteOps: "deny"` produces a dedicated "all remote ops NOT permitted" line
- [ ] `agents.extend` entries are injected into role files during `--apply`
- [ ] `applyAgentExtensions` extracted to a shared helper used by both `init` and `prompt-build`
- [ ] `AGENT_ENFORCEMENT.md` at repo root regenerated and committed

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes with no TypeScript errors
- [ ] No regressions in `init` (still writes role files correctly)

## Verification

- [ ] `insight-flow prompt-build` output contains git permissions from `taskflow.config.json`
- [ ] `insight-flow prompt-build --apply` is idempotent (second run produces no diff)
- [ ] Setting `push: false` in config then running `prompt-build` shows "push is NOT permitted" in output
