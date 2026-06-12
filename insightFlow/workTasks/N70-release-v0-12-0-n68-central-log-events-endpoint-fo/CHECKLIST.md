# N70 — release v0.12.0 — N68 central /log/events endpoint + four-state status model — Checklist

## Done criteria

- [ ] `packages/taskflow/package.json` version is `0.12.0`
- [ ] `packages/taskflow/CHANGELOG.md` has `## [0.12.0] — 2026-05-28` section documenting N68 surface (endpoint, status model, WS frames, browser notifications, master forwarder, daily JSONL backup) + N69 note (tried-and-rejected, no code shipped)
- [ ] Repo-root `CHANGELOG.md` has catch-up entries for `[0.11.1]`, `[0.11.2]` and a new `[0.12.0]` entry
- [ ] `packages/taskflow/README.md` documents the new `POST /log/events` endpoint, four-state status model, and per-browser "Browser notifications" toggle
- [ ] `pnpm pack:taskflow` produces `insight-flow-0.12.0.tgz` and a scratch-dir install of it reports `insight-flow 0.12.0`
- [ ] `npm publish` from `packages/taskflow/` succeeds; `npm view insight-flow version` returns `0.12.0`
- [ ] Tag `insight-flow@0.12.0` (or `v0.12.0` — match the existing tag style) pushed to `origin`

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes (full suite)
- [ ] `pnpm --dir packages/taskflow run prepublishOnly` runs cleanly (this is what `npm publish` triggers)

## Verification

- [ ] `npx insight-flow@0.12.0 --version` from outside the repo prints `insight-flow 0.12.0`
- [ ] Scratch-dir smoke: `mkdir /tmp/if-0120 && cd /tmp/if-0120 && npm i <repo>/insight-flow-0.12.0.tgz && ./node_modules/.bin/insight-flow init` completes without error
- [ ] Repo-root `CHANGELOG.md` no longer skips from 0.11.0 → 0.12.0 (the missing 0.11.1/0.11.2 entries are backfilled)
- [ ] `git tag --list 'insight-flow@*' 'v*'` shows the new tag
