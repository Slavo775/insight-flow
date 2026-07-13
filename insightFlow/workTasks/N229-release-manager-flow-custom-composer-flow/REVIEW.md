# N229 — Release Manager Flow (custom composer flow) — Review

**Reviewer:** Composer Reviewer (ai)
**Date:** 2026-07-13
**PR:** (no PR yet)
**Verdict:** approved (AI pass — no blockers)

## Summary

The custom flow `custom:release-manager` and all 28 authored definitions (6 subagent
modules, 11 section modules, 5 handover modules, 5 agents, 1 flow) were reviewed by the
four per-kind reviewer subagents (module / agent / flow / relationship). Everything is
schema-valid, every referenced id resolves, and no built-in or locked-tier definition was
modified. All new ids use `custom:`. Risk: low (nothing installed yet). No blockers.

## Checklist verification

- [x] 6 subagent modules — pass (correct kind, unique `release-*` names, right `tools`/`readonly`; test-fixer enforces root-cause-not-rewrite; project-installer detects PM, best-effort, flags major jumps, never commits)
- [x] 11 section modules — pass (guard refuses without a prior check; publish covers merge + release-please + npm + `gh` pending_deployments approval; install polls `npm view`, reads `hub.json` bulkRegistered, per-project fan-out, best-effort report, sets `done`)
- [x] 5 handover modules — pass (modes match spec; plan→ship gated; fix→check gated cycle back-edge)
- [x] 5 agents — pass (baseline order correct; handover before `actions`; plan composes `template-copy` and NOT `authoring-spec-structure`; ship reuses `task-git/*`; rollout terminal)
- [x] Flow — pass (entryAgents ⊆ agents; 7 edges resolve; both terminals declared + reachable; `install: ["activity"]`)
- [x] No built-in / locked tier modified — pass

## Blockers

None.

## Non-blocking

1. **Branch name "master" vs "main"** — `custom:task-release-ship-identity` and
   `custom:task-release-ship-publish` say "merge the release branch into **master**" and
   "never force-push to **master**". This repo's default branch is **main** (recent
   release-please merges land on `main`). Fix: change wording to "main" or "the project's
   default branch". Recommended to fix before install.
2. **Handover `when` attribution nit** — `custom:handover-plan-to-fix` reason says "The check
   found doc/test gaps"; the `changes-needed` status is actually set by the plan step. Loose
   wording only; optional.
3. **Spec vs created ids** — spec inventory wrote slash ids (`.../identity`); custom ids cannot
   contain `/`, so hyphen ids were created (`...-identity`). Consistent and correct; noted only
   for traceability.

## Security & edge cases

- Publisher self-approves the GitHub Actions deploy after the human gate — the irreversible
  merge+publish sits behind the gated `plan→ship` handover, so no irreversible action runs
  without a human go-ahead. Correct.
- Rollout mutates other projects (best-effort) but never commits/pushes there; major version
  jumps are flagged, not silently applied. Acceptable.

## Notes

- AI pass approved with 3 non-blockers. Recommend fixing non-blocker #1 (main/master) before
  install, since it ships in the publisher's prompt.
- Next: this becomes `ai-approved` and loops back for the human review pass (install is gated
  and comes only after human approval).
- Stray `custom:test` flow exists in the registry (unrelated) — candidate for later cleanup.


---

## Round 2 — Human review

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** fix-needed

### Summary

Human decision: "Fix main/master, then approve." One change requested before approval;
everything else accepted.

### Blockers

1. Change branch name **"master" → "main"** (the project's default branch) in the two ship
   sections: `custom:task-release-ship-identity` and `custom:task-release-ship-publish`
   ("merge the release branch into main" / "never force-push to main").

### Non-blocking

None added by the human. (AI-pass nits #2 and #3 not requested.)

### Notes

- After this fix is applied and re-reviewed, the human approves for install.



---

## Round 3 — Human review (after fix)

**Reviewer:** Human (Project Owner)
**Date:** 2026-07-13
**Verdict:** approved

### Summary

The Round 2 blocker was fixed: `custom:task-release-ship-identity` and
`custom:task-release-ship-publish` now say "main" (merge into main / never force-push to
main); nothing else changed. Human decision: "Fix main/master, then approve." → approved.

### Blockers

None.

### Notes

- All 28 definitions approved. Next step is install (gated Composer Installer) — requires the
  human's explicit go-ahead before anything is written to disk.

