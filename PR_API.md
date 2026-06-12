PR API — technology-agnostic reference

This file is referenced by `TASK_REVIEWER_ROLE.md` and `TASK_REVIEW_FIXER_ROLE.md` as `@PR_API.md`. insight-flow itself does **not** assume a git host or its API. The reviewer / review-fixer agents need to perform four operations: **fetch the PR diff**, **fetch review + inline comments**, **post a review**, and **reply to a review comment**. The exact commands for these are project-specific and belong in your `taskflow.config.json`:

```jsonc
// taskflow.config.json — your project supplies these strings; insight-flow ships none
{
  "agents": {
    "extend": {
      "task-review": [
        "Fetch the PR diff via <your-command>.",
        "Post the review via <your-command>."
      ],
      "task-review-fix": [
        "Fetch review comments via <your-command>.",
        "Reply to a comment via <your-command>."
      ]
    }
  }
}
```

If no commands are configured, fall back: write the review output to `REVIEW.md` only and inform the user to post it manually on whichever host they use.

---

EXAMPLES APPENDIX (illustrative; NOT shipped defaults)

The blocks below show how a project on each common host could configure its `agents.extend` arrays. **None of these strings appear in insight-flow's canonical role docs** — they only become part of the agent prompt if your `taskflow.config.json` adds them.

<!-- example: GitHub REST API + gh CLI -->
GitHub (REST API + `gh`):

Token handling: prefer `gh auth token` (reads from gh's credential store) over `cat ~/.github-token` — putting the token directly in a command via `$(cat …)` exposes it briefly in process listings (`ps`, `/proc/<pid>/cmdline`). The examples below use `gh auth token` for safety.

```bash
# Fetch PR diff
TOKEN=$(gh auth token)
curl -s -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3.diff" \
  https://api.github.com/repos/<owner>/<repo>/pulls/<PR_NUMBER>

# Fetch reviews + inline comments
curl -s -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/<owner>/<repo>/pulls/<PR_NUMBER>/reviews
curl -s -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/<owner>/<repo>/pulls/<PR_NUMBER>/comments

# Post a review (event ∈ APPROVE | REQUEST_CHANGES | COMMENT)
curl -s -X POST -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/<owner>/<repo>/pulls/<PR_NUMBER>/reviews \
  -d '{"event":"REQUEST_CHANGES","body":"..."}'

# Reply to a review comment
curl -s -X POST -H "Authorization: token $TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/<owner>/<repo>/pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies \
  -d '{"body":"Fixed in <commit>."}'
```

The `gh` CLI cannot REQUEST_CHANGES on your own PR; use the REST API or fall back to a comment via `<the-cli> pr comment`. If `gh` is not installed and you must read a token from disk, prefer `curl --netrc-file` over command-substitution to keep the secret out of the process table.

<!-- example: GitLab REST API + glab CLI -->
GitLab (REST API + `glab`):

```bash
# Fetch MR diff
glab mr diff <MR_IID>

# Post a comment / review
glab mr note <MR_IID> -m "<body>"

# REST equivalents:
curl -s -H "PRIVATE-TOKEN: $(cat ~/.gitlab-token)" \
  "https://gitlab.com/api/v4/projects/<encoded-path>/merge_requests/<MR_IID>/changes"
curl -s -X POST -H "PRIVATE-TOKEN: $(cat ~/.gitlab-token)" \
  -d "body=<comment>" \
  "https://gitlab.com/api/v4/projects/<encoded-path>/merge_requests/<MR_IID>/notes"
```

<!-- example: Bitbucket / no host CLI — review fallback -->
Bitbucket or no host CLI installed (review fallback): write `REVIEW.md` only:

```bash
# After running insight-flow review-end, REVIEW.md is on disk.
# Print the path and ask the user to paste it into the host's review UI.
echo "Review written to <tasksDir>/<task-folder>/REVIEW.md — please paste into the PR review surface manually."
```

<!-- example: no host CLI — PR creation via prefill URL -->
PR creation fallback (no host CLI — compose a prefill URL so the user lands on a populated create-PR form, not a blank one):

```bash
TITLE_ENCODED=$(node -e "process.stdout.write(encodeURIComponent('<type>(scope): <task title>'))")
BODY_ENCODED=$(node -e "process.stdout.write(encodeURIComponent('## Summary\n- ...\n\n## Task\n<task-id> — <title>'))")
BRANCH=$(git branch --show-current)

# GitHub prefill (?expand=1&title=…&body=…):
echo "https://github.com/<owner>/<repo>/compare/main...${BRANCH}?expand=1&title=${TITLE_ENCODED}&body=${BODY_ENCODED}"

# GitLab prefill (?merge_request[title]=…&merge_request[description]=…):
echo "https://gitlab.com/<owner>/<repo>/-/merge_requests/new?merge_request[source_branch]=${BRANCH}&merge_request[target_branch]=main&merge_request[title]=${TITLE_ENCODED}&merge_request[description]=${BODY_ENCODED}"

# Bitbucket has limited prefill — bare URL, user fills title/body manually:
echo "https://bitbucket.org/<owner>/<repo>/pull-requests/new?source=${BRANCH}&dest=main&t=1"

# After the user opens, submits, and pastes the resulting PR URL:
# insight-flow mr-update --id <ID> --url "<pasted-pr-url>"
```

URL-encoder: `node -e "process.stdout.write(encodeURIComponent(...))"` is insight-flow's canonical encoder (no extra dependencies needed). Alternatives: `jq -sRr @uri` for projects with `jq` installed, or `python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))"` for Python projects.

---

Local-only diff fallback (works on any host):

```bash
git diff main...<branch> --stat
git diff main...<branch>
```

Useful when no token is available or no host CLI is installed. The reviewer can still produce a complete REVIEW.md from the local diff alone.
