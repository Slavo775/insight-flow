# N271 — Full codebase audit — security, data safety, antipatterns, fragile code → fix tasks — Analysis

**Created:** 2026-10-19
**Author:** task-analyze (Claude Opus 5.5)

## Problem framing

- The human asked for a whole-project analysis — security issues, antipatterns, code "on the edge of working", and enhancements — with the outcome being tasks, and wants **Fable** to do the audit (as analyzer/implementer), not the analyze session.
- The analyze session first misread this and ran its own read-only audit (6 parallel area agents). The human corrected: Fable should audit. Rather than throw that work away, it becomes `AUDIT-SEED.md` — a second opinion Fable verifies, not a result Fable inherits.
- Root need: no whole-codebase security/correctness audit has been done (N253–N256 only removed dead code and duplication), there is no CI test gate, and the tool runs local HTTP servers plus hooks on every agent tool call — a large attack and data-loss surface.

## Goal

- A verified `AUDIT.md` (Fable's own findings + a verdict on every seed claim).
- A human-approved list of fix tasks, each small enough for one analyze → implement run, created only after an explicit "create it".

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — Audit task for Fable **+ seed findings** to verify | Reuses verified work; Fable checks each claim and goes deeper where the seed is thin; fewer missed issues | Seed may bias Fable toward the same areas | Medium |
| B — Blind audit task for Fable (no seed) | Fully independent result; good for comparing models | Duplicates ~1.4M tokens of already-done work; same issues found twice | High |
| C — Use the seed as-is, create 14 fix tasks now | Fastest | Not what the human wanted (Fable should audit); unverified claims become tasks | Low |
| D — One umbrella "audit + fix everything" task | One run | Far too big for one implementer run; unreviewable diff | High |

## Decision

- Chosen option: **A**.
- Rationale: the human picked it. It keeps Fable as the auditor while not wasting the seed; the "claims to verify" framing plus a mandatory per-claim verdict table limits bias. Fixes are split into many small tasks because one task for ~29k LOC would not fit one implement run and could not be reviewed.

**Seed headline findings (to verify, highest first):**
1. Dashboard (:6006) write routes have no Origin/CSRF check and send `Access-Control-Allow-Origin: *` → a web page can POST a hook module and install it into `.claude/settings.json` (code execution next session). Both servers `listen(port)` with no host → LAN exposed.
2. Hub proxy `new URL(rest, base)` with `rest = //127.0.0.1:<port>/…` → open proxy to any loopback port, incl. the hub itself.
3. Task storage: no lock, no atomic writes; `ensureShardExists` can overwrite a shard with an empty one; `events.json` wiped on a parse failure.
4. Untrusted data → code: `javascript:` `mrUrl` link, `events.hooks` from repo config run via `sh -c`, composer MCP installs hooks without a human gate.
5. Consumer slash commands are short summaries — `AGENT_SECURITY` and git push permissions never reach the agent.
6. No CI runs tests/lint/typecheck; publish doesn't run tests.

**Locked decisions (human, 2026-10-19):** require `--id` on state-changing CLI commands (reads keep fallback) · bind 127.0.0.1 by default, LAN opt-in via `INSIGHT_FLOW_TRUSTED_HOSTS`, no pairing token now · consumer slash commands `@`-include full role files · storage/CLI fix tasks wait for N267 · fix work split into focused tasks (seed proposed 14).

## Open questions

- [non-blocking] Restore the 0-byte mp3s from `0d3ff5f` vs remove the sound feature — default restore; challenge with a reason.
- [non-blocking] Should the ~210 git-tracked per-task `events.json` files be untracked? Default: keep tracked, out of scope.
- [non-blocking] `engines.node >=18` — raise to `>=20` or add a Node 18 CI job?
- [non-blocking] Pairing token for LAN mode — note as a future task if Fable thinks it should exist.
- [blocking for step 8 only] Human must say "create it" for the fix-task list.

## Sources

- `AUDIT-SEED.md` (this folder) — provenance: analyzer-discovered (Opus 5.5 read-only audit of this repo), trust: medium, fetched: 2026-10-19.
- No external URLs were used.

## Handoff brief

Title: Full codebase audit — security, data safety, antipatterns, fragile code → fix tasks
Type: chore. Priority: high. Tags: audit, security, quality.

Scope: An auditor agent (run with Fable) audits the whole of packages/taskflow (core, cli, dashboard server+client, master server+client, mcp, agents/init/hooks), .github/workflows, root role files, and build/test/dependency setup. It reads AUDIT-SEED.md in the task folder (a prior Opus 5.5 audit, 2026-10-19, ~120 findings grouped T1–T14) as CLAIMS TO VERIFY, not facts: marks each kept/rejected with reason + file:line, adds its own findings, and writes AUDIT.md (severity, category security|antipattern|fragile|enhancement, file:line, scenario, fix). Then it proposes a fix-task list (each sized for one analyze→implement run, with dependencies/order) and WAITS for the human's explicit "create it" before calling /taskmaster. This task changes no source code.

Locked decisions (carry into fix tasks, don't re-ask): state-changing CLI commands require --id (read commands show/current keep current-task fallback); both servers bind 127.0.0.1 by default, LAN stays opt-in via INSIGHT_FLOW_TRUSTED_HOSTS, no pairing token now; consumer slash commands @-include full role files (`@.claude/roles/<ROLE>.md` + $ARGUMENTS); fix tasks touching core storage/CLI wait until N267 is merged.

Done when: AUDIT.md exists; every seed finding marked kept/rejected; human approved the fix-task list; fix tasks created.
