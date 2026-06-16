# N127 — Install UI — button + live progress modal — REVIEW

**Verdict:** APPROVED
**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-16
**PR:** https://github.com/Slavo775/insight-flow/pull/99

## Summary

`InstallModal` lists the plan, runs `runFlowInstall`, and renders each target's
outcome (created/updated/unchanged/removed) from the authoritative POST reports;
a dedicated `EventSource` marks steps live while running. Re-runnable; close is
blocked mid-install; orphan-free fallback styling. "Install this flow" button on
ProjectPage. Matches the existing modal idiom.

## Checklist verification

- [x] Button + plan modal on the flow page; runs install; per-target outcome shown.
- [x] Summary + dismiss + re-run ("Run again"); default flow installable.
- [x] Plan/install endpoints covered by N125/N126 tests; typecheck + build green (no React harness, consistent with N106–N126).

## Blockers

None.

## Non-blocking

- **Live SSE is largely cosmetic.** The modal's `EventSource("/sse")` is opened in a `phase==="running"` effect that races the synchronous POST; since `applyArtifacts` is fast, the `install-progress` step frames usually arrive before (or instead of) the listener being ready, so steps light up from the response, not live. This is the disclosed trade-off — correctness is unaffected (the response is authoritative). If the live view matters, switch to a streaming response or open the `EventSource` before issuing the POST and await `onopen`.
- Reports are keyed by file `target`, so several plan rows sharing a target (multiple hooks → settings.json) show the same action — honest to the emitter's granularity, worth a tooltip later.

## Security & edge cases

- Close disabled while running prevents an abandoned run; hex/regex-free rendering. No user input flows to the server beyond the flow id.

## Notes

Closes Epic 3. The live-progress simplification is the only thing I'd revisit.


## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-06-16
**Verdict:** Approved

### Notes

Human: "done create or via girhub and merge it into master"

Approved by the project owner; merging PR #99 into `main`.
