# N17 — Dashboard live-updates miss subfolder writes — recursive watcher needed — Checklist

## Done criteria

- [ ] `packages/taskflow/src/server/index.ts` watches `workDir` recursively (native on macOS/Windows, per-subdir fallback on Linux).
- [ ] Edits to `<task>/reviews.json`, `<task>/incidents.json`, and `<task>/*.md` trigger a `file-change` WS broadcast.
- [ ] Multiple fs events within 100 ms coalesce into a single broadcast.
- [ ] Dashboard `file-change` handler also re-fetches `master.json` and updates the subtitle / shard list.
- [ ] SIGINT closes every registered watcher (no orphaned handles).
- [ ] New task folder created at runtime (e.g. via `insight-flow create`) is picked up by the Linux fallback within ~1 s.

## Quality gates

- [ ] `pnpm --dir packages/taskflow run typecheck` passes
- [ ] `pnpm --dir packages/taskflow run build` passes
- [ ] `pnpm --dir packages/taskflow test` passes
- [ ] No regression in `insight-flow ui` startup time (≤ 500 ms to first paint)

## Verification

- [ ] Manual: open dashboard, run `node packages/taskflow/dist/cli.js review-start N16`, observe card flips within ~1 s with no reload.
- [ ] Manual: open DevTools Network → WS frames, `touch workTasks/N16-*/REVIEW.md`, confirm exactly one `{ "type": "file-change" }` frame.
- [ ] Manual: rapid-fire `for i in 1 2 3 4 5; do touch workTasks/N16-*/REVIEW.md; done` → exactly one frame (debounce).
- [ ] Manual: `Ctrl+C` on the server → exits in <1 s; `lsof -p <pid>` beforehand showed N watchers, all released.
