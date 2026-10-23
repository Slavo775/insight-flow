# N271 — Audit seed (claims to verify, NOT facts)

**Source:** prior read-only audit, Claude Opus 5.5 in `/task-analyze`, 2026-10-19. Six parallel area agents (dashboard server, master+mcp, core+cli, agents/hooks/init, React clients, CI/build/tests) + in-session spot-checks.
**Trust:** medium. `[V]` = the seed author re-read that exact code and confirmed it. Everything else is agent-reported and unverified.
**How to use:** for every bullet, mark **kept / rejected / changed** in AUDIT.md with your own file:line evidence. Line numbers are from commit `6fe34db` (+ working tree) and may have drifted.


Paths relative to `packages/taskflow/` unless they start with `.github/` or a root file.

## T1 Lock down local servers (dashboard :6006 + hub :6100) — high/fix
- **T1-1** [V] master/server.ts:569 proxy `new URL(rest, targetBase)`: rest `//127.0.0.1:<any>/x` → any loopback port incl. hub itself; guard only checks loopback hostname. Bypasses /hub/* guard (:844) and write-endpoint loopback trust. Fix: target.origin must equal base origin.
- **T1-2** [V] dashboard/server/index.ts:764 dispatch: ACAO * + no Origin/Host/Sec-Fetch guard on any write route (only /log :1495 and /hub/reregister :803). CSRF chain: POST /api/modules (text/plain, no preflight) kind=hook → POST /api/install → .claude/settings.json hook → RCE. Also /api/default-flow, /api/uninstall, /api/install values→secrets, /api/task-flow, /api/agent-*, /log/events.
- **T1-3** [V] both servers `listen(port)` with no host → all interfaces (index.ts:1667, master/server.ts:1592).
- **T1-4** [V] /api/config (index.ts:946) returns full config incl. observability.langfuse.secretKey; no caller.
- **T1-5** master/server.ts:924 + core/transport.ts:62 — hub /events + /api/activity/:id ungated, SSE ACAO *. Dashboard /sse same.
- **T1-6** master Origin check hostname-only (:416); `[::1]` bracket mismatch (:342); DNS rebinding (no Host allowlist on GETs).
- **T1-7** /api/work-tasks/<name> (index.ts:915) no .json check, symlinks, Windows drive-relative.
- **T1-8** core/secrets.ts:30 secrets.local.json mode 0644.
- **T1-9** Fix shape: move master isTrustedLocalRequest → core/http-util; apply to all non-GET in both servers + require application/json; drop ACAO *; bind 127.0.0.1 unless INSIGHT_FLOW_TRUSTED_HOSTS. Tests: none exist for dashboard CSRF/bind/traversal; master-liveness covers master CSRF.

## T2 Untrusted data must never run code — high/fix
- **T2-1** [V] dashboard/client/DetailPanel.tsx:79 `<a href={task.mrUrl}>`; schema mrUrl z.string(); React 18 doesn't block javascript:. → http(s) only in schema + UI.
- **T2-2** mcp/composer.ts:287-342 → emit.ts:233,241 — create_module kind hook/mcp-server + install over MCP, no human gate (prompt-injected agent → persistent hook).
- **T2-3** [V] cli/commands/log-event.ts:335 config.events.hooks → spawn("sh",["-c",cmd]) — cloned repo config = code exec when agents run log-event.
- **T2-4** cli/commands/notify.ts:29-37 Windows PowerShell `$(...)` injection via title/message.
- **T2-5** Config paths unconfined: activityEngine.logFile absolute, rolesDir (prompt-build.ts:185), workDir ../ (paths.ts:49); langfuse host from config + key from env (langfuse.ts:185).
- **T2-6** sessionId into path unsanitized (log-event.ts:88).
- **T2-7** rehype-sanitize default allows remote <img> (DetailPanel.tsx:305, ModuleDetail.tsx:176); no CSP on either server.

## T3 Consumer slash commands skip role files — high/fix
- **T3-1** [V] agents/init/providers/skills.ts:15-178 — init writes ~10-line summary commands (playground task-implement.md = 481 B) vs this repo's `@TASK_IMPLEMENTER_ROLE.md`. AGENT_SECURITY, AGENT_GIT permissions, handovers, agents.extend never reach consumer agents. /task-git always says `git push` (skills.ts:126) even if push=false.
- **T3-2** Known gap: flow/agent install emits only .claude/, never .cursor/skills (emit.ts:375, flow-install.ts:84). Command name mismatch: init `<tail>` (skills.ts:276) vs installer `task-<tail>` (schema:500).

## T4 CI gate + release supply chain — high/chore
- **T4-1** [V] .github/workflows has only docs/release-please/release-publish — no test/lint/typecheck CI; branch protection required_status_checks null; publish runs no tests.
- **T4-2** release-publish.yml:25 workflow_dispatch publishes any ref; env npm-publish no branch policy; RELEASING.md:91,96 false.
- **T4-3** docs.yml:18-21 pages/id-token at workflow level; actions pinned by tag; pnpm 9.
- **T4-4** npm@^11.5.1 floating; full workspace install in OIDC job.
- **T4-5** pnpm audit: @modelcontextprotocol/sdk <1.31 (OAuth client, not reachable), react-router-dom 6.30.4 open-redirect baked in bundle → bump to ≥6.30.6 / sdk ^1.32.1. No dependabot.
- **T4-6** 9 client-only deps in runtime dependencies (react, react-dom, @xyflow/react, react-markdown, react-router-dom, rehype-sanitize, remark-gfm, styled-components, zustand) → devDependencies (136/231 prod pkgs).
- **T4-7** root lint-staged glob misses .tsx; stale nested packages/taskflow/pnpm-lock.yaml (socket.io).
- **T4-8** RELEASE_PLEASE_TOKEN missing → silent no-publish.

## T5 Safe task storage — high/fix
- **T5-1** [V] core/storage.ts:108 ensureShardExists writes empty shard if name missing from master list, never checks file exists → stale master save (query.ts:316,367,405; change.ts:131; incident.ts:52) + next create = shard wiped.
- **T5-2** storage.ts:46-75,165-204 plain writeFileSync, no lock, RMW; parallel create → duplicate IDs (schema doesn't reject dup ids :142); mid-write reads → SyntaxError w/o filename.
- **T5-3** atomicWrite already exists: dashboard/server/custom-defs.ts:201 → move to core.
- **T5-4** create.ts:154-174 folder+shard created before resolveFlowId (may exit) → orphan folders, duplicate N folders.
- **T5-5** z.object strips unknown keys → older global binary drops chainId etc. → passthrough or schemaVersion.
- **T5-6** loadShard returns empty for missing listed shard (storage.ts:57); shardSize unvalidated.
- **T5-7** Storage port (storage-port.ts) half-used; domain logic in cli/commands imported by dashboard/agents (writeStatus, setTaskFlow, chainAdvanceTask, setTaskChain).
- **T5-8** No tests for concurrent writes / corruption.

## T6 Event + activity logs integrity — high/fix
- **T6-1** [V] log-event.ts:51-60 loadEvents parse/schema fail → [] → next write wipes history; :214 every Pre/PostToolUse rewrites whole events.json (up to 300 KB, 210 tracked files).
- **T6-2** Log path from process.cwd() not project root: log-event.ts:65, log-activity.ts:12, dashboard/server/index.ts:711,721 (22 stray .taskflow-activity.jsonl found).
- **T6-3** dashboard/server/activity.ts:96-139 re-reads whole file each growth, partial-line loss, shrink stops feed, stop() leaves interval.
- **T6-4** dashboard file watcher fires file-change for events.json → all tabs refetch all shards.
- **T6-5** ~/.insight-flow: 357 session files, 20 MB, never pruned; insightFlow/events/ + *.last-skill not in scaffolded .gitignore; repo .gitignore `insightFlow/events/` root-only.

## T7 Strict CLI args + transition table — high/fix
- **T7-1** [V] cli.ts:78-95 parser accepts any flag; `show N252` silently shows current task (resolveId fallback, storage.ts:138). `merge --help` merges current, `update --help` runs npm i -g, `--id=N05` → key "id=N05". `--files ""` → true → crash implement.ts:40.
- **T7-2** currentTaskId shared by parallel agents (next/create overwrite it).
- **T7-3** core/set-status.ts:56 membership-only, no from→to; review-end --verdict merged allowed; push on merged regresses; `status` bypasses check.
- **T7-4** review.ts:80/93, fix.ts:60/62 side file saved before status validation.
- **T7-5** core/spec.ts:11 replaceAll `$` patterns in titles.
- **T7-6** Dupes: PRIORITY_WEIGHT, picker sort ×4, slug ×2, loadFlows ×2, open-incident rule.

## T8 Hook scripts: correct, quiet, fast — medium/fix
- **T8-1** [V] agents/activity-hook.ts:36-51 echo-built JSON, grep `"[^"]*"` → 13% malformed lines; full commands (secrets) logged.
- **T8-2** Unquoted ${CLAUDE_PROJECT_DIR} / $IF_CMD (activity.json, activity-hook, notify-hook, cursor-hooks) → paths with spaces break hooks.
- **T8-3** Lifecycle scripts use bare `insight-flow` (activity-hook.ts:314, flow-install.ts:335, migrate-hooks.ts:13); notify/cursor resolve local bin first.
- **T8-4** Background `log-event … 2>/dev/null &` leaves stdout → may feed model context / hold pipe.
- **T8-5** Every tool call spawns full 531 KB CLI twice (~190 ms CPU) before --if-active check → bash flag check + lazy imports.
- **T8-6** Cursor gate (cursor-hooks.ts:66-108) returns "allow" for non-matching; grep parse bypassable.
- **T8-7** Double notifications on Stop (activity.json:44 + notify-hook.ts).
- **T8-8** Activity attribution: Cursor marks every prompt active; skills-as-skill never active; events filed under currentTaskId.

## T9 Init + install never clobber user files — medium/fix
- **T9-1** [V] activity-hook.ts:131-135, 262-266; notify-hook.ts:91-96 settings.local.json parse fail → {} → overwrite (loses permissions/env).
- **T9-2** cursor-hooks.ts:180-193 .cursor/hooks.json never merged; --force replaces.
- **T9-3** init/index.ts:99,123,269-322 opt-outs (activity, lifecycle hooks) not persisted.
- **T9-4** migrate-hooks only refreshes lifecycle; activity/enrichment/notify scripts stale (BUNDLED_HOOKS_VERSION=4 fix never reaches).
- **T9-5** emit.ts:387-428 install overwrites unmanaged same-name files; uninstall deletes them (e.g. /taskmaster). applyArtifacts non-atomic, manifest not saved on mid-failure; removeOwnedHook removes whole matcher group.
- **T9-6** dashboard/server/custom-defs.ts:57-63 fileFor: built-in X and custom:X → same file (silent loss; loadUserRegistries throws).

## T10 Hub reliability — medium/fix
- **T10-1** master/lock.ts:38-45 PID-only liveness; uncaughtException exits w/o clearing lock; no SIGHUP; non-O_EXCL write after listen.
- **T10-2** No listen 'error' handler (master :1591, dashboard); dashboard uncaughtException swallows stack, starts activity engine + master before listen succeeds.
- **T10-3** registry.ts:32-47 upsert by projectId → two "web" projects collapse, share token; /api/projects/create re-points path.
- **T10-4** server.ts:1368 liveness close always setOnline(false) → race with re-register.
- **T10-5** Port assign check-then-use (:477-491,1446).
- **T10-6** /update body unvalidated (:1059); stripHopByHop ignores Connection tokens; fetchLatestVersion no dedupe/timeout on body; proxy buffers all text/html unbounded (:637); FSWatchers no error listener (index.ts:184,197,222; activity.ts:61).
- **T10-7** LAN TRUSTED_HOSTS mode: Host header is the only credential (pairing token = future).

## T11 Dashboard + hub UI reliability — medium/fix
- **T11-1** [V] useDashboardStream.ts:52 onerror never recreates EventSource → after proxy 502 stream CLOSED forever.
- **T11-2** Too many SSE per origin (HTTP/1.1, 6 limit): hub App + hub-notify /events, project /sse + hub-notify, InstallModal.
- **T11-3** TaskDetailPage.tsx:234 + store.ts:153 direct link race → "Loading N05…" forever; no "not found"; loadShard no request ordering.
- **T11-4** Single ErrorBoundary outside router, no retry; shard shape unchecked → whole app blank.
- **T11-5** master/client notif.ts:48 same-tab settings not reloaded; master/client/api.ts no res.ok, errors swallowed, no resync on reconnect.
- **T11-6** FlowEditor.tsx:746 trims per keystroke ("the change" → "thechange"); onNodeDragStop stale nodes; unsaved draft lost on nav.
- **T11-7** DocViewer never refreshes; flows cache invalidate no refetch; seen Set grows; key={ev.id||i}; "now ago"; LifecyclePill hexToRgb NaN; vite dev proxy missing /sse /log /config.

## T12 UI performance + accessibility — low/rework
- **T12-1** App.tsx:57 board subscribes to activityEvents → full re-render + markdown re-parse per tool call.
- **T12-2** No code splitting; 682 KB single chunk (xyflow, react-markdown on Kanban home).
- **T12-3** DetailPanel slide-over no dialog semantics; InstallModal, ModuleInfoModal, FlowEditor edge modal re-implement Modal w/o focus trap — shared components/Modal.tsx exists.
- **T12-4** Dead: itemBackground, browserNotifications/soundsEnabled, GlobalStyle comment. Big files: FlowEditor 830, ModuleForm 671, InstallModal 602, NewProjectModal 556, master App 544.

## T13 Dashboard server cleanup — medium/rework
- **T13-1** core/http-util.ts:60 readBody decodes per chunk → split multibyte chars → U+FFFD (Slovak diacritics in big prompts); counts chars not bytes; destroy before 413.
- **T13-2** custom-defs.ts:184 try/catch wraps handler → EACCES shown as "invalid JSON"; double-send → unhandled rejection.
- **T13-3** dispatch 785-line if-chain; JSON syntax error 500 vs 400 inconsistently; unknown /api/* → 200 SPA HTML; GET routes accept any method.
- **T13-4** Dead routes /api/activity, /overview. [V] sounds/*.mp3 0 bytes (real file in 0d3ff5f).

## T14 Tests, docs drift, repo hygiene — low/chore
- **T14-1** incident-*, change-*, next-change, mr-update, migrate never executed in tests; MCP composer create/update/install tools untested; no client tests.
- **T14-2** Fixed ports (custom-defs-api 17103 etc.), unawaited SIGKILL, overlapping port ranges → --test-concurrency=1 load-bearing; execFileSync timeout 500 ms (cold start 380 ms); test:node runs stale dist silently.
- **T14-3** Docs drift: CLAUDE.md:114 (ESLint exists), :115 (tests), :54/:56 paths, no src/mcp; RELEASING.md:91,96; package.json description "server-rendered"; root CHANGELOG claim.
- **T14-4** engines node >=18 unverified (EOL) → >=20.
- **T14-5** playground/insightFlow/events tracked; 210 events.json tracked + hook-dirty.

## Ordering
T1 → T2 (same server file). T4 parallel with T1. T5 → T7 → T6 → T8 (core/cli/log-event/cli.ts overlap). T3 → T9 (init). T13 after T1. Wait for N267 (flow chains, core+CLI) to merge before T5/T7.

## Decisions (user, 2026-10-19)
- Split: 14 focused tasks (T1–T14), each one Fable analyze → implement run.
- T7: state-changing commands REQUIRE --id; read commands (show/current) keep fallback.
- T1: bind 127.0.0.1 by default; INSIGHT_FLOW_TRUSTED_HOSTS keeps opt-in LAN as today; pairing token = out of scope (future task).
- T3: consumer slash commands @-include full role files (`@.claude/roles/<ROLE>.md` + $ARGUMENTS); delete SKILL_* summary constants.
- Defaults (not asked): T13 restore mp3s from 0d3ff5f; events.json stays git-tracked (out of scope).
