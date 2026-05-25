import type { TaskflowConfig } from "../types.js";

export function getDashboardHtml(config: TaskflowConfig): string {
  const activityEnabled = config.activityEngine?.enabled === true;
  const browserNotifications = config.notifications?.browser !== false;
  const port = config.server.port;
  const projectName = config.projectName || "";
  const verbosity = config.activityEngine?.verbosity ?? "both";

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n" +
    "  <meta charset=\"UTF-8\">\n" +
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
    "  <title>Taskflow Dashboard</title>\n" +
    "  <style>\n" + CSS + "\n  </style>\n" +
    "</head>\n<body>\n" +
    getNavHtml(projectName, "home") +
    "  <div class=\"top-bar\">\n" +
    "    <div>\n" +
    "      <h1><span class=\"live-dot\" id=\"status-dot\"></span>Taskflow Dashboard</h1>\n" +
    "      <p class=\"subtitle\" id=\"project-name\">Loading...</p>\n" +
    "    </div>\n" +
    "    <div class=\"top-bar-actions\">\n" +
    (activityEnabled
      ? ""
      : "      <span class=\"engine-chip engine-off\" title=\"Set activityEngine.enabled to true in taskflow.config.json to enable\">Engine: off (config)</span>\n") +
    (browserNotifications
      ? "      <div class=\"settings-wrap\"><button class=\"settings-btn\" id=\"settings-btn\" onclick=\"toggleSettings()\" title=\"Notification settings\">&#9881;</button>\n" +
        "      <div class=\"settings-popover\" id=\"settings-popover\">\n" +
        "        <div class=\"settings-header\">Notifications</div>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-implemented\" onchange=\"saveNotifSettings()\"> Task implemented</label>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-approved\" onchange=\"saveNotifSettings()\"> Review approved</label>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-fix-needed\" onchange=\"saveNotifSettings()\"> Fix needed</label>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-merged\" onchange=\"saveNotifSettings()\"> Merged</label>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-changes-requested\" onchange=\"saveNotifSettings()\"> Changes requested</label>\n" +
        "        <div class=\"settings-divider\"></div>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-sound\" onchange=\"saveNotifSettings()\"> Sound</label>\n" +
        "        <label class=\"settings-row\"><input type=\"checkbox\" id=\"notif-mute-focused\" onchange=\"saveNotifSettings()\"> Mute when tab focused</label>\n" +
        "        <div id=\"notif-permission-hint\" class=\"settings-hint\"></div>\n" +
        "      </div></div>\n"
      : "") +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"layout\">\n" +
    "    <div class=\"main-content\">\n" +
    "      <div class=\"shard-nav\" id=\"shard-nav\"></div>\n" +
    "      <div class=\"stats\" id=\"stats\"></div>\n" +
    "      <div class=\"kanban\" id=\"kanban\"></div>\n" +
    (activityEnabled
      ? "      <div class=\"act-tabs\" id=\"act-tabs\">\n" +
        "        <div class=\"act-tab-bar\">\n" +
        "          <button class=\"act-tab active\" data-pane=\"claude\" onclick=\"switchActTab('claude')\">Claude Activity <span class=\"activity-status\" id=\"activity-status\"></span></button>\n" +
        "          <button class=\"act-tab\" data-pane=\"recent\" onclick=\"switchActTab('recent')\">Recent Activity</button>\n" +
        "        </div>\n" +
        "        <div class=\"act-pane\" id=\"act-pane-claude\">\n" +
        "          <div class=\"activity-feed\" id=\"activity-feed\"></div>\n" +
        "        </div>\n" +
        "        <div class=\"act-pane\" id=\"act-pane-recent\" style=\"display:none\">\n" +
        "          <div id=\"timeline\"></div>\n" +
        "        </div>\n" +
        "      </div>\n"
      : "      <div id=\"timeline\"></div>\n") +
    "    </div>\n" +
    "  </div>\n" +
    "\n" +
    "  <div class=\"detail-overlay\" id=\"overlay\" onclick=\"closeDetail()\"></div>\n" +
    "  <div class=\"detail-panel\" id=\"detail\" style=\"display:none\">\n" +
    "    <button class=\"close\" onclick=\"closeDetail()\">&times;</button>\n" +
    "    <div id=\"detail-content\"></div>\n" +
    "  </div>\n" +
    "\n" +
    "  <script src=\"/socket.io/socket.io.js\"></script>\n" +
    "  <script>\n" + getScript(activityEnabled, port, browserNotifications, projectName, verbosity) + "\n  </script>\n" +
    "</body>\n</html>";
}

const NAV_CSS = `    .top-nav { position: sticky; top: -24px; z-index: 100; background: var(--surface); border-bottom: 1px solid var(--border); height: 48px; display: flex; align-items: center; justify-content: space-between; padding: 0 24px; margin: -24px -24px 24px -24px; }
    .nav-project { font-size: 13px; font-weight: 600; color: var(--text); letter-spacing: -0.01em; }
    .nav-links { display: flex; gap: 4px; }
    .nav-link { font-size: 13px; color: var(--text-muted); text-decoration: none; padding: 6px 12px; border-radius: 6px; transition: background 0.15s, color 0.15s; }
    .nav-link:hover { background: var(--border); color: var(--text); }
    .nav-link.active { background: var(--accent); color: #fff; }`;

const CSS = `    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0a; --surface: #141414; --border: #262626;
      --text: #e5e5e5; --text-muted: #737373; --accent: #3b82f6;
      --green: #22c55e; --yellow: #eab308; --red: #ef4444; --purple: #a855f7;
      --orange: #f97316; --cyan: #06b6d4;
    }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-bottom: 0; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .top-bar-actions { display: flex; gap: 8px; align-items: center; }
    .engine-chip { font-size: 11px; padding: 4px 10px; border-radius: 10px; border: 1px solid var(--border); color: var(--text-muted); }
    .engine-chip.engine-off { background: var(--surface); }
    .activity-empty-state { padding: 18px 16px; font-size: 12px; color: var(--text-muted); line-height: 1.5; }
    .activity-empty-state strong { color: var(--text); display: block; margin-bottom: 6px; font-size: 12px; }
    .activity-empty-state code { background: var(--border); color: var(--text); padding: 2px 6px; border-radius: 3px; font-size: 11px; display: inline-block; margin-top: 4px; }
    .activity-empty-state .hint { color: var(--text-muted); font-size: 11px; margin-top: 8px; }
    .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-right: 6px; animation: pulse 2s infinite; }
    .live-dot.disconnected { background: var(--red); animation: none; }
    .live-dot.reconnecting { background: var(--yellow); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .layout { display: flex; gap: 16px; align-items: flex-start; }
    .main-content { flex: 1; min-width: 0; overflow-x: auto; }
    .activity-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--border); color: var(--text-muted); white-space: nowrap; }
    .activity-status.active { background: #0a3622; color: var(--green); }
    .activity-status.idle { background: var(--border); color: var(--text-muted); }
    .activity-status.permission-needed { background: #3b1a00; color: var(--yellow); }
    .activity-feed { overflow-y: auto; padding: 4px 0; display: flex; flex-direction: column; gap: 10px; max-height: 600px; }
    .act-tabs { margin-top: 24px; }
    .act-tab-bar { display: flex; align-items: center; border-bottom: 2px solid var(--border); }
    .act-tab { flex: 1; background: none; border: none; color: var(--text-muted); font-family: inherit; font-size: 13px; padding: 10px 0; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.15s, border-color 0.15s; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .act-tab:hover { color: var(--text); }
    .act-tab.active { color: var(--text); border-bottom-color: var(--accent); font-weight: 600; }
    .act-pane { padding: 12px 0; opacity: 1; transition: opacity 0.2s ease; }
    .act-item-list { display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
    .act-item { min-height: 60px; display: flex; align-items: center; gap: 10px; padding: 0 12px; border-radius: 6px; border-bottom: 1px solid transparent; font-size: 12px; }
    .activity-icon { width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; margin-top: 1px; }
    .activity-icon.read { background: #1e3a5f; color: var(--cyan); }
    .activity-icon.edit { background: #3b2f06; color: var(--yellow); }
    .activity-icon.bash { background: #0a3622; color: var(--green); }
    .activity-icon.write { background: #2d1b4e; color: var(--purple); }
    .activity-icon.phase { background: #3b1a00; color: var(--orange); }
    .activity-icon.event-mandatory { background: #0a2a0a; color: var(--green); }
    .activity-icon.event-optional { background: #1a2a3b; color: var(--cyan); }
    .activity-icon.skill { background: #1a0a3b; color: var(--purple); }
    .activity-icon.other { background: var(--border); color: var(--text-muted); }
    .activity-tool { font-weight: 600; color: var(--text); }
    .activity-file { color: var(--text-muted); word-break: break-all; }
    .activity-file-muted { color: var(--text-muted); font-size: 10px; word-break: break-all; }
    .activity-time { color: var(--text); font-size: 10px; margin-left: auto; white-space: nowrap; flex-shrink: 0; }
    .activity-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .activity-badge-phase { background: #3b1a00; color: var(--orange); }
    .activity-badge-event-mandatory { background: #0a2a0a; color: var(--green); }
    .activity-badge-event-optional { background: #1a2a3b; color: var(--cyan); }
    .activity-badge-skill { background: #1a0a3b; color: var(--purple); }
    .activity-icon.hook-amber { background: #3b2500; color: var(--yellow); }
    .activity-icon.hook-red { background: #3b1111; color: var(--red); }
    .activity-icon.hook-green { background: #0a3622; color: var(--green); }
    .activity-icon.hook-muted { background: #1a1a1a; color: var(--text-muted); }
    .activity-icon.hook-blue { background: #1e3a5f; color: var(--cyan); }
    .activity-icon.hook-purple { background: #2d1b4e; color: var(--purple); }
    .activity-badge-hook-amber { background: #3b2500; color: var(--yellow); }
    .activity-badge-hook-red { background: #3b1111; color: var(--red); }
    .activity-badge-hook-green { background: #0a3622; color: var(--green); }
    .activity-badge-hook-muted { background: #1a1a1a; color: var(--text-muted); }
    .activity-badge-hook-blue { background: #1e3a5f; color: var(--cyan); }
    .activity-badge-hook-purple { background: #2d1b4e; color: var(--purple); }
    .activity-phase-msg { font-weight: 600; color: var(--text); }
    .activity-idle { color: var(--text-muted); text-align: center; padding: 24px 16px; font-size: 12px; }
    .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; min-width: 120px; }
    .stat-value { font-size: 24px; font-weight: 700; }
    .stat-label { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .kanban { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px; }
    .column { flex: 1; min-width: 200px; max-width: 300px; }
    .column-header { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 8px 0; border-bottom: 2px solid var(--border); margin-bottom: 8px; display: flex; justify-content: space-between; }
    .column-count { background: var(--border); border-radius: 10px; padding: 0 8px; font-size: 11px; }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; margin-bottom: 8px; cursor: default; transition: border-color 0.15s; }
    .card:hover { border-color: var(--accent); }
    .card-id { font-size: 11px; font-weight: 700; color: var(--accent); }
    .card-title { font-size: 12px; margin-top: 4px; line-height: 1.4; }
    .card-meta { font-size: 10px; color: var(--text-muted); margin-top: 6px; display: flex; gap: 8px; }
    .badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 500; }
    .badge-ready { background: #1e3a5f; color: var(--cyan); }
    .badge-progress { background: #3b2f06; color: var(--yellow); }
    .badge-review { background: #2d1b4e; color: var(--purple); }
    .badge-fix { background: #3b1111; color: var(--red); }
    .badge-approved { background: #0a3622; color: var(--green); }
    .badge-merged { background: #1a1a2e; color: #818cf8; }
    .badge-pushed { background: #2a1a06; color: var(--orange); }
    .shard-nav { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
    .shard-nav button { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 4px 12px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; }
    .shard-nav button:hover { border-color: var(--accent); }
    .shard-nav button:disabled { opacity: 0.3; cursor: default; }
    .shard-nav span { font-size: 12px; color: var(--text-muted); }
    .detail-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.7); z-index: 100; }
    .detail-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 480px; background: var(--bg); border-left: 1px solid var(--border); padding: 24px; overflow-y: auto; z-index: 101; }
    .detail-panel h2 { font-size: 16px; margin-bottom: 16px; }
    .detail-panel .close { position: absolute; top: 12px; right: 12px; background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer; }
    .detail-section { margin-bottom: 16px; }
    .detail-section h3 { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
    .detail-section h3 .count { background: var(--border); color: var(--text-muted); border-radius: 10px; padding: 1px 7px; font-size: 10px; }
    .detail-section pre { font-size: 11px; background: var(--surface); padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
    .kv { display: grid; grid-template-columns: 110px 1fr; gap: 4px 12px; font-size: 12px; background: var(--surface); padding: 10px 12px; border: 1px solid var(--border); border-radius: 6px; }
    .kv dt { color: var(--text-muted); font-size: 11px; padding-top: 2px; }
    .kv dd { color: var(--text); word-break: break-word; }
    .kv dd a { color: var(--accent); text-decoration: none; }
    .kv dd a:hover { text-decoration: underline; }
    .kv dd .mono { font-family: inherit; color: var(--text); }
    .kv dd .muted { color: var(--text-muted); }
    .item-list { display: flex; flex-direction: column; gap: 8px; }
    .item { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 10px 12px; font-size: 12px; }
    .item-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .item-head .who { color: var(--text-muted); font-size: 11px; }
    .item-head .when { color: var(--text-muted); font-size: 11px; margin-left: auto; }
    .item-body { color: var(--text); font-size: 12px; line-height: 1.5; }
    .item-body .comment { color: var(--text); border-left: 2px solid var(--border); padding: 2px 0 2px 10px; margin-top: 6px; white-space: pre-wrap; }
    .item-foot { display: flex; gap: 12px; margin-top: 6px; font-size: 11px; color: var(--text-muted); flex-wrap: wrap; }
    .files { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
    .file-chip { background: rgba(255,255,255,0.04); border: 1px solid var(--border); padding: 1px 6px; border-radius: 3px; font-size: 10px; color: var(--text-muted); }
    .timeline-mini { display: flex; flex-direction: column; gap: 4px; font-size: 11px; }
    .timeline-mini-item { display: grid; grid-template-columns: 130px auto 1fr; gap: 8px; align-items: baseline; }
    .timeline-mini-item .t-when { color: var(--text-muted); font-size: 10px; }
    .timeline-mini-item .t-who { color: var(--text-muted); font-size: 10px; }
    .commit-list { display: flex; flex-direction: column; gap: 6px; font-size: 12px; }
    .commit { display: flex; gap: 10px; align-items: baseline; padding: 6px 10px; background: var(--surface); border: 1px solid var(--border); border-radius: 4px; }
    .commit .hash { color: var(--accent); font-size: 11px; flex-shrink: 0; }
    .commit .msg { color: var(--text); font-size: 12px; flex: 1; min-width: 0; word-break: break-word; }
    .commit .when { color: var(--text-muted); font-size: 10px; flex-shrink: 0; }
    .severity { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.04em; }
    .severity-critical { background: #4a0f0f; color: #fca5a5; }
    .severity-high { background: #3b1111; color: var(--red); }
    .severity-medium { background: #3b2f06; color: var(--yellow); }
    .severity-low { background: #1e3a5f; color: var(--cyan); }
    .empty { color: var(--text-muted); font-size: 12px; padding: 20px; text-align: center; }
    .settings-wrap { position: relative; }
    .settings-btn { background: var(--surface); border: 1px solid var(--border); color: var(--text-muted); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 14px; line-height: 1; }
    .settings-btn:hover { border-color: var(--accent); color: var(--text); }
    .settings-popover { display: none; position: absolute; right: 0; top: calc(100% + 6px); background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; min-width: 200px; z-index: 200; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
    .settings-popover.open { display: block; }
    .settings-header { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-bottom: 10px; }
    .settings-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 0; cursor: pointer; color: var(--text); }
    .settings-row input[type="checkbox"] { accent-color: var(--accent); cursor: pointer; }
    .settings-divider { border: none; border-top: 1px solid var(--border); margin: 8px 0; }
    .settings-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; line-height: 1.4; }
${NAV_CSS}`;

export function getNavCss(): string {
  return NAV_CSS;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function getNavHtml(projectName: string, activePage: "home" | "overview"): string {
  return "  <nav class=\"top-nav\">\n" +
    "    <span class=\"nav-project\">" + escHtml(projectName || "insight-flow") + "</span>\n" +
    "    <div class=\"nav-links\">\n" +
    "      <a href=\"/\" class=\"nav-link" + (activePage === "home" ? " active" : "") + "\">Home</a>\n" +
    "      <a href=\"/overview\" class=\"nav-link" + (activePage === "overview" ? " active" : "") + "\">Overview</a>\n" +
    "    </div>\n" +
    "  </nav>\n";
}

function getScript(activityEnabled: boolean, _port: number, browserNotifications: boolean, projectName: string, verbosity: string): string {
  // Base dashboard JS (Kanban, stats, timeline, detail panel, shard nav)
  let script = `
    var PROJECT_NAME = ${JSON.stringify(projectName)};
    var COLUMNS = [
      { key: 'ready', label: 'Ready', matches: ['ready'] },
      { key: 'progress', label: 'In Progress', matches: ['in-progress', 'implemented', 'changes-implementing', 'changes-implemented'] },
      { key: 'review', label: 'Review', matches: ['reviewing'] },
      { key: 'fix', label: 'Fix', matches: ['fix-needed', 'fixing', 'fixed', 'changes-requested', 'request-changes'] },
      { key: 'approved', label: 'Approved', matches: ['approved', 'pushed'] },
      { key: 'merged', label: 'Done', matches: ['merged', 'done'] },
    ];

    var tasks = [];
    var shards = [];
    var currentShard = null;
    var sock = null;
    var hookStatus = 'ok';
    var configEnabled = true;
    var hasSyncedOnce = false;
    var prevTaskSnapshot = {};

    function badgeClass(status) {
      if (['ready'].includes(status)) return 'badge-ready';
      if (['in-progress', 'implemented', 'changes-implementing', 'changes-implemented'].includes(status)) return 'badge-progress';
      if (['reviewing'].includes(status)) return 'badge-review';
      if (['fix-needed', 'fixing', 'fixed', 'changes-requested', 'request-changes'].includes(status)) return 'badge-fix';
      if (['approved', 'pushed'].includes(status)) return 'badge-approved';
      if (['merged', 'done'].includes(status)) return 'badge-merged';
      return 'badge-pushed';
    }

    function taskStatusColor(status) {
      var m = {
        'ready': '#94a3b8', 'in-progress': '#f59e0b', 'implemented': '#06b6d4',
        'reviewing': '#a855f7', 'approved': '#22c55e', 'fix-needed': '#ef4444',
        'fixing': '#dc2626', 'fixed': '#22c55e', 'pushed': '#16a34a',
        'merged': '#10b981', 'changes-requested': '#f97316',
        'changes-implementing': '#fb923c', 'changes-implemented': '#14b8a6'
      };
      return m[status] || '#737373';
    }

    function hexToRgb(hex) {
      var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
      return r + ',' + g + ',' + b;
    }

    function actItemHtml(color, innerHtml) {
      var rgb = hexToRgb(color);
      return '<div class="act-item" style="border-bottom-color:' + color + ';background:rgba(' + rgb + ',0.08)">' + innerHtml + '</div>';
    }

    function switchActTab(name) {
      var tabs = document.querySelectorAll('.act-tab');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].classList.toggle('active', tabs[i].dataset.pane === name);
      }
      var panes = document.querySelectorAll('.act-pane');
      for (var j = 0; j < panes.length; j++) {
        var pane = panes[j];
        var isActive = pane.id === 'act-pane-' + name;
        if (isActive) {
          pane.style.display = '';
          pane.offsetHeight; // force reflow so transition fires
          pane.style.opacity = '1';
        } else {
          pane.style.opacity = '0';
          (function(p) {
            setTimeout(function() { if (p.style.opacity === '0') p.style.display = 'none'; }, 200);
          })(pane);
        }
      }
    }

    function claudeStatusFromEvent(ev) {
      if (ev.tool === 'Event' && ev.action === 'start') return 'active';
      if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'agent-active') return 'active';
      if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'agent-idle') return 'idle';
      if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'approval-required') return 'permission-needed';
      if (ev.tool === 'Event' && ev.source === 'hook' && ev.action === 'tool-approved') return 'active';
      return null;
    }

    function playStatusSound(state) {
      if (localStorage.getItem('notif-sound') !== 'true') return;
      var src = state === 'idle' ? '/sounds/idle-ping.mp3'
              : state === 'permission-needed' ? '/sounds/permission-alert.mp3'
              : null;
      if (!src) return;
      try { new Audio(src).play().catch(function(){}); } catch(e) {}
    }

    function updatePageTitle(state) {
      var base = 'Taskflow Dashboard';
      var prefix = { active: '⚡', idle: '💤', 'permission-needed': '🚨' };
      document.title = state && prefix[state] ? prefix[state] + ' ' + base : base;
    }

    function formatTime(iso) {
      if (!iso) return '-';
      var d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function render() {
      var total = tasks.length;
      var merged = tasks.filter(function(t) { return ['merged', 'done'].includes(t.status); }).length;
      var active = tasks.filter(function(t) { return ['in-progress', 'implementing', 'changes-implementing'].includes(t.status); }).length;
      var reviews = tasks.reduce(function(s, t) { return s + (t.reviews || []).length; }, 0);

      document.getElementById('stats').innerHTML = [
        { value: total, label: 'Total Tasks' },
        { value: merged, label: 'Completed' },
        { value: active, label: 'Active' },
        { value: reviews, label: 'Reviews' },
      ].map(function(s) { return '<div class="stat"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>'; }).join('');

      document.getElementById('kanban').innerHTML = COLUMNS.map(function(col) {
        var colTasks = tasks.filter(function(t) { return col.matches.includes(t.status); });
        var cards = colTasks.length === 0
          ? '<div class="empty">No tasks</div>'
          : colTasks.map(function(t) {
            return '<div class="card" onclick="showDetail(\\'' + t.id + '\\')">' +
              '<div class="card-id">' + t.id + ' <span class="badge ' + badgeClass(t.status) + '">' + t.status + '</span></div>' +
              '<div class="card-title">' + escHtml(t.title) + '</div>' +
              '<div class="card-meta"><span>' + t.type + '</span><span>' + t.priority + '</span><span>' + formatTime(t.createdAt) + '</span></div>' +
            '</div>';
          }).join('');
        return '<div class="column"><div class="column-header"><span>' + col.label + '</span><span class="column-count">' + colTasks.length + '</span></div>' + cards + '</div>';
      }).join('');

      var events = [];
      for (var i = 0; i < tasks.length; i++) {
        var t = tasks[i];
        for (var j = 0; j < (t.statusHistory || []).length; j++) {
          var h = t.statusHistory[j];
          events.push({ taskId: t.id, title: t.title, status: h.status, at: h.at, by: h.by });
        }
      }
      events.sort(function(a, b) { return new Date(b.at).getTime() - new Date(a.at).getTime(); });

      var timelineEl = document.getElementById('timeline');
      if (timelineEl) {
        if (events.length === 0) {
          timelineEl.innerHTML = '<div class="activity-empty-state" style="padding:16px 0"><strong>No activity yet</strong>Task status changes will appear here as tasks move through the workflow.</div>';
        } else {
          timelineEl.innerHTML = '<div class="act-item-list">' + events.slice(0, 30).map(function(e) {
            var color = taskStatusColor(e.status);
            var inner =
              '<span style="font-weight:700;color:var(--accent);flex-shrink:0">' + escHtml(e.taskId) + '</span>' +
              '<span style="color:var(--text-muted);margin:0 4px;flex-shrink:0">→</span>' +
              '<span style="background:rgba(' + hexToRgb(color) + ',0.18);color:' + color + ';padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;flex-shrink:0">' + escHtml(e.status) + '</span>' +
              '<span style="color:var(--text);font-size:11px;flex:1;min-width:0"> by ' + escHtml(e.by || '?') + '</span>' +
              '<span style="margin-left:auto;color:var(--text);font-size:11px;white-space:nowrap;flex-shrink:0">' + formatTime(e.at) + '</span>';
            return actItemHtml(color, inner);
          }).join('') + '</div>';
        }
      }
    }

    function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function kvRow(label, value) {
      if (value === null || value === undefined || value === '') return '';
      return '<dt>' + escHtml(label) + '</dt><dd>' + value + '</dd>';
    }

    function section(title, count, body) {
      var head = '<h3>' + escHtml(title);
      if (typeof count === 'number') head += '<span class="count">' + count + '</span>';
      head += '</h3>';
      return '<div class="detail-section">' + head + body + '</div>';
    }

    function fileChips(files) {
      if (!files || !files.length) return '';
      return '<div class="files">' + files.map(function(f) {
        return '<span class="file-chip">' + escHtml(f) + '</span>';
      }).join('') + '</div>';
    }

    function renderInfo(t) {
      var rows = [
        kvRow('Type',     '<span class="mono">' + escHtml(t.type) + '</span>'),
        kvRow('Priority', '<span class="mono">' + escHtml(t.priority) + '</span>'),
        kvRow('Status',   '<span class="badge ' + badgeClass(t.status) + '">' + escHtml(t.status) + '</span>'),
        kvRow('Created',  '<span class="muted">' + formatTime(t.createdAt) + '</span>'),
        kvRow('Folder',   '<span class="mono">' + escHtml(t.folder || '—') + '</span>'),
        kvRow('Branch',   t.branch ? '<span class="mono">' + escHtml(t.branch) + '</span>' : '<span class="muted">—</span>'),
        kvRow('Tags',     (t.tags && t.tags.length) ? t.tags.map(function(x) { return '<span class="file-chip">#' + escHtml(x) + '</span>'; }).join(' ') : '<span class="muted">—</span>'),
        kvRow('PR',       t.mrUrl ? '<a href="' + escHtml(t.mrUrl) + '" target="_blank" rel="noopener">' + escHtml(t.mrUrl) + '</a>' : '<span class="muted">—</span>'),
      ].join('');
      return '<dl class="kv">' + rows + '</dl>';
    }

    function renderImplementation(impl) {
      if (!impl) return '<div class="empty">Not started</div>';
      var minutes = impl.startedAt && impl.completedAt
        ? Math.round((new Date(impl.completedAt).getTime() - new Date(impl.startedAt).getTime()) / 60000)
        : null;
      var rows = [
        kvRow('Started',   impl.startedAt   ? formatTime(impl.startedAt)   : '<span class="muted">—</span>'),
        kvRow('Completed', impl.completedAt ? formatTime(impl.completedAt) : '<span class="muted">—</span>'),
        kvRow('Duration',  minutes !== null ? '<span class="mono">' + minutes + ' min</span>' : '<span class="muted">—</span>'),
        kvRow('Tokens',    impl.tokensUsed  ? '<span class="mono">' + impl.tokensUsed.toLocaleString() + '</span>' : '<span class="muted">—</span>'),
        kvRow('Files',     (impl.filesChanged && impl.filesChanged.length) ? fileChips(impl.filesChanged) : '<span class="muted">none</span>'),
      ].join('');
      return '<dl class="kv">' + rows + '</dl>';
    }

    function renderReview(r, i) {
      var verdict = r.verdict || 'pending';
      var head = '<div class="item-head">' +
        '<strong>Round ' + (i + 1) + '</strong>' +
        '<span class="badge ' + badgeClass(verdict) + '">' + escHtml(verdict) + '</span>' +
        '<span class="who">' + escHtml(r.type || 'ai') + ' · ' + escHtml(r.by || '?') + '</span>' +
        '<span class="when">' + formatTime(r.startedAt) + (r.endedAt ? ' → ' + formatTime(r.endedAt) : '') + '</span>' +
        '</div>';
      var body = r.comment ? '<div class="item-body"><div class="comment">' + escHtml(r.comment) + '</div></div>' : '';
      var fix = '';
      if (r.fix) {
        var fixMinutes = r.fix.startedAt && r.fix.endedAt
          ? Math.round((new Date(r.fix.endedAt).getTime() - new Date(r.fix.startedAt).getTime()) / 60000)
          : null;
        fix = '<div class="item-foot">' +
          '<span>fix: <span class="badge ' + badgeClass(r.fix.status) + '">' + escHtml(r.fix.status) + '</span></span>' +
          '<span class="who">by ' + escHtml(r.fix.by || '?') + '</span>' +
          (fixMinutes !== null ? '<span>' + fixMinutes + ' min</span>' : '') +
          '</div>' +
          (r.fix.comment ? '<div class="item-body"><div class="comment">' + escHtml(r.fix.comment) + '</div></div>' : '') +
          fileChips(r.fix.filesChanged);
      }
      return '<div class="item">' + head + body + fix + '</div>';
    }

    function renderPush(p) {
      return '<div class="commit">' +
        '<span class="hash">' + escHtml((p.commitHash || '').slice(0, 8)) + '</span>' +
        '<span class="msg">' + escHtml(p.commitMessage || '') + '</span>' +
        '<span class="when">' + formatTime(p.at) + '</span>' +
        '</div>';
    }

    var SEVERITY_CLASS = { critical: 'severity-critical', high: 'severity-high', medium: 'severity-medium', low: 'severity-low' };
    function severityChip(sev) {
      var cls = SEVERITY_CLASS[sev] || 'severity-medium';
      return '<span class="severity ' + cls + '">' + escHtml(sev || 'medium') + '</span>';
    }

    function renderIncident(inc) {
      var rows = [
        kvRow('Severity', severityChip(inc.severity)),
        kvRow('Status',   '<span class="badge ' + badgeClass(inc.status) + '">' + escHtml(inc.status) + '</span>'),
        kvRow('Reported', formatTime(inc.reportedAt)),
        kvRow('Resolved', inc.resolvedAt ? formatTime(inc.resolvedAt) : '<span class="muted">—</span>'),
        kvRow('Branch',   inc.branch ? '<span class="mono">' + escHtml(inc.branch) + '</span>' : '<span class="muted">—</span>'),
      ].filter(Boolean).join('');
      var description = inc.description ? '<div class="item-body"><div class="comment">' + escHtml(inc.description) + '</div></div>' : '';
      var root = inc.rootCause ? '<div class="item-body" style="margin-top:8px"><strong style="font-size:11px;color:var(--text-muted)">ROOT CAUSE</strong><div class="comment">' + escHtml(inc.rootCause) + '</div></div>' : '';
      var fix = inc.fix ? '<div class="item-body" style="margin-top:8px"><strong style="font-size:11px;color:var(--text-muted)">FIX</strong><div class="comment">' + escHtml(inc.fix) + '</div></div>' : '';
      return '<div class="item">' +
        '<div class="item-head"><strong>' + escHtml(inc.id) + '</strong> — ' + escHtml(inc.title) + '</div>' +
        '<dl class="kv">' + rows + '</dl>' +
        description + root + fix +
        '</div>';
    }

    function renderStatusHistory(hist) {
      if (!hist || !hist.length) return '<div class="empty">No history</div>';
      var items = hist.slice().reverse().map(function(h) {
        return '<div class="timeline-mini-item">' +
          '<span class="t-when">' + formatTime(h.at) + '</span>' +
          '<span class="badge ' + badgeClass(h.status) + '">' + escHtml(h.status) + '</span>' +
          '<span class="t-who">by ' + escHtml(h.by || '?') + '</span>' +
          '</div>';
      }).join('');
      return '<div class="timeline-mini">' + items + '</div>';
    }

    function showDetail(id) {
      var t = tasks.find(function(x) { return x.id === id; });
      if (!t) return;
      var dc = document.getElementById('detail-content');
      var reviews = t.reviews || [];
      var incidents = t.incidents || [];
      var pushes = t.pushes || [];
      dc.innerHTML =
        '<h2>' + escHtml(t.id) + ' — ' + escHtml(t.title) + '</h2>' +
        section('Info', null, renderInfo(t)) +
        section('Implementation', null, renderImplementation(t.implementation)) +
        (reviews.length
          ? section('Reviews', reviews.length, '<div class="item-list">' + reviews.map(renderReview).join('') + '</div>')
          : '') +
        (pushes.length
          ? section('Pushes', pushes.length, '<div class="commit-list">' + pushes.map(renderPush).join('') + '</div>')
          : '') +
        (incidents.length
          ? section('Incidents', incidents.length, '<div class="item-list">' + incidents.map(renderIncident).join('') + '</div>')
          : '') +
        section('Status history', (t.statusHistory || []).length, renderStatusHistory(t.statusHistory));
      document.getElementById('detail').style.display = 'block';
      document.getElementById('overlay').style.display = 'block';
    }

    function closeDetail() {
      document.getElementById('detail').style.display = 'none';
      document.getElementById('overlay').style.display = 'none';
    }

    async function loadShardIndex() {
      var res = await fetch('/api/work-tasks');
      var files = await res.json();
      shards = files.filter(function(f) { return f.startsWith('tasks-'); }).sort(function(a, b) { return b.localeCompare(a); });
      if (shards.length > 0 && !currentShard) currentShard = shards[0];
      renderShardNav();
    }

    async function loadShard(name) {
      currentShard = name;
      var results = await Promise.all([
        fetch('/api/work-tasks/' + name),
        fetch('/api/work-tasks/master.json'),
      ]);
      var shard = await results[0].json();
      var newTasks = shard.tasks || [];
      checkStatusTransitions(newTasks);
      tasks = newTasks;
      try {
        var master = await results[1].json();
        var current = master && master.meta && master.meta.currentTaskId ? master.meta.currentTaskId : null;
        var label = 'Shard: ' + name.replace('tasks-', '').replace('.json', '') + ' · ' + tasks.length + ' tasks';
        if (current) label += ' · current ' + current;
        document.getElementById('project-name').textContent = label;
      } catch(e) {}
      renderShardNav();
      render();
    }

    function renderShardNav() {
      var idx = shards.indexOf(currentShard);
      var nav = document.getElementById('shard-nav');
      nav.innerHTML =
        '<button ' + (idx <= 0 ? 'disabled' : '') + ' onclick="loadShard(shards[' + (idx - 1) + '])">&laquo; Newer</button>' +
        '<span>' + (currentShard || '...').replace('tasks-', '').replace('.json', '') + ' (' + (idx + 1) + '/' + shards.length + ')</span>' +
        '<button ' + (idx >= shards.length - 1 ? 'disabled' : '') + ' onclick="loadShard(shards[' + (idx + 1) + '])">&raquo; Older</button>';
    }

    function setConnectionStatus(status) {
      var dot = document.getElementById('status-dot');
      dot.className = 'live-dot';
      if (status === 'disconnected') dot.classList.add('disconnected');
      else if (status === 'reconnecting') dot.classList.add('reconnecting');
    }` + (browserNotifications ? `

    var NOTIF_WATCHED = ['implemented', 'approved', 'fix-needed', 'merged', 'changes-requested'];
    var notifSettings = { statuses: {}, sound: true, muteFocused: false };

    function loadNotifSettings() {
      try {
        var raw = localStorage.getItem('tf-notif-settings');
        if (raw) {
          var parsed = JSON.parse(raw);
          notifSettings = parsed;
        } else {
          for (var i = 0; i < NOTIF_WATCHED.length; i++) notifSettings.statuses[NOTIF_WATCHED[i]] = true;
        }
      } catch(e) {
        for (var i = 0; i < NOTIF_WATCHED.length; i++) notifSettings.statuses[NOTIF_WATCHED[i]] = true;
      }
    }

    function saveNotifSettings() {
      notifSettings.statuses = {};
      notifSettings.sound = document.getElementById('notif-sound') ? document.getElementById('notif-sound').checked : true;
      notifSettings.muteFocused = document.getElementById('notif-mute-focused') ? document.getElementById('notif-mute-focused').checked : false;
      for (var i = 0; i < NOTIF_WATCHED.length; i++) {
        var s = NOTIF_WATCHED[i];
        var el = document.getElementById('notif-' + s);
        notifSettings.statuses[s] = el ? el.checked : true;
      }
      try { localStorage.setItem('tf-notif-settings', JSON.stringify(notifSettings)); } catch(e) {}
    }

    function syncSettingsUI() {
      for (var i = 0; i < NOTIF_WATCHED.length; i++) {
        var s = NOTIF_WATCHED[i];
        var el = document.getElementById('notif-' + s);
        if (el) el.checked = notifSettings.statuses[s] !== false;
      }
      var snd = document.getElementById('notif-sound');
      if (snd) snd.checked = notifSettings.sound !== false;
      var mf = document.getElementById('notif-mute-focused');
      if (mf) mf.checked = !!notifSettings.muteFocused;
    }

    function toggleSettings() {
      var pop = document.getElementById('settings-popover');
      if (!pop) return;
      var open = pop.classList.toggle('open');
      if (open) {
        syncSettingsUI();
        updatePermissionHint();
        document.addEventListener('click', outsideSettingsClick, true);
      } else {
        document.removeEventListener('click', outsideSettingsClick, true);
      }
    }

    function outsideSettingsClick(e) {
      var wrap = document.querySelector('.settings-wrap');
      if (wrap && !wrap.contains(e.target)) {
        var pop = document.getElementById('settings-popover');
        if (pop) pop.classList.remove('open');
        document.removeEventListener('click', outsideSettingsClick, true);
      }
    }

    function updatePermissionHint() {
      var hint = document.getElementById('notif-permission-hint');
      if (!hint) return;
      if (!('Notification' in window)) {
        hint.textContent = 'Notifications not supported in this browser.';
      } else if (Notification.permission === 'denied') {
        hint.textContent = 'Permission denied. Allow notifications in browser settings.';
      } else if (Notification.permission === 'default') {
        hint.textContent = 'Click a status toggle to enable notifications.';
      } else {
        hint.textContent = '';
      }
    }

    function requestNotifPermission(callback) {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        if (callback) callback();
        return;
      }
      if (Notification.permission === 'denied') return;
      Notification.requestPermission().then(function(perm) {
        updatePermissionHint();
        if (perm === 'granted' && callback) callback();
      });
    }

    function checkStatusTransitions(newTasks) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (notifSettings.muteFocused && !document.hidden) return;
      for (var i = 0; i < newTasks.length; i++) {
        var t = newTasks[i];
        var prev = prevTaskSnapshot[t.id];
        if (prev && prev !== t.status && notifSettings.statuses[t.status] !== false && NOTIF_WATCHED.indexOf(t.status) >= 0) {
          fireDesktopNotif(t.id, t.status, notifSettings.sound !== false);
        }
        prevTaskSnapshot[t.id] = t.status;
      }
    }

    function fireDesktopNotif(taskId, status, sound) {
      var title = (PROJECT_NAME ? PROJECT_NAME + ': ' : '') + taskId + ' → ' + status;
      try {
        new Notification(title, { silent: !sound });
      } catch(e) {}
    }

    // On first load request permission if not yet decided
    (function() {
      loadNotifSettings();
      if ('Notification' in window && Notification.permission === 'default') {
        try { localStorage.getItem('tf-notif-asked'); } catch(e) {}
        var asked = false;
        try { asked = !!localStorage.getItem('tf-notif-asked'); } catch(e) {}
        if (!asked) {
          requestNotifPermission(null);
          try { localStorage.setItem('tf-notif-asked', '1'); } catch(e) {}
        }
      }
    })();` : `

    function checkStatusTransitions() {}`) + `

    function connectWS() {
      // socket.io-client is loaded by /socket.io/socket.io.js (served by the
      // Socket.IO server). Falls back to long-polling automatically if WS
      // upgrade fails for any reason. Reconnection is built-in.
      sock = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });

      sock.on('connect', function() {
        setConnectionStatus('connected');
        if (hasSyncedOnce && currentShard) {
          // Re-fetch state on every reconnect so anything that happened
          // during the disconnect window is recovered.
          loadShardIndex().then(function() {
            if (currentShard) return loadShard(currentShard);
          });
        }
        hasSyncedOnce = true;
      });

      sock.on('disconnect', function() { setConnectionStatus('reconnecting'); });
      sock.on('reconnect_attempt', function() { setConnectionStatus('reconnecting'); });
      sock.on('connect_error', function() { setConnectionStatus('reconnecting'); });

      sock.on('snapshot', function(data) {
        if (data && typeof data.hookStatus === 'string') hookStatus = data.hookStatus;
        if (data && typeof data.configEnabled === 'boolean') configEnabled = data.configEnabled;
        if (data && data.activity && typeof addActivityEvent === 'function') {
          // Reset feed to server's authoritative state on every snapshot
          // (including reconnects) so stale client-side events are not
          // duplicated each time Socket.IO re-establishes the connection.
          activityEvents = [];
          if (typeof seenEventKeys !== 'undefined') seenEventKeys.clear();
          var feed = document.getElementById('activity-feed');
          if (feed) feed.innerHTML = '';
          for (var i = 0; i < data.activity.length; i++) {
            addActivityEvent(data.activity[i]);
          }
        }
        if (typeof renderActivityEmptyState === 'function') {
          renderActivityEmptyState();
        }
        if (typeof refreshTimestamps === 'function') refreshTimestamps();
      });

      sock.on('file-change', function() {
        loadShardIndex().then(function() {
          if (currentShard) return loadShard(currentShard);
        });
        if (typeof refreshTimestamps === 'function') refreshTimestamps();
      });

      sock.on('activity', function(ev) {
        if (typeof addActivityEvent === 'function') addActivityEvent(ev);
        if (typeof refreshTimestamps === 'function') refreshTimestamps();
      });
    }`;

  // Activity panel JS (only if enabled)
  if (activityEnabled) {
    script += `

    var VERBOSITY = ${JSON.stringify(verbosity)};
    var ACTIVITY_CAP = 50;
    var activityEvents = [];
    var seenEventKeys = new Set();
    var emptyStateTimer = null;

    function eventKey(ev) {
      return (ev.ts || '') + '|' + (ev.tool || '') + '|' + (ev.action || '') + '|' + (ev.message || ev.file || '');
    }

    function refreshTimestamps() {
      var items = document.querySelectorAll('.activity-time[data-ts]');
      for (var i = 0; i < items.length; i++) {
        items[i].textContent = relativeTime(items[i].getAttribute('data-ts'));
      }
    }

    function toolIcon(tool) {
      var t = (tool || '').toLowerCase();
      if (t === 'read' || t === 'glob' || t === 'grep') return { cls: 'read', icon: 'R' };
      if (t === 'edit') return { cls: 'edit', icon: 'E' };
      if (t === 'write') return { cls: 'write', icon: 'W' };
      if (t === 'bash') return { cls: 'bash', icon: '$' };
      return { cls: 'other', icon: '?' };
    }

    function relativeTime(ts) {
      var diff = Date.now() - new Date(ts).getTime();
      if (diff < 1000) return 'now';
      if (diff < 60000) return Math.floor(diff / 1000) + 's';
      if (diff < 3600000) return Math.floor(diff / 60000) + 'm';
      return Math.floor(diff / 3600000) + 'h';
    }

    function shouldShowEvent(ev) {
      var tool = ev.tool || '';
      // milestones: hook-sourced Events and Skills only — not agent-emitted Activity phase markers
      if (VERBOSITY === 'milestones') return tool === 'Event' || tool === 'Phase' || tool === 'Skill';
      if (VERBOSITY === 'detailed') return tool !== 'Activity' && tool !== 'Event' && tool !== 'Phase' && tool !== 'Skill';
      return true;
    }

    function addActivityEvent(ev) {
      var key = ev.id || eventKey(ev);
      if (seenEventKeys.has(key)) return;
      seenEventKeys.add(key);
      activityEvents.unshift(ev);
      if (activityEvents.length > ACTIVITY_CAP) activityEvents = activityEvents.slice(0, ACTIVITY_CAP);

      var newStatus = claudeStatusFromEvent(ev);
      if (newStatus) {
        updateActivityStatus(newStatus);
        updatePageTitle(newStatus);
        if (newStatus === 'idle' || newStatus === 'permission-needed') playStatusSound(newStatus);
      }

      if (emptyStateTimer) { clearTimeout(emptyStateTimer); emptyStateTimer = null; }
      var empty = document.querySelector('.activity-empty-state');
      if (empty) empty.remove();

      if (shouldShowEvent(ev)) prependActivityItem(ev);
      trimActivityFeed();
    }

    function eventColor(ev) {
      if (ev.tool === 'Event' && ev.source === 'hook') return hookEventColor(ev.action || '');
      if (ev.tool === 'Skill') return '#a855f7';
      if (ev.tool === 'Phase') return '#06b6d4';
      if (ev.tool === 'Activity') return '#f59e0b';
      if (ev.tool === 'Tool') return '#22c55e';
      return '#737373';
    }

    function prependActivityItem(ev) {
      var feed = document.getElementById('activity-feed');
      if (!feed) return;
      var idle = feed.querySelector('.activity-idle');
      if (idle) idle.remove();
      var color = eventColor(ev);
      var item = document.createElement('div');
      item.className = 'act-item';
      item.dataset.eventId = ev.id || '';
      item.style.borderBottomColor = color;
      item.style.background = 'rgba(' + hexToRgb(color) + ',0.08)';
      item.innerHTML = renderActivityItemHtml(ev);
      feed.insertBefore(item, feed.firstChild);
    }

    function trimActivityFeed() {
      var feed = document.getElementById('activity-feed');
      if (!feed) return;
      var items = feed.querySelectorAll('.act-item');
      for (var i = ACTIVITY_CAP; i < items.length; i++) {
        items[i].remove();
      }
    }

    function renderActivityItemHtml(ev) {
      var tool = ev.tool || '?';
      var ts = ev.ts || '';

      if (tool === 'Activity') {
        var actMsg = escHtml(ev.message || '');
        return '<div class="activity-icon phase">&#9670;</div>' +
          '<div style="flex:1;min-width:0">' +
            '<span class="activity-phase-msg">' + actMsg + '</span>' +
          '</div>' +
          '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
      }

      if (tool === 'Event') {
        var evtType = ev.action || 'event';
        var evtSource = ev.source || 'agent';

        if (evtSource === 'hook') {
          var hIconCls, hBadgeCls, hIcon, hDetail = '';
          if (evtType === 'approval-required') {
            hIconCls = 'hook-amber'; hBadgeCls = 'hook-amber'; hIcon = '&#9888;';
            if (ev.toolName || ev.inputSummary) hDetail = escHtml(ev.toolName ? String(ev.toolName) : String(ev.inputSummary || '')).slice(0, 40);
          } else if (evtType === 'approval-denied' || evtType === 'tool-blocked') {
            hIconCls = 'hook-red'; hBadgeCls = 'hook-red'; hIcon = '&#10005;';
            if (ev.toolName) hDetail = escHtml(String(ev.toolName));
          } else if (evtType === 'approval-granted' || evtType === 'tool-approved') {
            hIconCls = 'hook-green'; hBadgeCls = 'hook-green'; hIcon = '&#10003;';
            if (ev.toolName) hDetail = escHtml(String(ev.toolName));
          } else if (evtType === 'tool-requested' || evtType === 'tool-failed') {
            hIconCls = evtType === 'tool-failed' ? 'hook-red' : 'hook-blue';
            hBadgeCls = evtType === 'tool-failed' ? 'hook-red' : 'hook-blue';
            hIcon = evtType === 'tool-failed' ? '&#10005;' : '&#9654;';
            if (ev.toolName) hDetail = escHtml(String(ev.toolName));
          } else if (evtType === 'session-start' || evtType === 'session-end') {
            hIconCls = 'hook-muted'; hBadgeCls = 'hook-muted'; hIcon = '&#9711;';
          } else if (evtType === 'agent-active') {
            hIconCls = 'hook-blue'; hBadgeCls = 'hook-blue'; hIcon = '&#9679;';
            if (ev.promptPreview) hDetail = escHtml(String(ev.promptPreview));
          } else if (evtType === 'agent-idle') {
            hIconCls = 'hook-muted'; hBadgeCls = 'hook-muted'; hIcon = '&#9675;';
          } else if (evtType === 'turn-failed') {
            hIconCls = 'hook-red'; hBadgeCls = 'hook-red'; hIcon = '&#9888;';
            if (ev.errorType) hDetail = escHtml(String(ev.errorType));
          } else if (evtType === 'subagent-start' || evtType === 'subagent-done') {
            hIconCls = 'hook-purple'; hBadgeCls = 'hook-purple'; hIcon = '&#10022;';
            if (ev.agentType) hDetail = escHtml(String(ev.agentType));
          } else if (evtType === 'file-written' || evtType === 'file-edited') {
            hIconCls = 'hook-blue'; hBadgeCls = 'hook-blue'; hIcon = '&#9999;';
            if (ev.file) hDetail = escHtml(String(ev.file).split('/').slice(-2).join('/'));
          } else if (evtType === 'context-compacted') {
            hIconCls = 'hook-muted'; hBadgeCls = 'hook-muted'; hIcon = '&#8623;';
          } else {
            hIconCls = 'hook-muted'; hBadgeCls = 'hook-muted'; hIcon = '&#9679;';
          }
          return '<div class="activity-icon ' + hIconCls + '">' + hIcon + '</div>' +
            '<div style="flex:1;min-width:0">' +
              '<span class="activity-badge activity-badge-' + hBadgeCls + '">' + escHtml(evtType) + '</span>' +
              (hDetail ? ' <span class="activity-file-muted">' + hDetail + '</span>' : '') +
              (ev.taskId ? ' <span class="activity-file-muted" style="opacity:0.6">' + escHtml(String(ev.taskId)) + '</span>' : '') +
            '</div>' +
            '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
        }

        var isMandatory = evtType === 'start' || evtType === 'done';
        var evtIconClass = isMandatory ? 'event-mandatory' : 'event-optional';
        var evtBadgeClass = isMandatory ? 'activity-badge-event-mandatory' : 'activity-badge-event-optional';
        var evtIcon = evtType === 'done' ? '&#10003;' : evtType === 'start' ? '&#9654;' : '&#9679;';
        return '<div class="activity-icon ' + evtIconClass + '">' + evtIcon + '</div>' +
          '<div style="flex:1;min-width:0">' +
            '<span class="activity-badge ' + evtBadgeClass + '">' + escHtml(evtType) + '</span>' +
            (ev.taskId ? ' <span class="activity-file-muted">' + escHtml(ev.taskId) + '</span>' : '') +
          '</div>' +
          '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
      }

      if (tool === 'Phase') {
        var phaseAction = ev.action || 'milestone';
        var phaseMsg = escHtml(ev.message || phaseAction);
        return '<div class="activity-icon phase">&#9670;</div>' +
          '<div style="flex:1;min-width:0">' +
            '<span class="activity-badge activity-badge-phase">' + escHtml(phaseAction) + '</span> ' +
            '<span class="activity-phase-msg">' + phaseMsg + '</span>' +
          '</div>' +
          '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
      }

      if (tool === 'Skill') {
        var skillName = escHtml(ev.skill || '?');
        var skillAction = escHtml(ev.action || '');
        return '<div class="activity-icon skill">&#9889;</div>' +
          '<div style="flex:1;min-width:0">' +
            '<span class="activity-badge activity-badge-skill">' + skillAction + '</span> ' +
            '<span class="activity-tool">/' + skillName + '</span>' +
          '</div>' +
          '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
      }

      if (tool === 'Tool' && ev.label) {
        var labelHtml = escHtml(ev.label);
        var rawHtml = ev.file ? '<div class="activity-file-muted">' + escHtml(ev.file.slice(0, 80)) + '</div>' : '';
        return '<div class="activity-icon bash">$</div>' +
          '<div style="flex:1;min-width:0">' +
            '<span class="activity-tool">' + labelHtml + '</span>' + rawHtml +
          '</div>' +
          '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
      }

      var icon = toolIcon(tool);
      var fileStr = ev.file ? '<div class="activity-file">' + escHtml(ev.file) + '</div>' : '';
      return '<div class="activity-icon ' + icon.cls + '">' + icon.icon + '</div>' +
        '<div style="flex:1;min-width:0"><span class="activity-tool">' + escHtml(tool) + '</span> ' +
        '<span style="color:var(--text-muted);font-size:10px">' + escHtml(ev.action || '') + '</span>' +
        fileStr + '</div>' +
        '<span class="activity-time" data-ts="' + escHtml(ts) + '">' + relativeTime(ts) + '</span>';
    }

    function activityEmptyStateMessage() {
      var installHint = {
        hint: 'Run from the project root:',
        command: 'insight-flow install-activity-hook',
        hintAfter: 'Already-installed projects re-run safely (no-op).',
      };
      if (hookStatus === 'hook-missing') {
        return Object.assign({
          headline: 'Activity hook not installed',
          body: 'The dashboard receives events from a Claude Code PostToolUse hook script that has not been created in this project yet.',
        }, installHint);
      }
      if (hookStatus === 'settings-missing') {
        return Object.assign({
          headline: 'Activity hook registered settings missing',
          body: 'The hook script exists but no PostToolUse entry references it in .claude/settings.local.json.',
        }, installHint);
      }
      if (hookStatus === 'both-missing') {
        return Object.assign({
          headline: 'Activity hook not installed',
          body: 'Neither .claude/hooks/taskflow-activity.sh nor a PostToolUse registration exists in this project.',
        }, installHint);
      }
      if (hookStatus === 'ok') {
        return {
          headline: 'Waiting for Claude activity',
          body: 'The hook is installed and the dashboard is connected. If events do not appear, restart your Claude Code session — settings.local.json is read at session start, so a hook added mid-session is not picked up until you launch a new session.',
        };
      }
      return null;
    }

    function paintActivityEmptyState() {
      var feed = document.getElementById('activity-feed');
      if (!feed) return;
      var existing = feed.querySelector('.activity-empty-state');
      if (activityEvents.length > 0) {
        if (existing) existing.remove();
        return;
      }
      var msg = activityEmptyStateMessage();
      if (!msg) return;
      if (existing) existing.remove();
      var idle = feed.querySelector('.activity-idle');
      if (idle) idle.remove();
      var box = document.createElement('div');
      box.className = 'activity-empty-state';
      var html = '<strong>' + escHtml(msg.headline) + '</strong>' + escHtml(msg.body);
      if (msg.hint) html += '<div class="hint">' + escHtml(msg.hint) + '</div>';
      if (msg.command) html += '<code>' + escHtml(msg.command) + '</code>';
      if (msg.hintAfter) html += '<div class="hint">' + escHtml(msg.hintAfter) + '</div>';
      box.innerHTML = html;
      feed.appendChild(box);
    }

    function renderActivityEmptyState() {
      if (emptyStateTimer) { clearTimeout(emptyStateTimer); emptyStateTimer = null; }
      var feed = document.getElementById('activity-feed');
      if (!feed) return;
      if (activityEvents.length > 0) {
        paintActivityEmptyState();
        return;
      }
      if (hookStatus === 'ok') {
        emptyStateTimer = setTimeout(function() {
          emptyStateTimer = null;
          paintActivityEmptyState();
        }, 3000);
        return;
      }
      paintActivityEmptyState();
    }

    function updateActivityStatus(state) {
      var el = document.getElementById('activity-status');
      if (!el) return;
      if (state === 'active') {
        el.textContent = 'active';
        el.className = 'activity-status active';
      } else if (state === 'idle') {
        el.textContent = 'idle';
        el.className = 'activity-status idle';
      } else if (state === 'permission-needed') {
        el.textContent = '🚨 permission';
        el.className = 'activity-status permission-needed';
      } else {
        el.textContent = '';
        el.className = 'activity-status';
      }
    }

    function hookEventColor(evtType) {
      if (evtType === 'approval-required') return '#eab308';
      if (evtType === 'approval-denied' || evtType === 'tool-blocked' || evtType === 'turn-failed' || evtType === 'tool-failed') return '#ef4444';
      if (evtType === 'approval-granted' || evtType === 'tool-approved') return '#22c55e';
      if (evtType === 'subagent-start' || evtType === 'subagent-done') return '#a855f7';
      if (evtType === 'agent-active' || evtType === 'tool-requested') return '#06b6d4';
      if (evtType === 'file-written' || evtType === 'file-edited') return '#06b6d4';
      return '#737373';
    }

    // Show idle badge immediately on load
    updateActivityStatus('idle');
    updatePageTitle('idle');

    // Refresh timestamps every 30s as fallback
    setInterval(refreshTimestamps, 30000);`;
  }

  // Init
  script += `

    loadShardIndex().then(function() {
      if (currentShard) loadShard(currentShard);
    });
    connectWS();`;

  return script;
}
