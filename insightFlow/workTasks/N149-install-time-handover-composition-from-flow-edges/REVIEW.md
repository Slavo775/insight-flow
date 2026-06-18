# N149 — install-time handover composition from flow edges — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**PR:** (no PR yet)
**Verdict:** fix-needed

## Summary

The composition plumbing is correct and well-tested: `composeAgent(def, registry, extraHandovers)` merges flow edge-handovers into the agent's `## Handover` section (deduped, append-when-none), `collectArtifacts` forwards them, and `flowArtifacts`/`flowHandoversByAgent` derive per-agent handovers (alias-resolved) — with the global `composeAgentById` output untouched (drift guard byte-identical). **But the chosen injection point only reaches custom command-installed agents, so the core "project-scoped handover for a built-in source" requirement is not met.** One blocker.

## Checklist verification

- [x] `flowHandoversByAgent` derives per-agent handovers (`from===agent && edge.handover`), aliases resolved — pass
- [x] `mergeHandovers` merges global + flow, deduped by (to,on,mode) — pass (unit tests)
- [x] Merged section emitted into the agent's command body; global compose unchanged (drift guard green) — pass
- [~] **Built-in source agents get the per-flow section** — **FAIL** → Blocker 1
- [x] Install endpoint passes flow context — pass (`flowArtifacts(flow)` at `index.ts:749`)

## Blockers

1. **Built-in source agents never receive the handover section.** `collectArtifacts` only emits a command artifact when `def.command?.install` is true (`compose.ts`). **No built-in composed agent declares `command.install`** (verified: `grep -l '"command"' src/agents/composed/*.json` → none). Built-in agents' prompts reach a consumer via `insight-flow init` role-scaffolding, NOT flow-install command artifacts. So for a built-in **source** (e.g. Taskmaster → X — the exact case "project-scoped" was chosen to support in ANALYSIS.md), `flowArtifacts` produces no command for that agent and the merged `## Handover` section is emitted nowhere.
   - **Repro:** the `is-test` "Test its working" flow (`taskmaster → custom:test-agent`, handover) — installing it writes no handover section anywhere, because `taskmaster` has no command artifact and `test-agent` (the target) has no outgoing handover.
   - **Why:** N149 injects into the flow-install command-artifact body, which only exists for custom (`command.install`) agents; built-in agents are out of that path.
   - **Fix (needs a small design decision):** in `flowArtifacts`/`flow-install`, when a flow-install agent is a **handover source** with flow handovers, emit a command/skill artifact for it **even without `command.install`** (carrying its composed prompt incl. the merged section) — OR inject the section into the consumer's init-scaffolded role file for that agent at install. Either makes built-in sources actually carry the section. (Custom command-install agents already work.)
   - **✅ Resolved (fix round 1):** chosen approach = "flow-install rewrites the agent's command file" (human-selected). `flowArtifacts` now force-emits a `command` artifact for any flow agent that is a handover **source** (`flowHandovers.length && a.commands.length === 0`), body = `composeAgent(def, registry, flowHandovers)`, name = `deriveCommandName(id)`. This overwrites the init-scaffolded `.claude/commands/<name>.md` for built-in sources (init writes those directly, not via the artifact manifest, so no manifest collision). Verified: `flowArtifacts` for `taskmaster → task-git` (handover) emits a `taskmaster` command containing the `## Handover` section listing `/task-git`. Gates green: 250 tests, typecheck + lint + format:check clean.
   - **Known caveats (documented):** (a) one shared command file per built-in agent ⇒ installing a *second, different* flow with a handover from the same source raises a manifest cross-bucket conflict (same-flow re-install is idempotent); (b) force-emitted commands omit the `$ARGUMENTS` suffix that `init`'s claude provider appends; (c) `as: "command"` assumes the claude (commands) layout, not cursor/skills. Acceptable for the single-flow consumer case; revisit if multi-flow-per-consumer becomes common.

## Non-blocking

1. **Append position** (`composeAgent`): when an agent has no handover module but the flow adds handovers, the section is pushed to the END of `mods` — i.e. AFTER the terminal `actions`/phase-markers block. Functional but cosmetically places `## Handover` after the strippable events block. Prefer inserting just before the `actions` module.

## Security & edge cases

- Dedup correct (exact (to,on,mode)); differing modes for the same (to,on) both render — authoring's concern, acceptable.
- Alias resolution via `resolveTrigger(e.on, flow.states)` means the section references the canonical status — good.

## Notes

Depends on N147; consumes N148 data. The blocker is the gap between "emitted command/skill" (custom, opt-in) and how built-in agents are actually delivered (init). Re-review after the source-artifact fix. The composition code itself is sound and reusable.


---

## Round 2 — approved

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Re-review of the Round 1 blocker fix. `flowArtifacts` now force-emits a `command` artifact for any flow agent that is a handover **source** without an existing command (`flowHandovers.length && a.commands.length === 0`), composed with the flow handovers — so installing a flow rewrites a built-in source's `.claude/commands/<name>.md` with the `## Handover` section. Blocker resolved; approving with one non-blocking parity nit.

### Checklist verification

- [x] Built-in source agents now receive the section — pass (verified: `flowArtifacts(taskmaster → task-git handover)` emits a `taskmaster` command containing `## Handover` + `/task-git`)
- [x] No double-emit for command-installed sources (`a.commands.length === 0` guard) — pass
- [x] Non-source agents don't get a forced command — pass (explicit test)
- [x] Global `composeAgentById` / `*_ROLE.md` unchanged — pass (drift guard green)
- [x] Gates: 250 tests, typecheck + lint + format:check clean — pass

### Blockers

None — Round 1 blocker resolved.

### Non-blocking

1. **`$ARGUMENTS` parity (recommended ~1-line fix).** `init`'s claude provider appends `\n\n$ARGUMENTS\n` to command bodies (`skills.ts`), but the force-emitted command omits it. So after a flow install overwrites a built-in source's command file, that command loses the `$ARGUMENTS` placeholder. Args still reach the command, but for parity append `\n\n$ARGUMENTS\n` to the force-emit body in `flowArtifacts`.
2. **Append position** (carried from Round 1): a flow-only handover section appends after the terminal `actions` block. Cosmetic.
3. **Multi-flow / format caveats** (documented in Round 1 blocker): second different flow from the same source → manifest conflict; `as: "command"` assumes the claude layout. Acceptable for single-flow consumers; revisit if needed.

### Security & edge cases

- The force-emit overwrites a file `init` wrote directly (not manifest-tracked) → no false collision on first install; same-flow re-install is idempotent. Verified by reasoning about `applyCommands` ownership.

### Notes

Blocker fix is sound and faithful to the human-chosen approach. The `$ARGUMENTS` nit is worth folding in before/with the merge but doesn't block.


---

## Round 3 — Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-18
**Verdict:** approved

### Summary

Project owner approved the edge-authored-handovers round (N147–N150) and authorized merging via gh. The Round 2 blocker (built-in source delivery) is resolved.

### Blockers

None.

### Suggestions (non-blocking)

`$ARGUMENTS` parity on force-emitted commands is deferred per the owner's "done"/merge instruction — track as a follow-up.

### Notes

Human's exact words: "done please merge it via gh"
