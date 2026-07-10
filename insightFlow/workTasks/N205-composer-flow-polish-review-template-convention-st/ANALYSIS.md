# N205 — Composer flow polish — review-template convention, status display names, hooks in install validation — Analysis

**Created:** 2026-07-09
**Author:** task-analyze

## Problem framing

A `/task-analyze` audit of the composer (authoring) flow against the human's full requirements list found the flow ~complete after N200–N204, with **three small residual gaps**. None is structural — they are prompt/definition/title edits. Root cause: each is a detail that the earlier tasks did not explicitly cover.

1. **No review-template convention.** `COMPOSER_RULES` has a "Taskmasters are templated by default" rule (custom taskmasters use insight-flow's `TASK.md`/`CHECKLIST.md` templates), but no equivalent for **reviewers**. The human's requirement — *"Any other taskmasters from custom flows needs to use the templates … same for review"* — is only half-met.
2. **Status display names.** The human's flow diagram names statuses **"ready to implement"** and **"ready to install."** The flow uses ids `ready` and `approved`, whose titles are also just `"ready"` / `"approved"`.
3. **Install validation omits hooks.** The human wants post-install validation to catch *"agent md not created, hook not installed or wrong, command not installed or wrong."* The N204 validate step checks `.claude/commands`, `.claude/agents`, and `.mcp.json` + a smoke run — but not **hooks**, and it phrases the checks as "present" rather than "present and correct."

## Goal

1. Add a **review-template convention** to `COMPOSER_RULES` (custom reviewers write `REVIEW.md` from the shared template), reaching all authoring agents via `composer-authoring-conventions`.
2. Give the two statuses friendly **display titles** — `ready` → "ready to implement", `approved` → "ready to install" — **ids unchanged**.
3. Add **hooks** to the installer's post-install validation and require artifacts to be **correct, not just present**.

## Options considered

| Option | Pros | Cons | Effort |
|--------|------|------|--------|
| A — One small polish task doing all three as prompt/definition/title edits | Cheap; no CLI/flow-graph/agent changes; closes the audit gaps | Bundles three unrelated-ish tweaks | Low |
| B — Three separate tasks | Cleaner isolation | Overhead for three tiny edits | Low×3 |
| C — Rename status **ids** (`ready`→`ready-to-implement`, `approved`→`ready-to-install`) | Ids match the names literally | Breaks the CLI's verdict=status model (`create` writes `ready`; `review-end --verdict approved` writes `approved`) — would need a flow-aware CLI change like N203's `ai-approved`. Higher risk, out of proportion | Medium-High |

## Decision

- **Chosen option: A** (confirmed with the human, who selected all three gaps). One small task.
- **Status names use `title`, not `id`** (rejecting option C's id-rename): statuses carry a separate `title` field, so setting `title` gives the board labels the human wants with **zero** risk to the CLI/flow logic — `create`/`review-end --verdict approved` keep writing the `ready`/`approved` ids, and the N203 `ai-approved` divert is untouched.
- Rationale: all three are requirement/clarity gaps closable with prompt + title edits; no CLI, no flow graph, no new agents. Consistent with keeping built-in behaviour upgrade-safe.

## Open questions

- `[non-blocking]` The review-template convention should read like the existing taskmaster one and not contradict N203's "review writes REVIEW.md from the template" wording already in `authoring-review/identity` — it generalises that to *any custom reviewer*.
- `[non-blocking]` For gap C (hooks), the install plan already enumerates hooks (`flow-install.ts` collects `mcp`/`hook`/`skill`/`command`/`subagent`), so validation just needs to name them; no execution change.

## Sources

- None — self-contained. Grounded in this repo's source: `composer-conventions.ts` (`COMPOSER_RULES`), `project/authoring.json` (statuses), `modules/roles/authoring.json` (`composer-install-checklist` + `authoring-install/identity`), and the prior `/task-analyze` audit in this session.

## Handoff brief

Title: *Composer flow polish — review-template convention, status display names, hooks in install validation*. Type: feat. Priority: medium. Tags: authoring, composer. Scope: Three small composer-flow edits — (A) add a "reviewers are templated by default (write REVIEW.md from the shared template)" bullet to `COMPOSER_RULES`; (B) set status `title`s `ready`→"ready to implement" and `approved`→"ready to install" (ids unchanged); (C) add hooks to the installer's post-install validation and require artifacts correct-not-just-present. No CLI/flow-graph/agent changes. Update docs/tests as needed; merge into `agents-approved`.
