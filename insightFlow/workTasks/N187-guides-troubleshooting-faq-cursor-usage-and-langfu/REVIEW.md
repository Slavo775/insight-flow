# N187 — Guides: troubleshooting/FAQ, Cursor usage, and Langfuse observability setup — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-25
**PR:** (no PR yet)
**Verdict:** approved

## Summary

Three new Guides pages (troubleshooting, cursor, observability) + `guides/index.md`
links. Docs-only. Independently spot-checked the riskiest claims against source —
all accurate, including the critical "Langfuse only / no OTel" guardrail.
Approving.

## Checklist verification

- [x] `troubleshooting.md` — 7 problem→fix entries, all grounded:
  - `INSIGHT_FLOW_NO_OPEN=1` matches `dashboard/server/index.ts:1515`
  - `~/.insight-flow/master.lock` matches `master/lock.ts:6` (`LOCK_PATH`)
  - `migrate-layout --dry-run / --fix-strays` exist in `cli.ts`
  - ports 6006 / 6100 correct
- [x] `cursor.md` — `--editor cursor`, `.cursor/skills`, `AGENTS.md`, hooks, provider badge, caveats; permission gate value `{"permission":"ask"}` matches `cursor-hooks.ts` — pass
- [x] `observability.md` — **Langfuse only**; explicitly states "There is no standalone OpenTelemetry / OTLP integration" (verified: `langfuse.ts` exposes no OTLP path, uses the classic langfuse SDK) — pass. Enable flag + `LANGFUSE_*` config-first/env-fallback + no-op-when-disabled all correct.
- [x] `guides/index.md` links the three new pages; cross-links resolve — pass
- [x] No source-code change; out-of-scope deferrals (N184/N185/N186) not touched — pass

## Quality gates

- [x] `pnpm --dir website build` clean (zero broken-link/anchor warnings)
- [x] prettier clean on all 4 files

## Non-blocking

None.

## Notes

- This batch's prior review caught an agent-introduced Socket.IO error, so I
  independently re-verified N187's claims against source rather than trusting the
  drafting agent — all confirmed accurate.
- Ships with the N181–N187 documentation batch.


---

## Human Review — Round 2

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-25
**Verdict:** approved

> "done ship all this documentations all tasks"

### Blockers

None.

### Notes

Approved for merge as part of the full documentation batch (N181–N187). Handing to `/task-git` to ship.
