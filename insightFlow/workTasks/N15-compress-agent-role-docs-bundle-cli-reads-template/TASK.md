# N15 — Compress agent role docs + bundle CLI reads + template REVIEW.md

**Type:** rework
**Priority:** medium
**Created:** 2026-05-22

## Problem

N14 cut token consumption substantially but three follow-ups remain:

1. The 8 `TASK_*_ROLE.md` / `TASKMASTER_*_ROLE.md` files still average 80–120 lines each. Roughly half of every role is procedural prose that repeats across roles (when to run the CLI, how to mark status, how to push). The role-specific content (the *what*) is only 30–50 lines per file.
2. Workflow agents (`/task-implement`, `/task-review`, `/task-review-fix`) read `TASK.md` and `CHECKLIST.md` as **two separate `Read` tool calls** after `insight-flow next`/`next-review`. Each Read pays ~150–300 tokens of overhead (path resolution, line-number prefixes, tool result framing) on top of file content. Bundling the spec into the CLI's JSON response eliminates that overhead.
3. `REVIEW.md` is still generated from scratch by reviewer agents — the heading block (`Reviewer`, `PR`, `Verdict`, plus 5 fixed section headings) is regenerated every time, ~100–150 tokens of boilerplate per review.

Hard constraint: compress **without losing output quality**. Compressed roles must produce TASK.md / CHECKLIST.md / REVIEW.md / implementation diffs that are indistinguishable from today's output on the same input.

## Goal

1. Extract a single `AGENT_PROTOCOL.md` containing the procedural steps shared by all 8 roles; each role file shrinks to a 1-paragraph identity + role-specific overrides + a `@AGENT_PROTOCOL.md` reference. Target: each role ≤ 40 lines.
2. Add bundled CLI commands so the agent gets task spec + state in one round-trip:
   - `insight-flow next --with-spec` / `next-review --with-spec` / `next-fix --with-spec` — include `task`, `checklist`, `lastReview` strings inline in JSON output.
   - `insight-flow show --id Nxx --spec` — return `{ summary, task, checklist }` in one call.
3. Scaffold `REVIEW.md` from `packages/taskflow/templates/task/REVIEW.md.tpl` on `review-start`. Re-review rounds append a `## Round N` section using a smaller scaffold; the agent never regenerates headings.
4. Add `insight-flow stats --tokens` to surface `implementation.tokensUsed` trends so the next round of optimization is defensible from data, not estimates.
5. Golden-output regression suite: for each role, lock the structure of its expected output on a fixed-input fixture and assert byte-for-byte equality after the role-doc compression.

## Scope

### In scope

- New file: `AGENT_PROTOCOL.md` at repo root (procedural steps: CLI-only mutations, gh PR workflow, branch naming, status-history conventions, fix-loop flow, conventional commits).
- Trim every `TASK_*_ROLE.md` / `TASKMASTER_*_ROLE.md` to: identity + input contract + output contract + role-specific overrides + `@AGENT_PROTOCOL.md`. Remove anything that's identical across ≥3 roles.
- `packages/taskflow/src/commands/query.ts` (`cmdNext`, `cmdNextReview`, `cmdNextFix`): add `--with-spec` flag that inlines TASK.md + CHECKLIST.md content into the JSON response.
- `packages/taskflow/src/commands/show.ts`: add `--spec` flag that returns `{ summary fields, task, checklist }`. Use existing `loadTaskById` + filesystem read for the two .md files.
- `packages/taskflow/src/cli.ts`: wire the new flags in `parseArgs` and help text.
- `packages/taskflow/templates/task/REVIEW.md.tpl` (new) — Reviewer block + 5 section headings.
- `packages/taskflow/src/commands/review.ts:cmdReviewStart`: scaffold `REVIEW.md` from template on first review; on subsequent reviews append `## Round N — <verdict TBD>` skeleton.
- `packages/taskflow/src/commands/query.ts:cmdStats`: add `--tokens` flag that aggregates `implementation.tokensUsed` per task type and reports min/median/max + trend (most-recent 5 vs all-time average).
- `packages/taskflow/test/`: add `bundle-reads.test.mjs` for the `--with-spec` / `--spec` JSON shape, and `role-output-golden.test.mjs` that drives each role's role-specific overrides through a fixed-input fixture and diffs the produced files against `test/fixtures/golden/<role>/`.

### Out of scope

- Caching at the CLI process level — confirmed not a token-saver after the implementer-fixer analysis; deferred indefinitely.
- Modifying the dashboard or server endpoints (`hydrateShardJson` already does the equivalent for HTTP consumers).
- CLI version bump — schedule for the next release task.
- Touching `changesAfterImplementation` (kept inline on Task per N14).
- Compressing `task-git.md` — already trimmed in N14; further compression risks losing the `gh pr create` HEREDOC clarity.

## Implementation plan

1. **Extract `AGENT_PROTOCOL.md`**
   - Read all 8 role files, identify shared procedural blocks (every role that mentions "Mark started via insight-flow status-start", "Push via /task-git", "Verify checklist before marking implemented"). Move shared lines verbatim into `AGENT_PROTOCOL.md` as a numbered protocol.
   - Each role file then: 1-paragraph identity (3 lines), `@AGENT_PROTOCOL.md` reference, "Role-specific overrides" section (what differs from the protocol). Keep `INPUT CONTRACT` + `OUTPUT CONTRACT` per role.
   - Update `packages/taskflow/src/commands/prompt-build.ts:ROLE_FILES` and `scripts/sync-role-templates.mjs:ROLE_FILES` to also include `AGENT_PROTOCOL.md` so it ships with the package.

2. **Bundle reads: `--with-spec` flag**
   - In `query.ts`, factor out `loadSpec(folder)` → `{ task: string | null, checklist: string | null }` that reads the two .md files from the task folder (graceful if missing).
   - Add an optional `--with-spec` arg to `cmdNext` / `cmdNextReview` / `cmdNextFix`. When present, include `task` and `checklist` keys in the JSON output.
   - Token impact: replaces 2 separate `Read` tool calls with one CLI call (saves ~300 tokens of tool-overhead per task pick).

3. **Bundle reads: `show --spec`**
   - In `show.ts`, when `opts.spec` is truthy, also include `task` + `checklist` strings (same `loadSpec` helper).
   - Composes with `--summary`: `show --id Nxx --summary --spec` returns lean summary + spec content.

4. **REVIEW.md template**
   - Add `packages/taskflow/templates/task/REVIEW.md.tpl` with the canonical heading block + 5 section headings (Summary / Checklist verification / Blockers / Non-blocking / Notes), all empty.
   - In `review.ts:cmdReviewStart`: if `<folder>/REVIEW.md` does not exist, scaffold from the template with `{{ID}}` / `{{TITLE}}` substitution. If it exists (re-review), append a `## Round <N+1>` block where N is the existing round count (count `## Round` headings, default 1 if the file has no round headings — meaning round 1 was written as the un-numbered initial block).
   - Update `TASK_REVIEWER_ROLE.md` / `TASK_HUMAN_REVIEW_ROLE.md` to say "Edit the scaffolded REVIEW.md sections — do not write headings from scratch."

5. **Token measurement: `stats --tokens`**
   - Extend `cmdStats` with an `opts.tokens` branch that filters tasks where `implementation.tokensUsed != null`, groups by `task.type` and `task.priority`, and reports `{ count, min, median, p90, max, last5Avg, allTimeAvg }`.
   - Output stays pretty-printed (consistent with the existing `stats` behavior — this is human-facing).

6. **Golden-output regression suite**
   - Add `packages/taskflow/test/fixtures/golden/<role>/` with `input.json` (task spec + expected agent inputs) and `expected/{TASK.md,CHECKLIST.md,REVIEW.md}` capture files. The fixtures encode "what good output looks like" from the *uncompressed* roles before the compression lands.
   - Add `packages/taskflow/test/role-output-golden.test.mjs` that, for each role, simulates the role's deterministic file-writing steps (not the LLM reasoning) and diffs the produced files against `expected/`. Failures block the PR.
   - The harness mocks LLM reasoning by reading a `roleResponse.json` per fixture; the test verifies the role's *plumbing* (which files get created/touched, with what scaffold content) — not its judgment.

7. **Validate output quality**
   - Run `/taskmaster`, `/task-implement`, `/task-review` against a throwaway N99 task in a copy of the repo using the trimmed role docs. Diff the produced `TASK.md` / `CHECKLIST.md` / `REVIEW.md` against the equivalents produced by the uncompressed roles on the same input. They must be structurally identical and substantively equivalent (the *intent* of every section preserved).
   - Acceptable diffs: phrasing variation, wording style. Unacceptable diffs: missing sections, missing checklist items, dropped quality gates, missed blockers.

## Verification

- `cd packages/taskflow && pnpm typecheck && pnpm build && pnpm test` — green (init + migrate-reviews + bundle-reads + role-output-golden).
- After compression: `wc -l TASK_*_ROLE.md TASKMASTER_*_ROLE.md` reports ≤ 40 lines per file; `AGENT_PROTOCOL.md` exists and is referenced by all 8 roles via `@`.
- `node packages/taskflow/dist/cli.js next --with-spec` returns JSON containing both `task` (TASK.md contents) and `checklist` (CHECKLIST.md contents) inline.
- `node packages/taskflow/dist/cli.js show --id N14 --summary --spec` returns combined summary + spec content in one call.
- `node packages/taskflow/dist/cli.js review-start --id <some-task>` produces a scaffolded `REVIEW.md` with the heading block pre-filled; re-running on a task with an existing `REVIEW.md` appends `## Round N` instead of overwriting.
- `node packages/taskflow/dist/cli.js stats --tokens` reports per-type token usage trends; pretty-printed.
- Quality-equivalence dry run: produce TASK.md / CHECKLIST.md / REVIEW.md for one throwaway task with the **compressed** roles and one with the **uncompressed** roles (git stash). Diff — every section heading and every checklist item present in both. No regression in quality flagged by the human reviewer.

## Notes

- Token-saving estimate (conservative): role-doc compression saves ~400–600 tokens per slash-command invocation × ~5 invocations per task lifecycle ≈ 2.5k tokens per task. `--with-spec` bundling saves ~300 tokens × 3 read-bundled commands per lifecycle ≈ 1k tokens. REVIEW.md template saves ~150 tokens × 2 reviews ≈ 300 tokens. Total: **~4k tokens per task lifecycle**, with measurement (`stats --tokens`) baked in to verify.
- Quality risk: the golden-output suite + the dry-run comparison are the safety net. If either flags a regression, treat as a blocker — do not trade quality for tokens.
- The earlier "cache `next` decisions" idea (from the review's open follow-ups) is **dropped here as misguided**: CLI-internal caching doesn't save LLM tokens because the agent only consumes the CLI's stdout, not its internal file I/O. The bundling approach (`--with-spec`) is the correct framing of that intent.
- Related: N14 (token-savings round 1 — JSON compaction, side files, dashboard pivot). N15 builds on the templating + CLI surface that N14 established.
- Plan source: this task TASK.md (no separate plan file).
