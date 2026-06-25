# N187 — Analysis (pre-taskmaster strategist)

## Problem framing

Question: "do we have everything documented? what else?" Ran a gap analysis of
the site's coverage against the actual feature surface after the N181–N185 batch.
Conclusion: the **core is comprehensively documented**; three consumer-facing
gaps remain.

## Gap analysis (grounded in `website/docs/` greps)

Well-covered (no action): CLI, Concepts (modules/agents/flows/handover), Guides
(custom module/agent/flow, install engine, master, PR wiring, quality gates,
upgrade), Configuration, Built-in reference (modules/agents/flow/master),
Dashboard, Agents, Flow, incidents, change-requests, notifications, bulk-ui,
security.

Genuine gaps found:
- **Troubleshooting / FAQ** — **zero pages**. High value (common pitfalls have no
  home).
- **Cursor / multi-editor** — only scattered mentions + the README; no dedicated
  page. Medium value (real differentiator).
- **Observability setup** — only config keys (`configuration.md`); no how-to.
  Niche.

Intentionally **excluded** (would be gold-plating / wrong audience):
- Internal architecture (consumer-only decision; `docs/architecture-diagrams.md`
  stays out of the site).
- Programmatic API (thin `dist/index.js` barrel; it's a CLI tool).

Already tracked — do NOT duplicate: N186 (custom statuses), N185 (dashboard
screenshots), N184 (built-ins cross-links).

## Key verification (pre-scope)

- `observability/` contains **only `langfuse.ts`** — there is **no standalone
  OpenTelemetry integration**. The README's "Langfuse / OpenTelemetry" refers to
  Langfuse's OTel-compatibility. → The observability guide documents **Langfuse
  only**; OTel mentioned only if `langfuse.ts` exposes an OTLP path.
- `src/agents/cursor-hooks.ts` exists — the Cursor surface is real.

## Options considered

- **Document everything (incl. architecture + programmatic API)** — rejected
  (gold-plating; consumer-only scope).
- **Three separate tasks** — viable; rejected for overhead since all three are
  small Guides additions shipping together.
- **One combined task (3 Guides pages)** — CHOSEN (human-confirmed go-ahead).

## Decision

One task: `guides/troubleshooting.md` + `guides/cursor.md` +
`guides/observability.md` (Langfuse only) + `guides/index.md` links. Adds to the
unshipped N181–N185 batch (ship together — human chose "keep documenting, ship
later").

## Open questions

- Whether `langfuse.ts` exposes an OTLP endpoint (decides whether OTel gets a
  one-line mention) — left to the implementer to verify.
- Sidebar grouping for the three new guides (e.g. an "Operate / Troubleshooting"
  group) — implementer's call, lowest-churn.

## Sources

- Gap-analysis greps over `website/docs/`.
- `src/agents/cursor-hooks.ts`, `src/core/observability/langfuse.ts`,
  `src/core/config.ts` / `types.ts` (langfuse + notification keys),
  `dashboard/server` (`INSIGHT_FLOW_NO_OPEN`), `cli.ts` (`migrate-layout`),
  `~/.insight-flow/master.lock`, the README "Choosing your editor" section.

## Handoff brief

feat / medium / tags docs,guides. Three Guides pages (troubleshooting/FAQ; Cursor
usage; Langfuse observability setup) + index links + cross-links. Langfuse only
(no phantom OTel). Docs-only. Adds to the unshipped N181–N185 batch.
