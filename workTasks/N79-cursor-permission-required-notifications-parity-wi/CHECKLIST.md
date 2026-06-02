# N79 — Cursor permission-required notifications parity with Claude Done shortcut plus hook coverage — Checklist

## Done criteria

- [x] `POST /api/agent-permission` exists and returns `{ ok: true }`; respects `notifications.browser === false`
- [x] Dashboard listens for permission socket event and fires `Permission required` browser notification (same label as N68/N72 `fireStatusDesktopNotif`)
- [x] Cursor approval script curls `/api/agent-permission` when gate returns `ask` (port from `taskflow.config.json`)
- [x] `.cursor/hooks.json` includes `preToolUse` and/or `beforeMCPExecution` approval wiring (generated via `cursor-hooks.ts`)
- [x] Sensitive matcher covers at least shell gate patterns plus agreed tool/MCP patterns; non-matched ops still `allow`
- [x] Approval hooks still POST `approval-required` to `/log/events` for status pill / master
- [x] No stdout pollution on approval hooks (permission JSON only)
- [x] README documents Cursor permission path and parity caveats

## Quality gates

- [x] `pnpm --dir packages/taskflow run build` passes
- [x] `pnpm --dir packages/taskflow test` passes (7+ tests; new tests if added)
- [x] Claude lifecycle / log-events tests unregressed
- [x] Regenerated `.cursor/hooks/*` committed or init `--force` documented for consumers

## Verification

- [ ] Manual Cursor: `git push` (or matched command) → browser toast `Permission required` with dashboard open
- [ ] Manual Cursor: MCP/tool path covered by matcher → same toast when approval UI appears
- [ ] Manual Cursor: turn end → `Done` toast still works
- [ ] Manual Claude: permission prompt → notification still works
- [ ] Optional: dashboard closed → OS notify still fires from `insight-flow notify`
