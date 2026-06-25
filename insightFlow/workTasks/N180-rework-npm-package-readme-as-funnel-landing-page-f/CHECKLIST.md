# N180 — Rework npm package README as funnel/landing page + fix stale CLAUDE.md dashboard description — Checklist

## Done criteria

- [ ] README opens with H1 → badge row → 2–3 sentence elevator pitch → "Full documentation →" link (no release-notes wall above the fold).
- [ ] Badge row present: npm version, npm downloads, license (shields.io).
- [ ] "What's new in 2.0.0" inlined highlights removed; replaced by a one-line CHANGELOG pointer.
- [ ] Prominent docs link points to `https://slavo775.github.io/insight-flow/`.
- [ ] 60-second CLI quickstart (`install` → `init` → `create` → `ui`) intact and readable.
- [ ] Deeper README reference sections (CLI, Configuration, Slash commands, etc.) preserved.
- [ ] `CLAUDE.md` line ~7 corrected: React + Vite dashboard (no "server-rendered / no React frontend").
- [ ] `CLAUDE.md` line ~41 corrected: server serves built React client + JSON APIs, **SSE** for live updates (not Socket.IO / not "HTML string + vanilla JS").
- [ ] No remaining stale `server-rendered` / `Socket.IO` / `vanilla JS` / `React frontend` mentions in `CLAUDE.md`.
- [ ] Root repo `README.md` NOT modified (out of scope).
- [ ] No source/dashboard code changed (docs only).

## Quality gates

- [ ] `npx prettier --check packages/taskflow/README.md CLAUDE.md` passes.
- [ ] Pre-commit hook (prettier + eslint --fix + typecheck) passes on commit.
- [ ] `grep -nE "server-rendered|React frontend|HTML string|vanilla JS|Socket\.IO" CLAUDE.md` shows nothing stale.

## Verification

- [ ] Read the README top "as a stranger": within the first screenful you can tell what insight-flow is, why to care, and how to start.
- [ ] Badge URLs render (open shields.io links).
- [ ] Docs link resolves to the live Docusaurus site.
