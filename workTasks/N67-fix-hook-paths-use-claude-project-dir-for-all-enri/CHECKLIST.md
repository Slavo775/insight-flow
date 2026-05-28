# N67 — fix hook paths: use CLAUDE_PROJECT_DIR for all enrichment hooks — Checklist

## Done criteria

- [ ] `activity-hook.ts` PostToolUse registration uses `${CLAUDE_PROJECT_DIR}/...`
- [ ] `activity-hook.ts` enrichment loop `hookCmd` uses `${CLAUDE_PROJECT_DIR}/...`
- [ ] `notify-hook.ts` Stop registration uses `${CLAUDE_PROJECT_DIR}/...`
- [ ] `.claude/settings.local.json` — all stale relative paths replaced
- [ ] `package.json` version is `0.11.2`
- [ ] `CHANGELOG.md` has `## [0.11.2]` entry

## Quality gates

- [ ] `pnpm build` passes with no TypeScript errors

## Verification

- [ ] Hook error banners no longer appear in Claude Code after restart
