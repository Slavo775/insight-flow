# N82 — Add code-quality toolchain — ESLint + Prettier + pre-commit hooks + quality gates — Checklist

## Done criteria

- [ ] ESLint + Prettier configured, matching existing style; `lint` and `format:check` pass on the current tree (or a baseline is documented).
- [ ] Pre-commit hook runs typecheck + lint + format-check on staged files and blocks failures.
- [ ] `lint`/`format` scripts added; `lint` wired into `taskflow.config.json` `agents.extend` gates.
- [ ] Added dependencies kept minimal / justified.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` passes
- [ ] `pnpm --dir packages/taskflow test` passes (no regressions)

## Verification

- [ ] A malformed staged file is rejected by the pre-commit hook; the same file fixed commits cleanly.
