# N187 — Guides: troubleshooting/FAQ, Cursor usage, and Langfuse observability setup — Checklist

## Done criteria

- [ ] `guides/troubleshooting.md` — problem→fix entries (hook restart, port conflicts, stale dashboard, migrate-layout, empty agents.extend, INSIGHT_FLOW_NO_OPEN, master lock), each grounded in real behavior.
- [ ] `guides/cursor.md` — `--editor cursor`, `.cursor/skills`, `AGENTS.md`, `.cursor/hooks.json`, provider badge, and the cloud-agent / PermissionRequest caveats.
- [ ] `guides/observability.md` — enable `observability.langfuse.enabled`, `LANGFUSE_*` creds (config-first/env-fallback), what's traced, no-op when disabled.
- [ ] Observability page documents **Langfuse only** — no phantom standalone OpenTelemetry feature.
- [ ] `guides/index.md` links all three new pages; `sidebar_position` set so they order after existing guides.
- [ ] Cross-links to `configuration.md`, `cli/events-and-hooks.md`, concepts resolve.
- [ ] No source-code change; out-of-scope items (architecture, programmatic API, N184/N185/N186 deferrals) not touched.

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor warnings.
- [ ] Claims grounded in source (`cursor-hooks.ts`, `langfuse.ts`, `INSIGHT_FLOW_NO_OPEN`, master lock, `migrate-layout`).
- [ ] Prettier passes on new files.

## Verification

- [ ] Built site shows the three pages under Guides; index links them; cross-links work.
- [ ] Spot-check one cursor + one langfuse claim against source.
