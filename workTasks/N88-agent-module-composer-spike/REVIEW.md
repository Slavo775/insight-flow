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
