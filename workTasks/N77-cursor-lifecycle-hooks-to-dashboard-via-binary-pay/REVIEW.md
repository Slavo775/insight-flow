# N77 — Cursor lifecycle hooks to dashboard via binary payload parsing — Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-06-02
**PR:** https://github.com/Slavo775/insight-flow/pull/53
**Verdict:** approved

## Summary

Phase-2 Cursor live integration. Hook payload parsing moved into the binary (`hook-parse.ts`: Cursor event-name → derived type + stdin normalization); the `hook` subcommand grew a `--provider cursor` branch that reads stdin, maps the event, and tags `provider: cursor`. `statusFromEvent` learns Cursor's raw `stop`/`subagentStop`/`sessionEnd`. A new `cursor-hooks.ts` generates `.cursor/hooks.json` (v1) + thin scripts (event logger, stop+notify, approval gate) via a new optional `writeHooks` provider step. Reviewed the full diff (12 files) + ran all paths. **Low-moderate risk** — additive (new files + a provider-gated branch); Claude's `hook`/hooks untouched; the moderate-risk surface is the bash scripts (editor-runtime, not unit-testable) and the volume of tool events. Built on N76's `provider` id (merged into this branch).

## Checklist verification

- [x] `insight-flow hook <event> --provider cursor` parses stdin (conversation_id, tool/command) + maps event names — pass (`hook-parse.ts`, `cli.ts`; tested incl. piped-stdin CLI test)
- [x] `statusFromEvent` maps Cursor names (`stop`→done); Claude unchanged — pass (test)
- [x] `init --editor cursor` generates `.cursor/hooks.json` (v1) + scripts via `writeHooks` provider step — pass (test asserts json + 3 scripts)
- [x] Cursor `stop` notify hook reuses `insight-flow notify` + `/api/agent-done` — pass (in `insight-flow-stop.sh`)
- [x] Approval gate (`beforeShellExecution`) emits `approval-required` + returns `ask` on a conservative matcher; never auto-`allow` — pass (allows by default = fail-open, never denies)
- [x] Cursor events surface in the N76 unified feed with the cursor badge — pass (events tagged `provider: cursor` → badge)
- [x] `--editor claude` + Claude hooks unchanged — pass (cursor branch is provider-gated; RAW_TO_DERIVED path intact)
- [x] Parity caveats documented in README — pass (cloud agents; synthesized approval)

Quality gates: `tsc --noEmit` clean; full suite **13 files `# fail 0`** (incl. new `cursor-hooks.test.mjs`, 5 tests; fixed the N76 `hook` test).

## Non-blocking

**Resolution (post-review, applied to the uncommitted implementation at the user's request — no fix-needed lifecycle since the review approved):**

- ✅ **#1 fixed** — `insight-flow-event.sh` now passes extra args through, and `.cursor/hooks.json` gates tool events (`preToolUse`/`postToolUse`/`afterFileEdit`/`subagentStop`) with `--if-active`, mirroring Claude. Milestones (`sessionStart`/`sessionEnd`/`beforeSubmitPrompt`/`stop`) still always log. Test asserts the gating.
- ✅ **#2 fixed** — the approval gate's command extraction is now whitespace-tolerant (`grep -oE '"command"[[:space:]]*:[[:space:]]*"…"'`), so both compact and pretty-printed Cursor payloads match. (Still fail-open if the key is named differently — verify against a live payload.)
- ✅ **#3 fixed** — the `hook` cursor branch reads stdin only when `fstatSync(0)` is a FIFO/socket/file (all reach EOF), never a tty. (Initial `isFIFO()||isFile()` was too strict — macOS stdio pipes are sockets; added `isSocket()`.)
- ⚠️ **#4 unchanged** — bash scripts remain generation-tested only; runtime behavior is editor/OS-dependent and not exercisable in this repo's CI. Acknowledged, not actionable here.

Full suite after fixes: 13 files `# fail 0`.

---

_Original findings (for the record):_

1. **Cursor tool events aren't gated (volume).** The Claude lifecycle hooks gate tool events with `--if-active` (only log while an insight-flow skill is active); `insight-flow-event.sh` logs **every** `preToolUse`/`postToolUse` unconditionally + POSTs each. Busy Cursor sessions could flood the activity log / `/log/events` (the dashboard feed itself is capped at 200). Consider gating or a verbosity knob (`taskflow.config.json`) in a follow-up.
2. **Approval-gate matcher assumes a flat `"command"` JSON key.** `insight-flow-approval.sh` greps `"command":"…"` from the `beforeShellExecution` payload. The exact Cursor field name wasn't verified against a live payload (docs fetched as data in N75). If Cursor nests/renames it, the matcher silently **fails open** (allows + logs `tool-requested`) — safe, but gating would no-op. Verify against a real Cursor `beforeShellExecution` payload.
3. **`readFileSync(0)` can block** if `insight-flow hook … --provider cursor` is run in a non-TTY context with no piped EOF. Fine for real hooks (Cursor pipes JSON + closes), and Cursor's per-hook timeout bounds it, but it's a latent hang outside that path.
4. **Bash scripts unit-tested only by generation** (string assertions). The gate/notify runtime behavior depends on Cursor + OS and isn't exercised in CI — inherent to shell hooks.

## Security & edge cases

- `parseCursorStdin` is fail-soft (bad JSON → empty data); the cursor `hook` branch swallows stdin-read errors so a malformed payload never breaks the hook.
- Approval gate **never auto-denies** — worst case is fail-open (allow), matching Cursor's default permissiveness; it only ever *adds* a prompt.
- `provider: cursor` flows through N76's optional-and-back-compat plumbing; no impact on Claude events.

## Notes

- Depends on **N76** (provider id), merged into this branch. PR #53 base is `feat/N76`; after #52 merges, retarget #53 → `main`.
- Design of record: this folder's `ANALYSIS.md` + N75's "Phase-2 design — approval → sound + push".
- Follow-up candidates: tool-event gating (#1), verify the Cursor shell payload key (#2), make the sensitive-command matcher configurable.


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

Approved for merge into `main` via PR #53 (stacked on N76/#52).
