# N271 — Full codebase audit — security, data safety, antipatterns, fragile code → fix tasks — Checklist

## Done criteria

- [ ] `AUDIT.md` written in this folder with sections: Summary · Findings · Seed verdicts · Looks solid · Test coverage map
- [ ] Every bullet in `AUDIT-SEED.md` (T1–T14) has one verdict row: kept / rejected / changed + reason + file:line
- [ ] Every finding has severity, category, file:line, scenario, fix, confidence and seed ref (or "new")
- [ ] New findings added for areas the seed did not cover (composer MCP tools, flow-chain code, compose/modules, sync-role-templates, published tarball)
- [ ] Fix-task list proposed: title · type · priority · AUDIT IDs · dependencies/order · "waits for N267" where relevant
- [ ] Locked decisions written into the fix tasks they affect (`--id` on writes, bind 127.0.0.1, `@`-include roles, N267 ordering)
- [ ] Human gave an explicit "create it" for the fix-task list before any `/taskmaster` call
- [ ] Fix tasks created; their IDs listed under `## Created tasks` in `AUDIT.md`

## Quality gates

- [ ] No source changes: `git diff --stat -- packages/ .github/` is empty
- [ ] No files written outside `insightFlow/workTasks/N271-*/` (except the new fix-task folders and tracker JSON)
- [ ] No servers started against the real `insightFlow/` data

## Verification

- [ ] Count of Seed-verdict rows equals the count of bullets in `AUDIT-SEED.md`
- [ ] 10 random file:line references open to the code they describe
- [ ] `insight-flow list` shows every task named in `## Created tasks`
