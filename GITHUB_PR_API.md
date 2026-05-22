GITHUB PR API — shared snippet

All requests below use `~/.github-token` for auth. Repo is `Slavo775/insight-flow`. Replace `<PR_NUMBER>` with the integer from `mrUrl`.

If no token is available: fall back to local `git` for diffs, and write review output to REVIEW.md for the user to post manually.

GET PR DIFF

```bash
curl -s -H "Authorization: token $(cat ~/.github-token 2>/dev/null)" \
  -H "Accept: application/vnd.github.v3.diff" \
  https://api.github.com/repos/Slavo775/insight-flow/pulls/<PR_NUMBER>
```

Local fallback:

```bash
git diff main...<branch> --stat
git diff main...<branch>
```

GET PR REVIEWS + INLINE COMMENTS

```bash
curl -s -H "Authorization: token $(cat ~/.github-token 2>/dev/null)" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Slavo775/insight-flow/pulls/<PR_NUMBER>/reviews

curl -s -H "Authorization: token $(cat ~/.github-token 2>/dev/null)" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Slavo775/insight-flow/pulls/<PR_NUMBER>/comments
```

POST A REVIEW

Body-only (general comment). `event` ∈ `APPROVE` | `REQUEST_CHANGES` | `COMMENT`:

```bash
curl -s -X POST \
  -H "Authorization: token $(cat ~/.github-token 2>/dev/null)" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Slavo775/insight-flow/pulls/<PR_NUMBER>/reviews \
  -d '{"event":"REQUEST_CHANGES","body":"Review summary"}'
```

With inline comments:

```bash
-d '{
  "event": "REQUEST_CHANGES",
  "body": "Review summary",
  "comments": [
    {"path": "src/file.ts", "line": 42, "body": "Blocker: ..."},
    {"path": "src/other.ts", "line": 10, "body": "Suggestion: ..."}
  ]
}'
```

REPLY TO A REVIEW COMMENT

```bash
curl -s -X POST \
  -H "Authorization: token $(cat ~/.github-token 2>/dev/null)" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/Slavo775/insight-flow/pulls/<PR_NUMBER>/comments/<COMMENT_ID>/replies \
  -d '{"body":"Fixed in <commit-hash>. <brief description>"}'
```

Resolving threads requires GraphQL; if the REST reply succeeds, the "Fixed" reply is sufficient.
