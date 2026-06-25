# N182 — Concepts: the composition model (everything-is-a-module, agents, flows, handover) — Checklist

## Done criteria

- [ ] `concepts/index.md` expanded into the real "How it works" mental-model intro with a Module→Agent→Flow diagram.
- [ ] `concepts/modules.md` — the 8 module kinds, text/artifact/behavior-as-data distinction, locked modules.
- [ ] `concepts/agents.md` — agent = ordered modules → one role prompt; bundles; JSON→`*_ROLE.md` drift-guard.
- [ ] `concepts/flows.md` — flow = agents + edges + install + statuses + entryAgents; task↔flow binding.
- [ ] `concepts/handover.md` — module-level vs flow-edge handovers; auto vs gated; the lifecycle chain.
- [ ] Every page is conceptual (the *why*), with cross-links to Reference (N183) and Guides (N184).
- [ ] Claims grounded in source (module kinds, locked ids, handover modes verified against code).
- [ ] No source-code change; docs only.
- [ ] Reference inventory / how-to / dashboard NOT covered here (out of scope).

## Quality gates

- [ ] `pnpm --dir website build` passes, zero broken-link/anchor warnings.
- [ ] `pnpm sync` reports `reference/` unchanged.
- [ ] `npx prettier --check` passes on new files.

## Verification

- [ ] Concepts section renders the 5 pages in order; diagrams display.
- [ ] Spot-check: 8 module kinds, locked ids `security`/`enforcement`/`protocol`, modes `auto`/`gated`.
