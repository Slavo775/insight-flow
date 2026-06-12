# N76 — Add provider identity (claude/cursor) to lifecycle events + dashboard — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-01
**PR:** https://github.com/Slavo775/insight-flow/pull/52
**Verdict:** approved

## Summary

Additive `provider` (claude/cursor) plumbing. `Provider` type + optional `provider` on the four event shapes (`types.ts`) + Zod schemas (`schema/index.ts`); `cmdLogEvent` stamps `--provider` on the hook/agent event, activity entry, and `/log/events` payload **only when explicitly supplied** (so existing Claude events are byte-identical); dashboard relabels the pane to "Agent Activity" and renders a per-row provider badge. Reviewed the full diff (7 files, +87/−2) — all in scope; no engine/status changes; `statusFromEvent` untouched as specified. **Low risk** — every change is additive + optional, back-compat is the explicit design, and the suite (12 files) is green.

## Checklist verification

- [x] `Provider` type + optional `provider` on the 4 event shapes — pass (`types.ts`)
- [x] Optional `provider` enum on Zod schemas; payloads without it still validate — pass (`schema/index.ts`; `log-events-endpoint` tests still green)
- [x] `cmdLogEvent` accepts `--provider`, stamps event + activity + `/log/events` — pass. **`cli.ts` correctly needed no edit** — `--provider` flows via the existing `opts` pass-through for both `log-event` and `hook`. Verified.
- [x] Server forwards `provider` on socket frames — pass (validated event carries it on the `event` frame; `ActivityEvent.provider` rides the `activity` frame → drives the feed badge). No server edit needed.
- [x] Unified "Agent Activity" feed + per-row claude/cursor badge — pass (`providerBadge` helper + CSS; pane relabeled).
- [x] Absent provider behaves as today (claude) — pass (only stamped when explicitly passed; test asserts no field on no-flag).
- [x] Cursor hooks / `statusFromEvent` Cursor names / notifications NOT touched — pass (reserved for N77).

Quality gates: `tsc --noEmit` clean; full suite **12 files `# fail 0`** (incl. new `log-event` provider cases + `provider-dashboard.test.mjs`).

## Non-blocking

**Resolution (post-review, applied to the uncommitted implementation at the user's request — no fix-needed lifecycle since the review approved). All four addressed:**

- ✅ **#1 fixed** — `HookEventInputSchema.provider` loosened to `z.string().optional()` (+ `HookEventInput.provider?: string`); internal `TaskEvent`/`ClaudeHookEvent` keep the strict `ProviderSchema` enum. Ingestion now accepts a future provider instead of 400'ing. `tsc` clean; `log-events-endpoint` suite green.
- ✅ **#2 + #3 reconciled** — `providerBadge` now renders **only for non-default providers** (claude/absent → no badge, removing single-editor noise — #3), and is injected into **all** row types (Event, Skill, Phase, Activity, Tool, generic), so cursor activity is tagged wherever it appears — #2. Added `.activity-badge-provider-other` for future editors.
- ✅ **#4 fixed** — added a test exercising `insight-flow hook PostToolUse --provider cursor` (the subcommand path), asserting `tool-approved` + `provider: cursor`.

Full suite: 12 files `# fail 0` (log-event 9 tests, provider-dashboard 2).

---

_Original findings (for the record):_

1. **Strict `provider` enum at the ingestion boundary** — `HookEventInputSchema.provider` is `ProviderSchema` (enum), while sibling `type` is deliberately `z.string()` *"free-form to forward-compat with new Claude Code hook events"* (`schema/index.ts:239` vs `:243`). A future provider (e.g. `openai`) POSTing `/log/events` would be **rejected 400** rather than accepted-and-ignored. Doesn't bite today (claude/cursor both validate; adding a 3rd provider touches the schema anyway), but it contradicts the lenient-ingestion design. Suggested fix: loosen the **ingestion** field to `z.string().optional()` (keep the strict enum on the internal `TaskEvent`/`ClaudeHookEvent` schemas).
2. **Badge only on `Event`-tool rows** — `providerBadge` is injected into the hook + agent Event branches, not Skill/Phase/Tool/Activity rows. Fine for N76 (those are agent-side markers), but a Cursor session's Skill/Phase rows won't show a cursor badge until/unless extended.
3. **Always-on claude badge** — every Claude event row now shows a `claude` badge (`provider || 'claude'`). Deliberate (unambiguous provenance in a unified feed), but mild visual noise on existing single-editor projects; could badge only non-claude if it bothers users.
4. **`hook` subcommand provider path not directly tested** — the provider test exercises `log-event … --provider cursor`; the `hook <event> --provider cursor` path runs the *same* `cmdLogEvent` code but has no dedicated test. N77 will add Cursor hook tests that cover it.

## Security & edge cases

- `--provider` with no value or an unknown value → `getProvider` returns `undefined` (no stamp, no crash). Good.
- Optional schema fields mean old `events.json` + in-flight pre-N76 Claude hooks validate unchanged (verified by the green `log-events-endpoint` / `log-event` suites).

## Notes

- This is **N76 (Task A)**; **N77 (Task B, PR #53, stacked)** consumes `provider` for the Cursor hooks. N77 should rebase onto `main` after N76 merges.
- The activity→synthetic-event bridge (`server/index.ts`) was intentionally left without `provider` — it feeds status derivation only, which doesn't use provider. (Spec open-question #1.)


---

## Round 2 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-02
**Verdict:** approved

### Summary

Human approved and requested merge. Exact wording: "approved done merge it! N77 N76".

### Blockers

None.

### Notes

Approved for merge into `main` via PR #52.
