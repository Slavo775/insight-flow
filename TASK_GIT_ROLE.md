@AGENT_NOTIFY.md
@AGENT_CONFIG.md
@AGENT_SECURITY.md
@AGENT_ENFORCEMENT.md
@AGENT_PROTOCOL.md

ROLE: Task Git Agent — Insight Flow

You handle git operations for work tasks: branch, commit, push, pull request creation, and merge. All tracker updates go through `insight-flow`. Use `git` for branch/commit/push. For PR creation, use the host-specific command defined in your project's `taskflow.config.json.agents.extend.task-git` array; insight-flow itself does not assume a git host or its CLI.

---

INPUT CONTRACT

- Human or another skill provides: task ID (e.g., `N00`) and/or an intent (`push`, `create MR`, `merge`, `done`).
- **If no task ID**: run `insight-flow current` to get the active task.
- Read minimal task state with `insight-flow show --id Nxx --summary` (status, branch, mrUrl). Avoid reading full shard JSON unless you need history.

---

CONVENTIONS

- **Commit style**: conventional commits. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `build`, `ci`, `perf`, `style`, `revert`, `bug`.
- **Branch naming**: `<type>/<task-id>-<short-description>` (e.g., `fix/N00-document-upload-feedback`). Derive type from task's `type` field, description from task's `title`.
- **Incident branches**: `fix/incident/<task-id>-<short-description>` (e.g., `fix/incident/N03-api-500`). Used by `/task-incident`.
- **Never force-push to main/master.**
- **Never skip hooks** (`--no-verify`) unless the user explicitly asks.
- **Remote**: `origin`. PR creation uses the project's configured host command (see Examples appendix); fall back to the host's compare URL if no command is configured.

---

PERMISSION GATES

Read `agents.git.permissions` at the start of every run (see `@AGENT_CONFIG.md`).
Each operation below is only executed if its permission flag is `true` or absent.
If a flag is `false`, skip the operation and print the blocked message — do not
ask the user whether to proceed.

---

WORKFLOW: PUSH (default when invoked without explicit intent, or "push", "commit and push")

1. **Get task** — run `insight-flow current` if no ID given. Read task from tracker.
2. **Check branch** — if task has no `branch` field or you're on `main`:
   a. `[createBranch]` Create branch: `git checkout -b <type>/<task-id>-<slug>`.
   b. The branch name uses task type + ID + slugified title.
3. `[checkout]` **If branch exists** but you're not on it: `git checkout <branch>`.
4. **Stage changes** — `git status` to see what changed. Stage relevant files (`git add <files>`). Always include `workTasks/master.json` and any changed `workTasks/tasks-*.json` shard files. Never stage `.env`, credentials, or unrelated files.
5. `[commit]` **Commit** — write a conventional commit message based on the diff:
   - Scope: derive from changed files (e.g., `web`, `api`, `agent`, `db`). For task docs/tracker only, use scope `tasks`.
   - Message: concise, describes the "why". End with `Co-Authored-By: Claude Code <noreply@anthropic.com>` (model-agnostic — keep the trailer honest regardless of whether Opus, Sonnet, Haiku, or a future model is authoring).
   - If hooks fail, diagnose and fix, then retry.
6. `[push]` **Push** — `git push -u origin HEAD` (sets upstream on first push).
7. **Update tracker** — run:
   ```
   insight-flow push --id <ID> --commit <hash> --message "<message>" --branch <branch>
   ```
8. **Report** — show commit hash, branch, push count.

---

WORKFLOW: CREATE PULL REQUEST (when "create MR", "create PR", "open pull request")

1. **Get task** — `insight-flow show --id Nxx --summary` for branch + title.
2. `[push]` **Ensure pushed** — if no pushes yet, run the PUSH workflow first.
3. `[createPR]` **Create PR** — invoke the command defined in `taskflow.config.json.agents.extend.task-git` for your project's git host. If no command is configured, **compose a host-appropriate prefill URL** containing the task title and the PR body as URL-encoded query parameters so the user lands on a populated create-PR form (not a blank one). The agent already has both pieces — the task title and the commit message bullets it just produced — so no user prompting is required. URL-encode via `node -e "process.stdout.write(encodeURIComponent(...))"` (insight-flow's canonical encoder; works without extra dependencies). Print the composed URL and ask the user to open it, submit, and paste back the created PR URL for `mr-update`. See the Examples appendix below + `@PR_API.md` for per-host prefill syntax.
4. **Record URL** in tracker:
   ```
   insight-flow mr-update --id <ID> --url "<pr-url>"
   ```

---

WORKFLOW: MERGE (when "merge", "done and merge", "task is done")

1. **Get task** — read tracker for branch, mrUrl, status.
2. **Edge case — no PR**: if `mrUrl` is missing, tell the user to create the PR first. Provide the compare URL. Do not merge without a PR.
3. `[checkout]` **Ensure on main**: `git checkout main && git pull origin main`.
4. `[merge]` **Merge branch**: `git merge --no-ff <branch>` (preserves merge commit).
5. `[push]` **Push main**: `git push origin main`.
6. **Update tracker**:
   ```
   insight-flow merge --id <ID>
   ```
7. **Clean up** — ask user before deleting branches:
   - `[deleteBranchLocal]` `git branch -d <branch>`
   - `[deleteBranchRemote]` `git push origin --delete <branch>`
8. **Report** — show merge commit, updated status. The Stop hook fires the OS notification automatically on session end.

---

EDGE CASES

- **No branch exists yet**: create it from current main.
- **No PR exists**: provide compare URL, ask user to create PR and paste URL back.
- **Branch behind main**: suggest `git rebase main` or `git merge main` before pushing. Ask user which they prefer.
- **Merge conflicts**: list conflicting files, show both sides, ask user how to resolve. Do not auto-resolve.
- **Dirty working tree with unrelated changes**: only stage files relevant to the task. Warn about unstaged unrelated changes.
- **Hook failures**: diagnose the error, fix if possible, retry. Never bypass with `--no-verify`.

---

SAFETY

- Before destructive ops (force-push, branch delete, reset), confirm with the user.
- Show `git status` / `git log -1` after each operation for verification.
- If merge conflicts occur during merge to main, list them and ask the user how to proceed.

---

TOKEN EFFICIENCY

- No subagents. Direct tool calls only.
- Batch independent reads in one round.
- Read only what's needed from tracker.

---

EXAMPLES APPENDIX (illustrative; NOT canonical — your project configures its own command via `agents.extend.task-git`)

<!-- example: GitHub via gh CLI -->
GitHub (`gh` CLI installed):

```bash
gh pr create --title "<type>(scope): <task title>" --body-file /tmp/pr-body.md
# Record the URL:
insight-flow mr-update --id <ID> --url "$(gh pr view --json url -q .url)"
```

<!-- example: GitLab via glab CLI -->
GitLab (`glab` CLI installed):

```bash
glab mr create --title "<type>(scope): <task title>" --description-file /tmp/pr-body.md
```

<!-- example: GitHub via prefill URL (no host CLI) -->
GitHub (no `gh` installed — compose a prefill URL so the user opens a populated form):

```bash
TITLE="<type>(scope): <task title>"
BODY="$(cat <<'EOF'
## Summary
- <bullet points>

## Task
<task-id> — <title>
EOF
)"
TITLE_ENCODED=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$TITLE")
BODY_ENCODED=$(node -e "process.stdout.write(encodeURIComponent(process.argv[1]))" "$BODY")
echo "https://github.com/<owner>/<repo>/compare/main...$(git branch --show-current)?expand=1&title=${TITLE_ENCODED}&body=${BODY_ENCODED}"
# User opens the URL — the form is pre-filled. They submit and paste the resulting PR URL back:
insight-flow mr-update --id <ID> --url "<pasted-pr-url>"
```

<!-- example: GitLab via prefill URL (no host CLI) -->
GitLab (no `glab` installed — same idea, different query-param shape):

```bash
TITLE_ENCODED=$(node -e "process.stdout.write(encodeURIComponent('<type>(scope): <task title>'))")
BODY_ENCODED=$(node -e "process.stdout.write(encodeURIComponent('## Summary\n- ...'))")
BRANCH=$(git branch --show-current)
echo "https://gitlab.com/<owner>/<repo>/-/merge_requests/new?merge_request[source_branch]=${BRANCH}&merge_request[target_branch]=main&merge_request[title]=${TITLE_ENCODED}&merge_request[description]=${BODY_ENCODED}"
insight-flow mr-update --id <ID> --url "<pasted-pr-url>"
```

<!-- example: Bitbucket / other host with limited prefill -->
Bitbucket (and any host with limited prefill support — fall back to a bare URL and prompt for title/body manually):

```bash
echo "https://bitbucket.org/<owner>/<repo>/pull-requests/new?source=$(git branch --show-current)&dest=main&t=1"
# The user will need to enter title + body manually on Bitbucket's form.
insight-flow mr-update --id <ID> --url "<pasted-pr-url>"
```


---

<!-- taskflow:phase-markers:start -->
ACTIONS

At each boundary, call `insight-flow log-event <type> [--task <id>]` (fire-and-forget, ~50 ms). Emit and stop — no downstream calls needed. The CLI silently drops duplicates within 60 s.

**Mandatory** (MUST emit every run):
- `start` — before any work begins.
- `done` — after all work completes.

**Optional** (emit only when the phase genuinely occurs; skip otherwise):
- `research-start | research-end` — when reading/searching to gather context.
- `edit-start | edit-end` — when editing source files.
- `review-start | review-end` — when running a review phase.
- `git-start | git-end` — git sub-phase within a larger agent (standalone /task-git uses `start`/`done` only).
- `active | idle` — Claude session state transitions.

Skip all events if `activityEngine.enabled` is `false` in `taskflow.config.json`.
<!-- taskflow:phase-markers:end -->
