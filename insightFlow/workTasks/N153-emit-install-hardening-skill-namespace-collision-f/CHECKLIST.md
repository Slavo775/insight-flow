# N153 — emit/install hardening — skill-namespace collision, frontmatter escaping, empty-prompt, ARGUMENTS parity — Checklist

## Done criteria

- [ ] `command as:"skill"` vs `skill` module same-name collision is detected (cross-namespace check in emit.ts)
- [ ] Skill frontmatter `description` is YAML-safe (escaped/quoted)
- [ ] Empty composed prompt → command skipped + warning (no blank body)
- [ ] Force-emitted command (flow-install.ts) ends with `\n\n$ARGUMENTS\n`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow lint` + `format:check` pass
- [ ] `pnpm --dir packages/taskflow test` passes (incl. new cases)
- [ ] No regressions to existing emit/install behavior

## Verification

- [ ] Tests: collision fires; frontmatter parses as valid YAML; empty-prompt skipped; `$ARGUMENTS` present in force-emit body
