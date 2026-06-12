# N77 — Cursor lifecycle hooks to dashboard via binary payload parsing — Checklist

## Done criteria

- [ ] `insight-flow hook <event> --provider cursor` reads stdin, normalizes Cursor fields (`conversation_id`, tool/command) + event names → derived event types (parsing in TS, tested).
- [ ] `statusFromEvent` maps Cursor event names correctly (e.g. `stop`→done); Claude mappings unchanged.
- [ ] `insight-flow init --editor cursor` generates `.cursor/hooks.json` (version 1, camelCase events) + thin scripts that call `insight-flow hook … --provider cursor`; wired via a `writeHooks` step on the cursor provider.
- [ ] Cursor `stop` notify hook fires OS + browser + sound (reuses `insight-flow notify` + `/api/agent-done`).
- [ ] Approval→sound→push: `beforeShellExecution`/`preToolUse` gate emits `approval-required` + returns `ask` on a conservative matcher; never auto-`allow`.
- [ ] Cursor events show in the dashboard's unified "Agent Activity" feed with the cursor badge (from N76).
- [ ] `--editor claude` output + Claude hooks unchanged (no regression).
- [ ] Parity caveats (cloud agents; no PermissionRequest) documented in README.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run build` passes (TS strict)
- [ ] `npx tsc --noEmit` clean
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new Cursor parsing + generation tests)
- [ ] No regression in Claude hook / event-stream / init tests

## Verification

- [ ] Sample Cursor `stop` payload → `insight-flow hook --provider cursor` → derived `agent-idle`, status `done`, `provider: cursor`
- [ ] `insight-flow init --editor cursor` → `.cursor/hooks.json` + scripts present; `--editor claude` `.claude` hooks intact
- [ ] Dashboard (running) shows a cursor-tagged event in the unified feed; a `stop` fires the notification
