# N34 — Activity engine disabled by default — Checklist

## Done criteria

- [ ] `activityEnabled` in `dashboard.ts` uses `config.activityEngine?.enabled === true`
- [ ] Same guard applied in `server/index.ts`
- [ ] `insight-flow init` scaffold sets `"activityEngine": { "enabled": false }`
- [ ] Config template updated to `enabled: false`
- [ ] `playground/taskflow.config.json` has `"enabled": true` explicitly

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` exits 0

## Verification

- [ ] Remove `activityEngine` key from playground config → `pnpm play` → no activity tabs visible
- [ ] Restore `"enabled": true` → tabs reappear without restart
- [ ] `insight-flow init` in a temp dir → generated `taskflow.config.json` has `"enabled": false`
