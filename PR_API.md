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

<!-- example: Bitbucket / no host CLI -->
Bitbucket or no host CLI installed — write `REVIEW.md` only:

```bash
# After running insight-flow review-end, REVIEW.md is on disk.
# Print the path and ask the user to paste it into the host's review UI.
echo "Review written to workTasks/<task-folder>/REVIEW.md — please paste into the PR review surface manually."
```

---

Local-only diff fallback (works on any host):

```bash
git diff main...<branch> --stat
git diff main...<branch>
```

Useful when no token is available or no host CLI is installed. The reviewer can still produce a complete REVIEW.md from the local diff alone.
