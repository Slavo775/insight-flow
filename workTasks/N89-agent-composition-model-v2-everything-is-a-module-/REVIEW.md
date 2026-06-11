# N89 — Agent composition model v2 — everything is a module + registry — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-11
**PR:** https://github.com/Slavo775/insight-flow/pull/64
**Verdict:** approved

## Summary

Round 2 of the agent-composer line (PR #64, commit `ac1c52f`): the composition model collapses to one primitive — a composed agent is a single ordered `modules` list, rendered as a pure sequence. `AgentModuleSchema` becomes a discriminated union (`section` | `include`); `ComposedAgentSchema` loses `sections`/`includes`/`trailingIncludes`; the registry gains shared (`events`, `recorder-discipline`) and 12 role-scoped `<role>/<slug>` modules; `indexById` throws on duplicate ids. **Low risk — still additive**: nothing consumes the composed output; no shipped `TASK_*_ROLE.md` / `AGENT_*.md` touched (verified against the diff). All gates green (build, 100/100 tests, lint debt pre-existing) and — new this round — a real playground behavioral run passed. Verdict: **approved**.

## Checklist verification

- [x] Discriminated-union `AgentModuleSchema` + ordered-list `ComposedAgentSchema`; v1 fields removed — pass (`core/schema/index.ts`; test asserts the fields are gone)
- [x] Registry: shared modules + role-scoped `<role>/<slug>` — pass (`modules/*.json`, `modules/roles/*.json`; registry test)
- [x] `indexById` throws on duplicate id, with test — pass (also exported via barrel for testability)
- [x] Pure-sequence composer; merging removed; truthful source-of-truth comment — pass (`compose.ts` header now states hand-written roles stay canonical until Round 3)
- [x] Both agents re-expressed, still referencing `minimal-diff` + `scope-guard` — pass (reuse test)
- [x] Normalized section-set reproduction test — pass (`headingSequence` + `includeSequence` equality vs both hand-written roles, replacing v1 phrase-grep; phrase guards retained for content-drop)
- [x] Playground behavioral run recorded in PR body — pass (playground N04 driven end-to-end by the composed `task-implement` prompt; `next` correctly preferred a `fix-needed` task, lifecycle transitions correct; artifacts committed)
- [x] No shipped role files modified — pass (diff grep clean)
- [x] `pnpm build` — pass · tests 100/100 — pass · lint — 2 pre-existing unused-vars in untouched test files (identical on main; out of scope)
- [x] No regressions in `prompt-build` non-compose path — pass (path untouched; import surface unchanged)

## Blockers

None — approved.

## Non-blocking

1. **Drift surface grew.** The N88 caveat stands and is now bigger: 12 role-scoped JSON modules duplicate hand-written role text until Round 3 makes JSON canonical. The composer header documents this; consider a drift-detecting CI check in Round 3 rather than waiting for divergence.
2. **`recorder-discipline` is registered but unreferenced** by any composed agent — inert data until the human-review/incident roles are composed (Round 3). Fine per spec; flagging so it isn't mistaken for wired-up behavior.
3. **Fixer NEVER nuance delta.** Hand-written `TASK_REVIEW_FIXER_ROLE.md` says "unrelated to the review findings" / "beyond what the review requested"; the composed version substitutes minimal-diff's task-generic wording. Same semantic-delta class N88 accepted, but Round 3 (where composed becomes canonical) should decide whether the review-specific wording needs a role-scoped module.
4. **Implementer NEVER drops the change-mode bullet** ("In change mode: never change code unrelated to the request…") — pre-existing v1 delta, persists; same Round 3 consideration as #3.

## Security & edge cases

- Role-scoped module ids contain `/`, but module ids are never used in file paths — only registered composed-agent ids reach `--out` writes (`${agentId}.composed.md`), and those remain flat. Same posture as N88.
- All module/agent JSON is Zod-validated at import; the new section refinement rejects heading-less, body-less modules; duplicate ids now fail fast instead of silently last-winning. Unknown module refs throw before any output.

## Notes

- The blank line between a section's own bullets and a following shared-module block is the decided pure-sequence behavior (human R4), not a bug — markdown list semantics are unchanged.
- Reviewer caveat: this round was implemented and reviewed in the same session; the human review is the independent gate.
- Roadmap: Round 3 — migrate the 9 shipped roles, JSON canonical, distribution wiring. Rounds 4–5 — heterogeneous modules, dashboard UI (per N88 ANALYSIS.md).


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-11
**Verdict:** approved

### Summary

Human approved N89 as-is and will merge PR #64 manually; task closed to `done`. Human's exact comment:

> approved i will merge it manually please clo the task

### Checklist verification

- Re-review of the AI round accepted; no items contested.

### Blockers

None — approved.

### Non-blocking

None this round.

### Security & edge cases

None this round.

### Notes

- AI-round non-blocking items #1–#4 (drift check, inert `recorder-discipline`, NEVER wording deltas) remain open as Round 3 considerations.
- Merge is performed manually by the human; task moved `approved → done` at their request before merge.
