# N15 — Compress agent role docs + bundle CLI reads + template REVIEW.md — Review

**PR:** https://github.com/Slavo775/insight-flow/pull/9

## Human Review

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** FIX NEEDED

The human's feedback verbatim:

> I see there a couple things the specs says use npm … but if project do not use npm but yarn or pnpm? We should have in config or init what package manager will be use also use gh but if user do not have gh? Or use gitlab? This things we need to check in every file and change it on generic also this is tight on typescript if I install it into python code? Java code? Or some other code?

The compression pass was scoped to "tighten what's already here" but didn't address that the *existing* stack assumes a single environment (TypeScript + pnpm + GitHub). When `insight-flow` is installed into a project that uses a different package manager, a different git host, or a different language, the agent prompts will issue commands that don't apply. Three discrete blockers below.

### Blockers

- **Hardcoded package manager (`npm` / `npx`)** — many roles and the protocol still emit `npx tsc --noEmit`, `npm run lint`, `npm run test`. Affects: `AGENT_PROTOCOL.md` (workflow step 6 + quality bar), `TASK_IMPLEMENTER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `TASK_INCIDENT_ROLE.md`, plus every existing TASK.md "Verification" section. **Fix:** add a `packageManager: npm | pnpm | yarn | bun | none` field to `taskflow.config.json` (set by `insight-flow init` after detecting `package-lock.json` / `pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` / none), then use it in `prompt-build` to substitute the command prefix in role docs and `AGENT_PROTOCOL.md`. Roles should reference `{{PM}} run typecheck` / `{{PM}} run lint` / `{{PM}} test` rather than literal `npx` / `npm`.

- **Hardcoded git host (`gh pr create`)** — `AGENT_PROTOCOL.md`, `TASK_REVIEWER_ROLE.md`, `TASK_REVIEW_FIXER_ROLE.md`, `.claude/commands/task-git.md`, and `taskflow.prompt.json` (`gitTool: gh`) all assume GitHub + the `gh` CLI is installed. **Fix:** extend `taskflow.prompt.json` schema to support `gitHost: github | gitlab | bitbucket | none` and `gitTool: gh | glab | git`. When `glab` is selected, generate `glab mr create` instead. When `gitTool: git`, generate a compare URL (the path we removed in N14 needs to come back as the explicit "no CLI" branch, not as a fallback). `@GITHUB_PR_API.md` is also misnamed — should be the host-specific snippet selected at init time.

- **Hardcoded language (TypeScript)** — quality gates everywhere assume `npx tsc --noEmit`. Python / Go / Java / Rust projects would never typecheck this way. Affects: `AGENT_PROTOCOL.md` step 6, every role file's quality-bar reference, every TASK.md `## Verification` section. **Fix:** add a `language: typescript | python | java | go | rust | mixed | none` field to `taskflow.config.json` (set by `insight-flow init` after detecting `tsconfig.json` / `pyproject.toml` / `pom.xml` / `go.mod` / `Cargo.toml`); store the corresponding `typecheck` / `lint` / `test` command triple in config; `prompt-build` substitutes those into role docs. Examples:
  - TS + pnpm: `pnpm typecheck`, `pnpm lint`, `pnpm test`
  - Python + uv: `uv run mypy .`, `uv run ruff check`, `uv run pytest`
  - Go: `go vet ./...`, `golangci-lint run`, `go test ./...`
  - Java + Maven: `mvn compile`, `mvn checkstyle:check`, `mvn test`

### Suggestions (non-blocking)

- Implementer's note in N15's report mentioned "manual quality-equivalence dry run deferred to review time" — that dry run is unchanged by these blockers, but it should happen on the generalised roles, not the current TS-pnpm-GitHub-tight ones, otherwise we'd just re-do it.
- Consider whether `AGENT_PROTOCOL.md` should also become a template (with `{{PM}}` / `{{GIT_TOOL}}` / `{{LANG}}` placeholders) shipped by `insight-flow init` rather than a hand-edited file at repo root. That way every consumer project ends up with a protocol tuned to their stack, not the insight-flow repo's.

### Notes

- These gaps existed before N15 too (N14 also assumed npm/gh/TypeScript). N15 made them more visible by consolidating procedural text — that's the value of the compression, even if the underlying generalisation work is now more urgent.
- All three blockers share the same shape: detect the project environment at `insight-flow init`, store it in `taskflow.config.json`, and substitute it through `prompt-build`. A single PR could address all three.
- Suggested follow-up task title: **N16 — Generalise agent stack across package managers, git hosts, and languages**.

---

(The AI review of N15 hasn't happened yet — when one is added later, append below this section as `## Round 2` per the new template flow.)


---

## Round 2 — AI Review

**Reviewer:** Task Reviewer (ai)
**Date:** 2026-05-22
**Verdict:** FIX NEEDED (agrees with human review round 1)

### Summary

PR #9 ships the four scoped wins (role-doc compression, CLI read bundling via `--with-spec` / `--spec`, REVIEW.md scaffolding, `stats --tokens`) cleanly. Tests green (12/12). The diff is honest: −1261 / +992, every role ≤ 40 lines, `AGENT_PROTOCOL.md` referenced by all 8 roles. As a delta, this is solid work.

However, I am confirming the human's verdict of **fix-needed** for the three generalisation blockers. The fix lives in N16, which has been opened on a separate branch (`feat/N16-...`). N15 should remain `fix-needed` until N16 lands and N15's protocol/role docs pick up the substituted commands.

Risk assessment: **low for this delta in isolation**, **medium for shipping it as-is to other-stack consumers** (which is exactly what the human flagged).

### Blocker verification

All three human-flagged blockers reproduced from current code on this branch.

- **B1 (hardcoded `npm` / `npx`)** — confirmed at `AGENT_PROTOCOL.md:14`:
  > 6. **Quality gates** — run `npx tsc --noEmit` (if TS in scope), `npm run lint` (if a lint config exists), …

  Single occurrence after compression (the consolidation actually *helped* — there used to be 4+ identical references across roles). Fix is genuinely a one-line substitution in the protocol file once N16's `prompt-build` substitution lands.

- **B2 (hardcoded `gh` / GitHub)** — confirmed at 7 sites:
  - `AGENT_PROTOCOL.md:34` (`gh pr create` for PR creation)
  - `.claude/commands/task-git.md:22, 51, 53, 64` (multiple `gh pr create` / `gh pr view` invocations)
  - `TASK_REVIEWER_ROLE.md:3, 16` and `TASK_REVIEW_FIXER_ROLE.md:3, 11, 16, 23` (narrative "GitHub PR" references — fine to keep narrative, but the *commands* need placeholders)

  Wider blast radius than B1. N16's `{{PR_CREATE_CMD}}` + the `PR_API.md` host-variant approach is the right shape.

- **B3 (hardcoded TypeScript — `tsc`)** — confirmed at `AGENT_PROTOCOL.md:14` (same line as B1). Single occurrence; fixes alongside B1 with `{{TYPECHECK_CMD}}`.

### Non-blocking verification

Two minor inconsistencies the human didn't catch, worth fixing inside N16 (cheap) but not blocking on their own:

1. **`scaffoldReviewMd` Round-N section names diverge from the Round-1 template.** The template (`packages/taskflow/templates/task/REVIEW.md.tpl`) has `Summary` · `Checklist verification` · `Blockers` · `Non-blocking` · `Security & edge cases` · `Notes`. The Round-N append in `packages/taskflow/src/spec.ts:scaffoldReviewMd` writes `Summary` · `Blocker verification` · `Non-blocking verification` · `Notes`. Different shape between rounds makes downstream `grep`-by-section brittle. **Fix:** keep section names identical across rounds (Round-N is a re-review of prior findings, but the heading structure should match). Optionally add an explicit `## Verdict` heading per round.

2. **`TASK_REVIEWER_ROLE.md:24` claims mandatory REVIEW.md structure includes "Security & edge cases" + "Next actions", but the new template ships "Security & edge cases" + "Notes" (no "Next actions").** Either add `## Next actions` to the template or update the role doc to drop the mention. Currently spec and implementation disagree by one heading.

### Notes

- The compression is *good for solving the generalisation problem later*: B1 + B3 went from ~4 hit sites pre-N15 to 1 hit site post-N15. N16's substitution work has less surface area thanks to this consolidation.
- The "manual quality-equivalence dry run" CHECKLIST item was deferred from N15 to N16 by the implementer's report. Confirmed appropriate — running it against the *generalised* roles (post-N16) is the right place to do it.
- The implementer's substitution of `role-output-golden.test.mjs` (with mocked-LLM fixtures, originally scoped) for the simpler `scaffold-and-bundle.test.mjs` is **accepted** — the new tests cover the load-bearing deterministic plumbing, and the mocked-LLM harness was over-engineered. Flagging here so the deviation is on the record.
- Recommend: keep N15 at `fix-needed`. After N16 lands and the substitution runs against this repo, do a final pass on N15 (verify B1/B2/B3 are byte-resolved, fix the two Non-blocking items above), then approve.


---

## Round 3 — pending verdict

**Reviewer:** Human (Project Owner)
**Date:** 2026-05-22
**Verdict:** APPROVED

The human's feedback verbatim:

> approved we can merge this and checkout to N16

### Summary

Round-3 human approval after the non-blocking fixes from round-2 AI review landed. The three generalisation blockers (B1 npm/npx, B2 gh/GitHub, B3 TypeScript tsc) are explicitly out of scope for this PR and are addressed by N16 (feat/N16-...). N15 is approved as the role-doc compression + read-bundling + REVIEW template work; N16 will pick up the substitution machinery.

### Checklist verification

- [x] All previously-flagged non-blocking inconsistencies resolved in commit `ca23044` (Round-N scaffold section names; TASK_REVIEWER_ROLE.md mandatory-structure line).
- [x] N15 CHECKLIST.md done criteria + quality gates ticked.
- [x] Tests 12/12 green on branch tip.

### Blockers

None.

### Non-blocking

The three generalisation blockers (B1-B3) remain in code as confirmed by round-2 AI review. They are deliberately left in place here — N16 owns the fix.

### Notes

- User instruction was clear: "approved we can merge this and checkout to N16". Recording verdict + proceeding with merge per the next /task-git invocation.
- Going forward N15's changes (AGENT_PROTOCOL.md, compressed roles, REVIEW.md template, --with-spec / --spec, stats --tokens) will be on main, which is where N16's substitution work needs them.
