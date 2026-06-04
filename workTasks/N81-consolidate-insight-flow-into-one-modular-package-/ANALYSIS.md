# N81 — Analysis (pre-taskmaster strategist trail)

> Produced by `/task-analyze` before handoff to `/taskmaster`. Captures the framing, the options weighed, and *why* this shape was chosen. North Star: **"lean now, scale deliberately."**

## Problem framing

`CLAUDE.md` claims the project is "two pieces only / no monorepo," but the repo is actually a **2-package pnpm workspace**:

- `packages/taskflow` → published as `insight-flow` v1.0.0 GA (CLI + server-rendered dashboard + agents + init + schema + storage, ~8.8k LOC; deps: `socket.io`, `zod`).
- `packages/insight-flow-master` → `insight-flow-master` v0.1.0, **not published**, separate bin, multi-project overview server; duplicates `socket.io`, `zod`, and its own `types.ts`/`config.ts`/`server.ts`.
- `playground/` → a third workspace member sandbox.

Three concrete defects motivated the work:

1. **Broken-in-distribution coupling.** The CLI auto-starts master via a hardcoded *workspace* path `resolve(__dir, "../../insight-flow-master/dist/index.js")` (`packages/taskflow/src/server/index.ts:202`). On a real `npm i -g insight-flow` that sibling does not exist, so master silently skips ("binary not found"). The 2-package layout only works inside this repo.
2. **Weak concern separation + duplication.** cli / dashboard / master / agents / core are intermingled; types & config are duplicated across the two packages.
3. **Stale docs.** `CLAUDE.md` misdescribes the architecture.

## Goal

Collapse to **one published `insight-flow` package** with concern-separated module folders, fold master in (fixing defect #1), and do it as a **provably green→green** refactor that preserves the published surface — without expanding scope into deps, lint, hooks, or the React rebuild.

## Options considered

**Repo shape**
- **A — One package, internal module folders** *(chosen).* Single distributable; `core / cli / dashboard / master / agents`. Best match to the user's words, kills duplication, fixes defect #1.
- B — Keep the workspace, just tidy boundaries. Lower risk but remains a monorepo (against stated wish); duplication only half-solved.
- C — Split into MORE published packages. Literal opposite of "not a monorepo"; rejected.

**Master server**
- **Fold master into the single package** as `insight-flow master` *(chosen).* Fixes the silent npm auto-start failure for free.
- 2nd bin in same package; or keep as its own package — both retain workspace topology.

> User first answered "keep master as its own package," which **conflicted** with the "one package" shape. The contradiction was surfaced explicitly; user resolved it to **fold master in**.

**Dependencies (socket.io)**
- **Leave socket.io as-is this phase** *(chosen).* Its removal (→ native WS/SSE) is gated to the future React-backend spec, where the "lightweight" requirement actually bites.
- (Rejected for now) rip it out / isolate behind a transport seam *as a dependency play*. Note: a transport *seam* is still introduced — but as future-proofing structure (see below), not as a socket.io removal.

**First-task scope**
- **Restructure + safety net only** *(chosen).* Defer prehooks, lint, code-quality, and React to separate specs.

**Future-proofing depth** (user refined: "don't over-index on lightweight, it will grow")
- Move-only / one transport seam / **define core extension points** *(user chose the broadest).* Strategist **bounded** it: a seam is justified only where a second implementation is known or imminent. Result: exactly **two** seams — **transport/realtime** (socket.io → robust swap is foreseen) and **storage** (JSON files → DB is credible) — each shipping with today's implementation behind it. Explicitly **rejected**: abstracting the HTTP server, and any generic plugin/hook framework (YAGNI). Existing `init/providers/*` already is an agent-provider seam — preserved, not rebuilt.

## Decision

Single `insight-flow` package, master folded in as `insight-flow master`, executed in three reviewable stages — **1a safety net → 1b move-only restructure → 1c two bounded seams** — with socket.io untouched and the published surface (bin, `exports`, tarball `files`) characterized and held constant. Sequencing (net before move) is mandatory so the restructure is provably green→green.

## Open questions

- Master exposure form: `insight-flow master` **subcommand** vs. a **second bin** in the same package — left to implementation; both must remove the sibling-path lookup.
- Whether 1c (seams) stays in this task or peels into a fast-follow spec if review size balloons.
- Exact `node --test` decoupling from the build (some tests currently require a prior `pnpm build`) — confirm during 1a.

## Sources

- `packages/taskflow/package.json`, `packages/insight-flow-master/package.json`, root `package.json`, `pnpm-workspace.yaml`.
- `packages/taskflow/src/server/index.ts:202` (sibling-path master launch), `:328` ("binary not found" log).
- `grep` confirming `socket.io` is load-bearing in both packages (server `Server as IOServer`; dashboard loads `/socket.io/socket.io.js`).
- `CLAUDE.md` (inaccurate "two pieces only" framing).

## Handoff brief

> **Title:** Consolidate insight-flow into one modular package + safety net + extension points
> **Type:** rework · **Priority:** high · **Tags:** refactor, architecture, build, testing, extensibility
> **Scope:** Collapse the 2-package workspace into one published `insight-flow` (`core / cli / dashboard / master / agents`); fold `insight-flow-master` in as `insight-flow master`, removing the sibling-path auto-start. Stage it: (1a) a build-decoupled `node --test` entry + playground e2e smoke + characterization test pinning the published surface; (1b) the move-only restructure + fold + launch fix + doc correction, provably green→green; (1c) two bounded extension-point interfaces — transport/realtime and storage — with current impls behind them. socket.io removal, the React dashboard, lint, and pre-hooks are out of scope (later specs).
