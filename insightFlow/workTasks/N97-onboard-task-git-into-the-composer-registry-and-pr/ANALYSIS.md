# N97 — Onboard task-git into the composer, registry, and project flow — Analysis

**Created:** 2026-06-11
**Author:** task-analyze

## Problem framing

Human (2026-06-11, verbatim): *"please i do not see task-git why? in agents nor in projects why?"* — found by browsing the new N93/N96 dashboard surfaces, which is exactly the visibility they were built to create. Root cause verified: `.claude/commands/task-git.md` is a 176-line inline prompt (every other command is a 3-line `@ROLE_FILE.md` pointer), so task-git predates and escaped the entire composer line — no role file, not in N90's "9 roles", absent from `COMPOSED_AGENTS`, invisible on the agents page and the project flow map, and `AGENT_ROLE_FILE_MAP`'s existing `task-git → TASK_GIT_ROLE.md` entry points at a file that doesn't exist (so the documented `agents.extend.task-git` injection silently no-ops in consumers).

## Goal

- task-git becomes the 10th composed agent (byte-faithful decomposition), gets a generated drift-guarded role file, the command shrinks to a pointer, and the project flow shows the real push/PR/merge backbone.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Full onboarding: modules + generated role file + command pointer + flow edges (chosen) | Closes every symptom at once; extend injection starts working; map honest; "the 10" consistent | Touches command file + templates + init + tests | M |
| B — Flow-map-only (add a static git node without composing the agent) | Tiny | Cosmetic: agents page still missing it, extend still broken, prompt still unmanaged | S |
| C — Onboard but keep the prompt inline in the command (registry as a copy) | No command change | Recreates the pre-N90 drift disease the drift suite exists to prevent | S |

## Decision

- Chosen: **A** (human: "please do the task"). Fidelity rule from N90 applies: decompose as-is; the only permitted deltas are the include-region normalization (`notify`/`config` become include modules) and the appended `actions` block (consistent with the other 10 and with task-git's documented start/done events).

## Open questions

- [non-blocking] `AGENT_NOTIFY.md`/`AGENT_CONFIG.md` root-canonical status: they exist at repo root; verify whether `sync-role-templates.mjs` should ship them (currently ships PROTOCOL/SECURITY; init templates carry the rest) — add to the sync list if root-canonical.
- [non-blocking] The huge EXAMPLES APPENDIX section: keep as one module or split per host example — keep as one (fidelity; splitting is wording-adjacent restructuring).
- [non-blocking] Flow edge from `task-git` terminal: model merge/done as edge-less terminal state on the git node vs a self-loop — pick whatever renders clearest; descriptive iteration.

## Sources

None external — discussion was self-contained. Internal references (provenance: analyzer-discovered, 2026-06-11, trust: high):
- `.claude/commands/task-git.md` (176 lines, inline role) vs `.claude/commands/task-implement.md` (3-line pointer) — the inconsistency.
- `packages/taskflow/src/agents/agents.ts` `AGENT_ROLE_FILE_MAP` — the dangling task-git mapping.
- `packages/taskflow/src/agents/project/default.json` — the flow missing its backbone.

## Handoff brief

> Title: Onboard task-git into the composer, registry, and project flow · Type: rework · Priority: medium · Tags: agents, composer, task-git, project.
> Decompose the inline command prompt byte-faithfully into `task-git/*` modules (+ new `notify`/`config` include modules + `actions`); register as the 10th composed agent; compose-apply generates TASK_GIT_ROLE.md (drift ×10, templates, init); the command file becomes the standard 3-line pointer (fixing `agents.extend.task-git` in consumers); project flow gains the push/review/merge backbone edges. No rewording. After N96.
