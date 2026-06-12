# N88 — Agent-module composer spike

**Type:** feat
**Priority:** medium
**Created:** 2026-06-10

## Problem

The modular-agent vision (agent = core + composable modules, eventually assembled in a dashboard UI, `compose` → emits MD/skill/MCP/hooks) is large and unproven. Before building a module registry, a real composer, or any UI, we need evidence that "core + stacked modules" can reproduce a *coherent* agent prompt rather than incoherent concatenation. An audit of the 9 role files showed the big cross-cutting blocks are already shared via `@includes`; the only meaningful shared content is a few conceptual themes phrased differently per role.

## Goal

1. Define a `module` JSON schema and a `composed-agent` JSON schema (Zod) in `core/schema/`.
2. Author two shared modules as data — `minimal-diff` and `scope-guard` — normalized from wording currently inline across implementer/fixer/incident roles.
3. Express `task-implement` and `task-review-fix` as composed-agent definitions that **both** reference those two modules + role-specific overrides (tests reuse + dedup + override-merge).
4. Add a minimal composer path to `prompt-build`: read agent-def → resolve + order modules → emit role MD (text only).
5. Produce a written verdict: does the core+modules model hold, and should we proceed to the role-migration round?

## Scope

### In scope

- `module` + `composed-agent` Zod schemas in `packages/taskflow/src/core/schema/` (exported via the schema barrel + `src/index.ts`).
- Two module definitions authored as data: `minimal-diff`, `scope-guard`.
- Two composed-agent definitions: `task-implement`, `task-review-fix` (both referencing the two shared modules).
- Minimal composer path in `packages/taskflow/src/cli/commands/prompt-build.ts` (or a helper it calls): agent-def → resolved, ordered module list → emitted role MD (text only).
- Validation: diff emitted MD vs current hand-written `TASK_IMPLEMENTER_ROLE.md` / `TASK_REVIEW_FIXER_ROLE.md`; semantic match verified in the playground.

### Out of scope

- MCP server / hook / skill emission (text-only this round).
- The `recorder-discipline` module and the other 7 roles.
- A full module registry cataloguing all existing `@AGENT_*.md` partials.
- The dashboard agent-creator UI.
- Custom states / state-machine editing.
- User-defined / custom modules and any registration UX.
- Migrating the shipped roles to generated (separate, gated follow-up — see ANALYSIS.md "What's next").

## Implementation plan

1. **Schemas** — In `core/schema/`, add `moduleSchema` (id, contribution kind = `prompt`, title, body, order hint, `source: "builtin"`) and `composedAgentSchema` (core: id / purpose / lifecycle position; ordered `modules: string[]` refs; role-specific override sections). Export via the schema barrel + `src/index.ts`.
2. **Author modules** — Create `minimal-diff` and `scope-guard` as data (under a new `agents/modules/` location), normalizing the wording currently duplicated in implementer/fixer/incident.
3. **Author agent-defs** — Composed-agent definitions for `task-implement` and `task-review-fix`, each referencing `[minimal-diff, scope-guard]` plus their role-specific INPUT / OUTPUT / OVERRIDES / NEVER content.
4. **Composer** — A function called from prompt-build (e.g. `composeAgent(def, registry)`) that resolves module refs, dedups, orders, and concatenates core + shared `@includes` + modules + overrides into role MD. Text-only.
5. **Emit + diff** — Emit both role MDs to a scratch path and diff against the hand-written originals. Capture the deltas.
6. **Validate in playground** — `pnpm play`; confirm both composed agents behave; note any behavioral drift.
7. **Verdict** — Write a short go/no-go conclusion (in Notes / a VERDICT block): does the model hold? what did dedup / ordering / override-merge require? proceed to migrate round y/n.

## Verification

- `module` + `composed-agent` definitions validate against the Zod schemas.
- Composer emits `task-implement` + `task-review-fix` MD; emitted output **semantically** matches the hand-written roles. Byte-for-byte is *not* required — note where exact reproduction is impossible and why that's acceptable.
- Structural / snapshot test on composer output (`pnpm --dir packages/taskflow test`).
- Playground run (`pnpm play`) confirms both composed agents still behave.
- Written verdict recorded in the task.

## Notes

- Strategy + full rationale: see `ANALYSIS.md` in this folder (options/decision trail + "What's next" roadmap).
- Audit finding: the 3 already-shared blocks (`@AGENT_ENFORCEMENT.md`, `@AGENT_PROTOCOL.md`, `@AGENT_EVENTS.md`) cover most cross-cutting content; verbatim cross-role duplication is ~5 lines (not worth extracting); the real shared content is conceptual themes (`minimal-diff`, `scope-guard`, `recorder-discipline`) that need normalization.
- Source-of-truth decision: JSON-as-source, MD as generated artifact (build step + drift to manage later) — but this spike does **not** migrate shipped roles; the hand-written roles stay canonical and are the reproduction target.
- This is a **greenlight-or-kill** spike. A "no" verdict (concatenation produces incoherent prompts) is a valid, valuable outcome that saves the larger build.
- Related: N81 (module-folder split); `packages/taskflow/scripts/sync-role-templates.mjs` (existing generated-artifact pipeline — the drift precedent).
