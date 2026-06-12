# N82 — Analysis (pre-taskmaster strategist trail)

> Produced by `/task-analyze`. One of three follow-ups to N81 (with N83, N84); the React dashboard (C) was deliberately deferred. North Star: **"lean now, scale deliberately."**

## Problem framing

The repo enforces quality only via `tsc --noEmit` + `node:test`. There is **no linter, no formatter, no pre-commit hook** (CLAUDE.md states this explicitly). Right after a 50-file restructure (N81) is the natural moment to add the toolchain before more features pile on — this is the original roadmap's "Phase 2".

## Goal

A working lint + format + pre-commit gate that matches the existing style with zero churn, wired into the agent quality gates, with a minimal dependency footprint.

## Options considered

**Linter/formatter**
- **ESLint (flat config, typescript-eslint) + Prettier** *(default recommendation)* — ubiquitous, well-understood, integrates with editors/agents. Cost: several dev-deps (eslint, typescript-eslint, prettier, configs).
- **Biome** *(strong "lean" alternative — worth a real look)* — a single fast binary that does lint **and** format, far fewer deps. Trade-off: smaller ecosystem/rule set than ESLint, fewer community configs. Given the North Star, the implementer/human should consciously choose ESLint+Prettier vs Biome.

**Pre-commit hook**
- **Native `.git/hooks/pre-commit` + an installer command** — zero deps; insight-flow already ships hook-installer machinery (`install-lifecycle-hooks`), so a native git-hook installer fits the codebase.
- **husky + lint-staged** — conventional, ergonomic staged-file filtering; adds deps.

## Decision

Ship a lint+format+pre-commit gate, **style-preserving (no mass reformat)**, wired into `taskflow.config.json agents.extend`. Tooling choice (ESLint+Prettier vs Biome; native hook vs husky) is left to the implementer with a documented recommendation — but bias to the leaner option absent a reason. Independent of N83/N84.

## Open questions

- **ESLint+Prettier vs Biome** — the main fork; resolve in implementation against the "lean" bias.
- Native git hook vs husky+lint-staged.
- Auto-format the whole tree now (one churn commit) vs enforce going forward only.
- "Agents improvement" (from the original Phase-2 phrasing) is undefined — a separate future item, not this task.

## Sources

- `CLAUDE.md` — "No ESLint / Prettier configured at the workspace root."
- `packages/taskflow/package.json` (current scripts: build, typecheck, test) · existing hook-installer commands.
- N81 (just-merged restructure that motivates hardening now).

## Handoff brief

> **Title:** Add code-quality toolchain — ESLint + Prettier + pre-commit hooks + quality gates · **Type:** feat · **Priority:** high
> Add a style-preserving lint+format setup + a pre-commit hook (typecheck+lint+format-check on staged files) + `lint`/`format` scripts, wired into `taskflow.config.json agents.extend`. Keep deps minimal (consider Biome / a native hook). Out of scope: runtime changes, N83 (transport), N84 (storage), React.
