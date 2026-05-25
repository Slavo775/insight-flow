# N42 — Git operation permissions in config with task-git enforcement — Checklist

## Done criteria

- [ ] `AgentGitPermissions` interface exists in `types.ts` with all 9 keys (optional booleans).
- [ ] `AgentsConfig.git.permissions` field added to `types.ts`.
- [ ] `DEFAULTS` in `config.ts` includes all 9 permission keys (`forcePush` defaults `false`, rest `true`).
- [ ] `resolveConfig` deep-merges `agents.git.permissions` so a partial user config doesn't wipe unset keys.
- [ ] `AGENT_NOTIFY.md` contains the GIT PERMISSIONS section with operation→key table.
- [ ] `init/index.ts` scaffolds `agents.git.permissions` with all 9 keys in the generated config.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (no TS errors).
- [ ] No regressions in existing config loading (existing projects without the key still work).

## Verification

- [ ] Set `"push": false` in `agents.git.permissions` → `/task-git commit and push` prints blocked message and does not call `git push`.
- [ ] Remove the flag → agent proceeds to push normally.
- [ ] `insight-flow init /tmp/test-proj` → generated `taskflow.config.json` contains all 9 permission keys.
