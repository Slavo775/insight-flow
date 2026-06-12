# N98 — Security as a first-class module — decompose enforcement, baseline trio on every agent — Analysis

**Created:** 2026-06-12
**Author:** task-analyze

## Problem framing

Human (2026-06-12, verbatim core): *"we need also security md as a module so decompose enforcement … enforcement should be the module also security should be the module also and agents should have security module each … see agent protocol also need to have own module and also be wired with every agent but not in enforcement md."* Verified reality: security is nested file-side (`buildEnforcementBlock()` emits `@AGENT_SECURITY.md` as line 1 of the generated `AGENT_ENFORCEMENT.md`) — invisible to registry/maps; protocol is already a flat module and NOT nested in enforcement (only a prose mention), but `task-git` is the one agent missing it. Same disease class as the task-git gap (N97): things that exist but can't be seen.

## Goal

- Visible per-agent baseline trio (security/enforcement/protocol) on all 10 agents; enforcement file decomposed to enforcement-only; no double-includes; consumers heal automatically.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Flat modules: `security` first-class, on every def (chosen) | Each baseline visible per agent on the maps; matches the human's final lean | 10 defs touched + both generators re-run | S–M |
| B — `enforcement` becomes a bundle(security, enforcement-base) | One ref per agent | The bundle renders as ONE node — security stays hidden behind a wrapper; recreates the problem at registry level | M |
| C — Leave nesting, registry-only metadata | Tiny | Cosmetic; file-side nesting remains the truth | S |

## Decision

- Chosen: **A** (human-confirmed across two refinement rounds, including the explicit "but not in enforcement md"). A later `baseline` convenience bundle for *custom* agents remains possible without changing this.

## Open questions

- [non-blocking] Include ordering for task-git: keep notify/config first (current file order) then the trio, vs security absolutely first across all 10. Implementer picks one rule, applies consistently, documents.
- [non-blocking] Legacy consumers whose role files predate the security include: they keep getting security via their (old) enforcement file until they re-init/upgrade templates; the regenerated enforcement file drops the line on next `prompt-build --apply` — confirm the upgrade story doesn't create a window where neither path includes security (mitigation: consumer enforcement regenerates only via the same --apply that also can't update role files… verify and document the sequencing in the README note if needed).

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, 2026-06-12, trust: high): `packages/taskflow/src/cli/commands/prompt-build.ts` (`buildEnforcementBlock` emitting the nested include), `AGENT_SECURITY.md` (content untouched), `composed/task-git.json` (missing protocol), N97 ANALYSIS (the visibility precedent).

## Handoff brief

> Title: Security as a first-class module — decompose enforcement, baseline trio on every agent · Type: rework · Priority: medium · Tags: agents, composer, security, modules.
> New `security` include module on all 10 composed defs (first position); `buildEnforcementBlock()` stops embedding `@AGENT_SECURITY.md` (enforcement-only file, consumers heal on next apply); `protocol` wired into task-git (conscious prompt change, human-acked). Regenerate 10 roles + enforcement file, drift ×10, templates, trio-per-agent test. Out of scope: content changes to the partials; a baseline bundle.
