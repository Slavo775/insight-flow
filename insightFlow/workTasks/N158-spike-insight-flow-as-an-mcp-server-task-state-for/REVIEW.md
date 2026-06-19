# N158 — SPIKE: insight-flow as an MCP server (task-state for any agent) — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-19
**PR:** (no PR yet)
**Verdict:** APPROVED

## Summary

Research spike — deliverable is a decision doc (`RESEARCH.md`), no production code. Risk: none (zero `packages/` changes; verified `git status -- packages/` empty). The doc answers the question (expose task state/lifecycle as one MCP server), lands a clear **GO**, and proposes a concrete tool surface mapped to existing core functions.

## Checklist verification

- [x] Decision doc written (proposed MCP tool surface + I/O) — pass (`RESEARCH.md` §Proposed tool surface)
- [x] Reuse map: each tool → existing core fn; gaps noted — pass (maps to `resolveId`/`loadTaskById`, `suggestNextSteps`, `setStatus`; notes CLI-wrapped logic may need extraction)
- [x] Transport + auth + scope decided — pass (stdio default, read-mostly; mutations behind opt-in; HTTP later)
- [x] Go/no-go + minimal PoC shape — pass (GO; `insight-flow mcp` stdio, read tools first, mutations opt-in)
- [x] No production code / dependency added — pass
- [x] No changes to existing behavior or tests — pass

## Blockers

None.

## Non-blocking

- The noted gap (some lifecycle logic lives in `cli/commands/*` and would need extraction into `core` so the MCP server doesn't import the CLI layer) should become an explicit sub-item when the follow-up `feat` is scoped.

## Security & edge cases

- Doc correctly defaults to read-mostly and gates mutations — consistent with the tech-agnostic + explicit-consent posture. Auth for the future HTTP transport is flagged as a later concern, appropriately.

## Notes

- N158 is the shared substrate: gates the cleanest integration path for N159 (OpenHands) and N160 (hermes). Recommend it lands before either runtime work.
