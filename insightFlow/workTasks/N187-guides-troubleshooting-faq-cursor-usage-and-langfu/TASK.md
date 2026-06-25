# N187 — Guides: troubleshooting/FAQ, Cursor usage, and Langfuse observability setup

**Type:** feat
**Priority:** medium
**Created:** 2026-06-25

## Problem

- After the N181–N185 batch the core docs are comprehensive, but a gap analysis found three consumer-facing topics with no (or only scattered) coverage: a **Troubleshooting/FAQ** (zero pages today), a dedicated **Cursor / multi-editor** guide (only in the README), and an **observability setup** how-to (only config keys are documented). These are the last consumer-doc gaps.

## Goal

1. `guides/troubleshooting.md` — a Troubleshooting/FAQ for common pitfalls + fixes.
2. `guides/cursor.md` — using insight-flow with Cursor.
3. `guides/observability.md` — setting up Langfuse observability.
4. `guides/index.md` updated to link all three; cross-links wired.

## Scope

### In scope

- **`guides/troubleshooting.md`** — problem→fix entries, each grounded in real behavior:
  - Hooks not firing → Claude Code needs a session restart after install (`/exit` + reopen).
  - Port conflicts → dashboard `6006`, master `6100`; override with `--port`.
  - Stale dashboard / "page crashed" → hard-refresh; for the docs site, `docusaurus clear` + restart (the stale-dev-server case).
  - Legacy layout → `insight-flow migrate-layout` (`--dry-run`, `--fix-strays`).
  - Agent reports a step was "skipped" → empty `agents.extend` for that agent (point to the config + the quality-gates/wire-pr guides).
  - Browser won't open on `ui` → `INSIGHT_FLOW_NO_OPEN=1`.
  - Master not starting → lock at `~/.insight-flow/master.lock`; how to recover.
- **`guides/cursor.md`** — `insight-flow init --editor cursor`; `.cursor/skills/<name>/SKILL.md` (invoked as `/<name>`); the root `AGENTS.md` context block; `.cursor/hooks.json` + thin hook scripts; the `cursor` provider badge in the activity feed; caveats — cloud agents fire only partial lifecycle hooks (partial live feed), and Cursor has no native `PermissionRequest` event so matchers are insight-flow-defined in `.cursor/hooks/insight-flow-approval.sh` (gates return `{"permission":"ask"}`, never auto-deny). Ground in `src/agents/cursor-hooks.ts` + the README "Choosing your editor" section.
- **`guides/observability.md`** — enable `observability.langfuse.enabled`; credentials via `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` (config-first, env-fallback, then `LANGFUSE_BASEURL`); what gets traced; and that the exporter is a **no-op / SDK never loaded** when disabled (non-users pay nothing). Ground in `src/core/observability/langfuse.ts` + `configuration.md`.
- **`guides/index.md`** — add the three pages under an appropriate grouping (e.g. an "Operate insight-flow" / "Troubleshooting" group). Assign `sidebar_position` after the existing guides (current last is `upgrade-1x-to-2.md` at 9).
- Cross-link `configuration.md` (langfuse + notification keys), `cli/events-and-hooks.md`, and concepts where relevant.

### Out of scope

- **OpenTelemetry as a standalone integration** — the `observability/` dir contains only `langfuse.ts`; document **Langfuse only**. Mention OTel **only if** `langfuse.ts` genuinely exposes an OTLP endpoint/path; otherwise do not imply a separate OTel feature.
- **Internal architecture** and the **programmatic API** (intentionally excluded — consumer-only docs).
- The already-tracked deferrals: **N186** (custom statuses), **N185** (dashboard screenshots), **N184** (built-ins cross-links) — do not duplicate.
- Any source-code change; docs only.

## Implementation plan

1. **Ground each topic in source:** `src/agents/cursor-hooks.ts` (cursor surface), `src/core/observability/langfuse.ts` (enable/creds/no-op + check for any OTLP path), and verify the troubleshooting claims (`INSIGHT_FLOW_NO_OPEN` in dashboard/server, master lock path, `migrate-layout` flags in `cli.ts`).
2. **Write `guides/troubleshooting.md`** — problem→fix list, real commands.
3. **Write `guides/cursor.md`** — init/scaffold/caveats.
4. **Write `guides/observability.md`** — Langfuse enable + creds + no-op.
5. **Update `guides/index.md`** to link the three; add `sidebar_position` to each page; wire cross-links.
6. **Build** — `pnpm --dir website build` clean (no broken links/anchors); confirm pages render under Guides.

## Verification

- `pnpm --dir website build` passes with zero broken-link/anchor warnings.
- The three pages render under Guides; `guides/index.md` links them.
- Claims spot-checked against source: cursor init/hooks (`cursor-hooks.ts`), Langfuse enable/creds/no-op (`langfuse.ts`), `INSIGHT_FLOW_NO_OPEN`, master lock path, `migrate-layout` flags.
- Observability page documents **Langfuse only** (no phantom standalone OTel).
- `npx prettier --check` (or the repo's prettier) passes on new files.

## Notes

- Adds to the **unshipped N181–N185 batch** (ship together — decision: keep documenting, ship later).
- Filling the three gaps from the post-batch gap analysis; core product is already comprehensively documented.
- See `ANALYSIS.md` for the gap analysis and why architecture/programmatic-API are excluded.
