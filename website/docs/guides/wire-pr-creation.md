---
title: Wire up PR creation for your git host
sidebar_label: Wire up PR creation
sidebar_position: 2
---

# Wire up PR creation for your git host

insight-flow ships **no** git-host commands. The `/task-git` agent knows it
should open a PR/MR, but the exact command is yours to supply via
[`agents.extend`](../configuration.md). This guide wires `gh` (GitHub) or `glab`
(GitLab) — or a plain prefill URL — into the agent's prompt.

> The commands below are **examples**. insight-flow stays technology-agnostic;
> nothing here is a shipped default — it only reaches the agent because your
> `taskflow.config.json` adds it.

## 1. Add the command to `agents.extend.task-git`

Open `taskflow.config.json` at your project root and add a `task-git` array.
Each string is appended verbatim to the `/task-git` agent's prompt.

**GitHub (`gh`):**

```jsonc
// taskflow.config.json
{
  "agents": {
    "extend": {
      "task-git": [
        "For PR creation: `gh pr create --title \"<title>\" --body-file <path>`. Record the URL via `gh pr view --json url -q .url`.",
      ],
    },
  },
}
```

**GitLab (`glab`):**

```jsonc
{
  "agents": {
    "extend": {
      "task-git": [
        "For MR creation: `glab mr create --title \"<title>\" --description-file <path>`. Record the URL from glab's output.",
      ],
    },
  },
}
```

**No CLI — prefill URL (any host):** if you don't have a host CLI, have the agent
print a compare/new-PR URL for you to open in the browser:

```jsonc
{
  "agents": {
    "extend": {
      "task-git": [
        "For PR creation: print the prefill URL `https://github.com/<owner>/<repo>/compare/main...<branch>?expand=1` and ask me to open it. Then record the resulting PR URL with `insight-flow mr-update --id <task-id> --url <url>`.",
      ],
    },
  },
}
```

## 2. Re-run `init` to apply

Role files are scaffolded at `init` time, so re-run it to fold the new prompt
extension into the `/task-git` role file:

```bash
insight-flow init
```

`init` is additive — it won't overwrite your task data. If you only want to
refresh the enforcement block and `agents.extend` into existing role files
(without re-scaffolding), use:

```bash
insight-flow prompt-build --apply
```

Expected output (JSON, one line):

```json
{ "action": "prompt-build", "enforcementFile": "AGENT_ENFORCEMENT.md", "patched": [], "skipped": [...] }
```

## 3. Verify

Run `/task-git` on a task that's ready to push. The agent's prompt now contains
your PR/MR command, and it records the resulting URL on the task (visible in the
dashboard detail panel and via `insight-flow show --id <task-id>`).

## Notes

- Record the PR/MR URL on a task at any time with
  `insight-flow mr-update --id <task-id> --url "<url>"`.
- For richer per-host examples (fetching the diff, posting reviews, replying to
  comments), see [`PR_API.md`](../reference/PR_API.md) in the reference section.
- If `agents.extend.task-git` is empty, `/task-git` runs the canonical,
  host-agnostic prompt and notes in its report that PR creation was skipped.

## See also

- [Add your stack's quality gates](./quality-gates.md)
- [Configuration → `agents.extend`](../configuration.md)
- [Agents → task-git](../agents/task-git.md)
