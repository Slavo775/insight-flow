# N88 — Agent-module composer spike — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-11
**PR:** https://github.com/Slavo775/insight-flow/pull/63
**Verdict:** approved

## Summary

Greenlight-or-kill spike for the agent-module composer: `module` + `composed-agent` Zod schemas, two modules (`minimal-diff`, `scope-guard`) + two composed agents (`task-implement`, `task-review-fix`) authored as JSON, a `composeAgent` composer, a `prompt-build --compose` CLI mode, and a 7-case test. **Low risk — purely additive**: no shipped role file is touched, the composed output is not yet consumed anywhere. All gates green (typecheck, lint, 94/94 tests) and the composed MD semantically reproduces the two hand-written roles. Verdict: **approved** — the spike achieves its purpose; findings below are quality/risk notes, none blocking.

## Checklist verification

- [x] `moduleSchema` + `composedAgentSchema` defined + exported — pass (`core/schema/index.ts`; barrel `index.ts`)
- [x] `minimal-diff` + `scope-guard` modules authored as data — pass (`agents/modules/*.json`)
- [x] `task-implement` + `task-review-fix` defs, both referencing the two modules — pass (both `"modules":["minimal-diff","scope-guard"]`)
- [x] composer emits role MD for both agents (text only) — pass (`prompt-build --compose` verified)
- [x] emitted MD semantically reproduces hand-written roles — pass (manual diff: semantic-only deltas; see Non-blocking #3 re: weak automated check)
- [x] written go/no-go verdict recorded — pass (commit `7fbdb4e` + PR #63 body; not in task folder per enforcement)
- [x] `pnpm build` passes — pass
- [x] tests pass incl. new `compose.test.mjs` — pass (94/94)
- [x] lint clean — pass (eslint configured; clean)
- [x] no regressions / shipped roles untouched — pass (diff confirms no `*ROLE.md` / `AGENT_*.md` changes)
- [x] emitted MD diffed vs hand-written roles — pass
- [ ] playground behavioral validation ("composed agents behave") — **NOT done** — inherent to a spike (prompt behavior can't be unit-tested); deferred to human review. Disclosed in PR body. Not a blocker for a greenlight/kill spike.

## Blockers

None — approved.

## Non-blocking

1. **Drift risk (the key one).** The composed JSON duplicates prompt content that also lives in the canonical `TASK_IMPLEMENTER_ROLE.md` / `TASK_REVIEW_FIXER_ROLE.md`. Nothing consumes the composed output yet, so the two copies can silently diverge. Mitigation already planned (Round 3 makes JSON canonical); until then treat `agents/composed/*.json` as throwaway spike artifacts. Suggest a marker comment or a drift-detecting test.
2. **Misleading comment.** `compose.ts` header says *"Source of truth is the JSON under modules/ and composed/"* — but for this spike the hand-written role `.md` files remain canonical; the JSON is a parallel experiment. The comment is aspirational (Round 3), not current reality — tighten the wording to avoid misleading a future reader.
3. **Semantic-repro test under-verifies the headline claim.** `compose.test.mjs` asserts only ~4 phrases appear; it does not check section set/order or that no role-specific content was dropped. The "semantically reproduces" claim rests on the manual diff, not the test. Consider a normalized section-set comparison in Round 2.
4. **No duplicate-id guard in the registry.** `Object.fromEntries` silently keeps the last entry on id collision. Fine for two modules; add a guard before the registry grows.

## Security & edge cases

- `composeAgentById` throws on unknown ids *before* any file write, so `--compose <id> --out <dir>` cannot be coerced into path traversal via an unknown id. (The `${id}.composed.md` join would only be unsafe if a *registered* id contained a path separator — not currently possible.)
- All module/agent JSON is Zod-validated at load — malformed data fails fast. Good.

## Notes

- `resolveJsonModule` is a project-wide tsconfig change driven by this feature; benign.
- Behavioral validation belongs to `/task-human-review` (drive a real task with a composed prompt).
- Roadmap: Round 2 (registry + `recorder-discipline`), Round 3 (migrate roles → JSON canonical) per `ANALYSIS.md` "What's next".
- Incidental (out of scope here): `CLAUDE.md` claims "No ESLint/Prettier configured" but the package configures both — worth a separate doc fix.


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** fix-needed

### Summary

Human review of `src/agents/compose.ts`: the registry-construction code is repetitive and must be DRY'd before merge. Verdict: **fix-needed**.

### Checklist verification

- Behavioral validation (the open AI-round item) was not exercised this round; human review focused on code quality. Carry forward.

### Blockers

1. **DRY the registry construction** (`src/agents/compose.ts`) — the `MODULE_REGISTRY` and `COMPOSED_AGENTS` builders are near-identical; collapse them into one shared helper. Human's exact comment:

```ts
// Validate authored data at load — malformed module/agent JSON fails fast.
export const MODULE_REGISTRY: Record<string, AgentModule> = Object.fromEntries(
  [minimalDiff, scopeGuard].map((m) => {
    const parsed = AgentModuleSchema.parse(m);
    return [parsed.id, parsed];
  }),
);

export const COMPOSED_AGENTS: Record<string, ComposedAgent> = Object.fromEntries(
  [taskImplement, taskReviewFix].map((a) => {
    const parsed = ComposedAgentSchema.parse(a);
    return [parsed.id, parsed];
  }),
);
```

> DRY

### Non-blocking

None this round.

### Security & edge cases

None this round.

### Notes

- Fixer hint (not human wording): extract a generic helper, e.g. `indexById<T extends { id: string }>(items: unknown[], schema): Record<string, T>` that parses each item and keys by `parsed.id`, then build both registries through it. Doing so also resolves AI-review Non-blocking #4 (add the duplicate-id guard inside the helper).
- Next: `/task-review-fix` picks up this `fix-needed` blocker.


---

## Round 3 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** fix-needed

### Summary

Human review of the composed-agent model: the shared `@includes` should themselves be modules, while the section structure stays. Verdict: **fix-needed** — fold into the current N88 fix cycle.

### Checklist verification

- Carries forward the open behavioral-validation item from the AI round.

### Blockers

2. **`@includes` should be modules** — `AGENT_ENFORCEMENT.md` and `AGENT_PROTOCOL.md` must be represented as modules (not hard-coded in the `includes` array), emitted **verbatim "as is"** (the `@FILE.md` reference, not inlined content). Human's exact comment:

   > please input output contract shouldnt be also module? + AGENT_ENFORCEMENT.md", "AGENT_PROTOCOL.md should also be the module no? the section structure i like it bude maybe we can have also AGENT_ENFORCEMENT.md", "AGENT_PROTOCOL.md as a section without heading but body can be the url to okej non no no no no no no please AGENT_ENFORCEMENT.md", "AGENT_PROTOCOL.md should be also modules section leave as is and create module for this two but it should be define as is

   Resolved decisions (from clarifying Q&A — not a rephrase of the above):
   - **Sections stay as-is** — INPUT/OUTPUT CONTRACT etc. remain sections, **not** modules.
   - **One module per include** — two new include-modules (e.g. `enforcement`, `protocol`), each emitting its own `@FILE.md` reference verbatim.
   - Requires a **new module contribution kind** (e.g. `kind: "include"` with a `ref`) + composer support to render include-modules in the top-of-prompt includes region. Both composed agents drop their literal `includes: [...]` in favour of referencing these modules.
   - Scope: **blocker on N88** (this fix cycle), not deferred to Round 2.

### Non-blocking

None this round.

### Security & edge cases

None this round.

### Notes

- This expands N88 beyond a pure spike (the module schema gains a second contribution kind). Accepted by the human.
- **Not invented / out of this blocker:** the human specified only `AGENT_ENFORCEMENT.md` + `AGENT_PROTOCOL.md`. `@AGENT_EVENTS.md` (the `trailingIncludes` entry) was **not** mentioned — fixer should leave it as-is unless the human says otherwise.
- Fixer now has **two blockers**: (1) Round 2 — DRY the registry construction; (2) Round 3 — include-modules. `/task-review-fix` should address both in one cycle.


---

## Fix — Rounds 2 & 3 blockers resolved

**By:** task-review-fix · **Date:** 2026-06-11

- **R2 (DRY)** ✅ — extracted `indexById<T>(items, schema)` in `src/agents/compose.ts`; both `MODULE_REGISTRY` and `COMPOSED_AGENTS` build through it. Behaviour preserved (last-wins on id collision). The dup-id *guard* (AI non-blocking #4) was **not** added — it changes behaviour and wasn't authorised, so left out per scope guard.
- **R3 (includes-as-modules)** ✅ — `ModuleContributionSchema` is now a discriminated union on `kind` (`prompt` | `include`). Added two include-modules: `enforcement` (`@AGENT_ENFORCEMENT.md`) and `protocol` (`@AGENT_PROTOCOL.md`), one per file as requested. Both composed agents drop their literal `includes` array and reference the modules; the composer renders include-modules in the includes region (deduped, in declared order). `@AGENT_EVENTS.md` left as `trailingIncludes` (not in scope, per the human's note). Sections unchanged.
- **Gates:** typecheck + lint clean; 96/96 tests (incl. 2 new include-module tests). Composed MD diff vs the hand-written roles is unchanged (same semantic-only deltas) — reproduction still holds.


---

## Round 4 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** approved

### Summary

Human asked what distinguishes sections from modules and proposed unifying everything into modules (sections become `kind: "section"`; `includes`/`trailingIncludes` removed — only `modules`). Resolved as a **Round 2 direction**, not a blocker. N88 **approved** as-is — the spike proved the core model and the R2 + R3 fixes are in.

### Checklist verification

- Re-review of the fixed task: R2 (DRY via `indexById`) + R3 (includes-as-modules) confirmed addressed; gates green (typecheck/lint, 96/96 tests); composed-MD reproduction unchanged.
- [ ] Behavioral validation still open — carried forward (acceptable for a spike).

### Blockers

None — approved.

### Non-blocking

None this round.

### Security & edge cases

None this round.

### Notes — Round 2 direction: "everything is a module"

Human's exact comment:

> whats is different between sections and modules? shouldnt be sections also the module but kind section? also includes shouldnt be exist it should exist only modules

Resolved direction (from clarifying Q&A — not a rephrase; **for the Round 2 task spec, not N88**):
- **Unify into modules** — a composed-agent becomes a single ordered `modules` list. Sections become `kind: "section"` modules; `includes` + `trailingIncludes` are removed (every include/event is a module). One primitive, one ordered list → makes the eventual drag-and-drop UI trivial.
- **Merge model: pure sequence** — each module renders as a standalone block in declared order. Drop the "target a heading and merge bullets" behavior; the author controls placement explicitly. (This collapses the current `prompt`-vs-`section` split toward ordered blocks.)
- **Open design note (flagged, not human-decided):** to avoid registry bloat from single-use bespoke content, let the `modules` list mix shared id-refs with inline module objects. Decide in the Round 2 spec.
- **Scope:** Round 2 (registry / model-redesign round), explicitly **not** N88. This **supersedes the Round 3 "sections stay as-is" decision** going forward.
