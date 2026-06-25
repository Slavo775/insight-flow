---
title: Add your stack's quality gates
sidebar_label: Quality gates
sidebar_position: 3
---

# Add your stack's quality gates

insight-flow ships **no** language, package-manager, or test-runner assumptions.
To make `/task-implement` and `/task-review-fix` run your typecheck / lint / test
before they mark work done, supply the commands via
[`agents.extend`](../configuration.md). Each string is appended verbatim to that
agent's prompt.

> The commands below are **examples** — they only reach the agent because your
> `taskflow.config.json` adds them. insight-flow stays technology-agnostic.

## 1. Add your gates to `agents.extend`

Open `taskflow.config.json` and add `task-implement` (gates after the initial
implementation) and `task-review-fix` (gates after every blocker fix).

**TypeScript + pnpm:**

```jsonc
// taskflow.config.json
{
  "agents": {
    "extend": {
      "task-implement": [
        "Run `pnpm typecheck && pnpm lint && pnpm test` before marking the task implemented. Do not mark it implemented if any gate fails.",
      ],
      "task-review-fix": [
        "Re-run `pnpm typecheck && pnpm lint && pnpm test` after every blocker fix before marking the task fixed.",
      ],
    },
  },
}
```

**Python + uv:**

```jsonc
{
  "agents": {
    "extend": {
      "task-implement": [
        "Run `uv run mypy . && uv run ruff check . && uv run pytest` before marking implemented.",
      ],
      "task-review-fix": [
        "Re-run `uv run mypy . && uv run ruff check . && uv run pytest` after every blocker fix.",
      ],
    },
  },
}
```

**Go:**

```jsonc
{
  "agents": {
    "extend": {
      "task-implement": [
        "Run `go vet ./... && golangci-lint run && go test ./...` before marking implemented.",
      ],
      "task-review-fix": [
        "Re-run `go vet ./... && golangci-lint run && go test ./...` after every blocker fix.",
      ],
    },
  },
}
```

## 2. Apply the change

Re-scaffold the role files so the extension lands in the prompts:

```bash
insight-flow init
```

Or, to only re-sync `agents.extend` + the enforcement block into existing role
files:

```bash
insight-flow prompt-build --apply
```

## 3. Verify

Run `/task-implement` on a ready task. Before it calls
`insight-flow implement-end`, the agent now runs your gates; a failing gate keeps
the task out of the `implemented` state. The same holds for `/task-review-fix`
after each blocker fix.

## Notes

- Keep each gate string as a single shell pipeline so the agent runs it as one
  step and stops on the first failure.
- An empty array for an agent means it runs the canonical prompt only and notes
  in its report that the quality-gate step was skipped.

## See also

- [Wire up PR creation for your git host](./wire-pr-creation.md)
- [Configuration → `agents.extend`](../configuration.md)
- [Agents → task-implement](../agents/task-implement.md) ·
  [task-review-fix](../agents/task-review-fix.md)
