# N16 — Generalise agent stack across package managers, git hosts, and languages

**Type:** feat
**Priority:** high
**Created:** 2026-05-22
**Modified:** 2026-05-22

## Problem

The agent role docs + protocol still bake specific technologies into prompts: `npm` / `npx` / `tsc` in `AGENT_PROTOCOL.md`, `gh pr create` in `.claude/commands/task-git.md`, "GitHub PR" narrative in the reviewer/fixer roles, and host-specific curl snippets in `GITHUB_PR_API.md`. This makes the stack unusable in any project that doesn't match TS + pnpm + GitHub.

The original direction (detect-stack at init + substitute via `prompt-build`) is **no longer the chosen approach**. Per the user's direction (2026-05-22):

> please make sure that any of the agent do not tight on any technologie user can extend our agents with thier prompt so no need to have techlogies there please in all agents and files

The chosen approach is: **strip every technology mention from agent prompts entirely.** Project-specific commands (typecheck / lint / test / PR-create / etc.) become the user's responsibility, contributed via the `agents.extend` mechanism shipped in N12 (`taskflow.config.json.agents.extend.<agent>` arrays append into the role docs at init time). insight-flow's own role docs stay technology-agnostic and only describe **orchestration**.

## Goal

1. Strip every literal technology / tool name from `AGENT_PROTOCOL.md`, all 8 role files, `.claude/commands/task-git.md`, and `taskflow.prompt.json`. Replace with technology-agnostic phrasing that delegates to the user's `agents.extend` block.
2. Replace `GITHUB_PR_API.md` (host-specific curl snippets) with `PR_API.md` — a one-paragraph orientation pointing users at the extension contract, plus a small "examples appendix" clearly marked as illustrative.
3. Document the extension contract in `CLAUDE.md`, `README.md`, and `AGENT_PROTOCOL.md`: "insight-flow agents are technology-agnostic. Project-specific commands live in `taskflow.config.json.agents.extend.<agent>` arrays."
4. Remove the `gitTool` field from `taskflow.prompt.json` schema (no longer used).
5. `insight-flow init` does NOT detect the project's stack. It just writes the base config and lets the user populate `agents.extend.*` themselves.
6. Re-review N15 once these changes land — its three blockers will be resolved by deletion, not substitution.

## Scope

### In scope

- **`AGENT_PROTOCOL.md`** — remove `npx tsc --noEmit`, `npm run lint`, `gh pr create`, and any GitHub-specific URLs. Quality-gate step becomes: "run the project's typecheck / lint / test commands (defined in your `agents.extend` block or your project's README)". Git/gh rule line becomes: "PR creation: use your project's PR-create command (defined per project)."
- **`.claude/commands/task-git.md`** — drop `gh pr create` literal command. Keep an "Example: GitHub via `gh` CLI" appendix at the bottom, clearly marked as illustrative.
- **`TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`** — replace "GitHub PR" with "the PR" / "the review surface". Remove `@GITHUB_PR_API.md` reference; replace with `@PR_API.md` (the new technology-agnostic version).
- **`TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_INCIDENT_ROLE.md`** — replace "`npx tsc --noEmit`, `npm run lint`" mentions in workflow with "the project's quality-gate commands as specified in `agents.extend`".
- **Rename + rewrite `GITHUB_PR_API.md` → `PR_API.md`** — drop the curl-for-GitHub snippets from the canonical body. Body becomes: "PR API specifics (creating reviews, fetching comments, replying) are project-specific. Add the commands your stack uses to `taskflow.config.json.agents.extend.task-review` and `agents.extend.task-review-fix`." Append a small examples block: "Example: GitHub (REST API + `gh`)", "Example: GitLab (`glab`)", "Example: Bitbucket / no host CLI" — flagged as illustrative, not canonical.
- **`taskflow.prompt.json` schema** — drop `gitTool: gh`. Keep `strictCLI`, `requireChecklist`, `branchPrefix`. `prompt-build`'s job narrows to enforcement-block patching only.
- **`init`** — no stack detection. Writes base config + scaffolds roles + creates `.claude/commands`. Optional `--examples` flag could write commented-out `agents.extend` stubs for each agent so users have a starting point; default is no detection.
- **`CLAUDE.md` and `README.md`** — add a "Technology agnosticism" / "Extending agents" section pointing users at `agents.extend` with a worked example (showing how to add `pnpm typecheck` for a TS project, `uv run pytest` for a Python project, `glab mr create` for a GitLab project — as user-supplied content, NOT shipped defaults).
- **`packages/taskflow/src/init/index.ts`** — verify the existing `agents.extend` append logic from N12 still works after these changes. No new logic; only doc updates pointing users at it.
- **`packages/taskflow/templates/roles/*.md` + `packages/taskflow/templates/agent-protocol/AGENT_PROTOCOL.md`** (if introduced) — same scrub as the canonical root files, since `init` ships them to consumer projects.
- **Tests**: add `packages/taskflow/test/no-technology-tight.test.mjs` that greps every agent prompt file for forbidden literal-technology strings (`npx`, `npm `, `pnpm `, `yarn `, `bun `, `tsc`, `tsconfig`, `gh pr`, `gh --`, `github.com`, `gitlab.com`, `pyproject`, `requirements.txt`, `pom.xml`, `go.mod`, `Cargo.toml`) and fails if any appear outside an explicitly-marked example block. Update `init.test.mjs` to assert that `init` does NOT write a `stack` field.

### Out of scope

- The `detectStack` machinery from the original N16 spec — discarded entirely (no detection, no substitution).
- The `{{PM}}` / `{{TYPECHECK_CMD}}` / `{{PR_CREATE_CMD}}` placeholder system from the original spec — discarded; no substitution because there are no technology mentions to substitute.
- Per-task `TASK.md` "Verification" sections — those are user-authored, not stack-generated. The taskmaster role already says "Be specific: exact file paths, function names" — so per-task verification commands are correctly the user's responsibility.
- The `taskflow.prompt.json` `gitTool` migration for consumer projects — they delete the key on next `prompt-build --apply` (or it's silently ignored).

## Implementation plan

1. **Scrub `AGENT_PROTOCOL.md`**
   - Line 14 (Quality gates step): replace `npx tsc --noEmit (if TS in scope), npm run lint (if a lint config exists), and the relevant test command` with: `run the project's typecheck, lint, and test commands as defined in your `taskflow.config.json` `agents.extend` block (or skip the step if not defined for your stack)`.
   - Line 34 (Git/gh tool rule): replace `gh pr create for PR creation` with: `PR creation: use the command defined in your `agents.extend.task-git` block. insight-flow does not assume a git host CLI.`
   - Drop the literal `gh pr create` example in the tracker cheat-sheet (it's an insight-flow CLI section, not a project-stack one — verify nothing slipped in here).

2. **Scrub `.claude/commands/task-git.md`**
   - Replace `gh pr create` HEREDOC block with: a generic step ("Open a PR using your project's git host workflow — the exact command is defined in your `agents.extend.task-git` block. If none defined, output the PR's compare URL and prompt the user.").
   - Add an explicitly-marked "Examples appendix" at the bottom with `gh pr create`, `glab mr create`, and compare-URL fallback — clearly flagged as illustrations, not the canonical instruction.

3. **Scrub reviewer + fixer role docs**
   - `TASK_REVIEWER_ROLE.md`: "GitHub PR" → "the PR" / "the review surface". `@GITHUB_PR_API.md` → `@PR_API.md`.
   - `TASK_REVIEW_FIXER_ROLE.md`: same scrub.
   - Workflow steps that say "post review on GitHub" become "post review using the command in your `agents.extend.task-review` block; fall back to writing REVIEW.md only if no command is defined."

4. **Scrub implementer / fixer / incident workflow language**
   - `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_INCIDENT_ROLE.md`: quality-gate references → "run the project's quality-gate commands (per `agents.extend`)".

5. **Rename `GITHUB_PR_API.md` → `PR_API.md`**
   - Body: technology-agnostic orientation + examples appendix.
   - Update every `@GITHUB_PR_API.md` reference in roles to `@PR_API.md`.
   - Delete the old file.

6. **`taskflow.prompt.json` cleanup**
   - Drop `gitTool: gh` from the default config + schema.
   - `prompt-build` no longer reads `gitTool`. Its job narrows to enforcement-block patching only.

7. **`init` adjustment**
   - Remove any detection logic (there wasn't much; mostly just the `gitTool: gh` default carried through). Init writes base config + roles + commands, prints "Done. To make agents stack-aware, add commands to taskflow.config.json `agents.extend.<agent>` arrays. See `CLAUDE.md` for examples."
   - Optional `--examples` flag: write commented-out `agents.extend` stubs to the config so users have a starting template. Default behaviour: no stubs.

8. **Document the extension contract**
   - `CLAUDE.md`: new section "Extending agents with project-specific commands" — explains `agents.extend.<agent>: string[]` schema and shows a worked example for TS, Python, Go projects (as user-supplied content).
   - `README.md`: a paragraph in the "Configuration" section pointing at the same.
   - `AGENT_PROTOCOL.md` footer: "Project-specific commands belong in `agents.extend`. insight-flow itself ships zero stack assumptions."

9. **Tests**
   - `packages/taskflow/test/no-technology-tight.test.mjs` (new): greps every canonical prompt file (`AGENT_PROTOCOL.md`, `TASK_*_ROLE.md`, `TASKMASTER_*_ROLE.md`, `.claude/commands/task-git.md`, `PR_API.md`) for forbidden strings. Fails if any match falls outside a fenced code block immediately preceded by `Example:` or `<!-- example -->`.
   - `packages/taskflow/test/init.test.mjs` update: assert that `init` does NOT write `stack.*` or `gitTool` fields to `taskflow.config.json`.
   - Existing `init.test.mjs` `agents.extend` tests confirm the user-extension mechanism still works.

10. **Re-flow N15**
    - After this lands, re-run `pnpm sync-roles` to push the scrubbed templates.
    - Re-open N15 (currently `merged` as of round-3 approval). Since N15 is already merged, the three blockers it carried (B1/B2/B3) are now resolved on main by this N16 work — no re-review of N15 needed. Note this in N16's REVIEW.md.

## Verification

- `cd packages/taskflow && pnpm typecheck && pnpm build && pnpm test` — green (init + migrate-reviews + scaffold-and-bundle + new no-technology-tight).
- `grep -rE "(\\bnpx |\\bnpm run|\\bpnpm |\\byarn |\\bbun |\\btsc\\b|tsconfig\\.json|\\bgh pr|\\bgh --|gitlab\\.com|github\\.com|pyproject|requirements\\.txt|pom\\.xml|\\bgo\\.mod\\b|Cargo\\.toml)" AGENT_PROTOCOL.md TASK_*_ROLE.md TASKMASTER_*_ROLE.md .claude/commands/task-git.md PR_API.md` returns matches ONLY inside fenced code blocks immediately preceded by `Example:` / `<!-- example -->`.
- `node packages/taskflow/dist/cli.js init --force` in a tmpdir → `taskflow.config.json` has no `stack` field and no `gitTool` field. Stdout reads "Done. To make agents stack-aware, add commands to taskflow.config.json `agents.extend.<agent>` arrays."
- A fixture config with `agents.extend.task-implement: ["Run pnpm typecheck before marking implemented."]` still produces a role file with that line appended (per N12).
- `PR_API.md` exists; `GITHUB_PR_API.md` does not. Every role file that referenced `@GITHUB_PR_API.md` now references `@PR_API.md`.
- N15's three blockers (B1 npm/npx, B2 gh/GitHub, B3 tsc) are gone from canonical role files. Verified by re-grep on main after merge.

## Notes

- This pivot is cleaner than the substitution approach: less code (no `detectStack`, no placeholder substitution), simpler mental model ("agents don't assume tech; users add tech via extensions"), better separation of concerns (insight-flow owns workflow orchestration, the user owns their stack).
- Trade-off: out-of-the-box, the role docs are less actionable for a fresh user. Mitigation: `init --examples` writes commented `agents.extend` stubs; `CLAUDE.md` documents the contract with worked examples for common stacks.
- This makes N12's `agents.extend` mechanism the **canonical** extension point, not a convenience feature.
- N15 was approved + merged in round 3; the three blockers it carried are now closed by deletion in this task, not by re-review of N15.
- Related: N12 (custom agent rules + extensions, the mechanism we lean on here), N14 (token reduction round 1), N15 (role-doc compression).
- Estimated impact: smaller diff than the original N16 spec — most of the work is mechanical text scrubbing across ~12 files, plus one new test, plus 2 doc additions. No new CLI machinery.
