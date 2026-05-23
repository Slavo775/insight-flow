import type { TaskflowConfig } from "../types.js";

export function getDashboardHtml(config: TaskflowConfig): string {
  const activityEnabled = config.activityEngine?.enabled !== false;
  const browserNotifications = config.notifications?.browser !== false;
  const port = config.server.port;

  return "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n" +
    "  <meta charset=\"UTF-8\">\n" +
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
    "  <title>Taskflow Dashboard</title>\n" +
    "  <style>\n" + CSS + "\n  </style>\n" +
    "</head>\n<body>\n" +
    "  <div class=\"top-bar\">\n" +
    "    <div>\n" +
    "      <h1><span class=\"live-dot\" id=\"status-dot\"></span>Taskflow Dashboard</h1>\n" +
    "      <p class=\"subtitle\" id=\"project-name\">Loading...</p>\n" +
    "    </div>\n" +
    "    <div class=\"top-bar-actions\">\n" +
    (activityEnabled
      ? ""
      : "      <span class=\"engine-chip engine-off\" title=\"Set activityEngine.enabled to true in taskflow.config.json to enable\">Engine: off (config)</span>\n") +
    (activityEnabled
      ? "      <button class=\"toggle-activity\" id=\"toggle-activity\" onclick=\"toggleActivity()\">Activity ▶</button>\n"
      : "") +
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
    "      <div class=\"timeline\" id=\"timeline\"></div>\n" +
    "    </div>\n" +
    (activityEnabled
      ? "    <div class=\"activity-panel\" id=\"activity-panel\">\n" +
        "      <div class=\"activity-header\">\n" +
        "        <h2>Claude Activity</h2>\n" +
        "        <span class=\"activity-status\" id=\"activity-status\">idle</span>\n" +
        "      </div>\n" +
        "      <div class=\"activity-feed\" id=\"activity-feed\"></div>\n" +
        "    </div>\n"
      : "") +
    "  </div>\n" +
    "\n" +
    "  <div class=\"detail-overlay\" id=\"overlay\" onclick=\"closeDetail()\"></div>\n" +
    "  <div class=\"detail-panel\" id=\"detail\" style=\"display:none\">\n" +
    "    <button class=\"close\" onclick=\"closeDetail()\">&times;</button>\n" +
    "    <div id=\"detail-content\"></div>\n" +
    "  </div>\n" +
    "\n" +
    "  <script src=\"/socket.io/socket.io.js\"></script>\n" +
    "  <script>\n" + getScript(activityEnabled, port, browserNotifications) + "\n  </script>\n" +
    "</body>\n</html>";
}

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
    .toggle-activity { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 6px 14px; border-radius: 4px; cursor: pointer; font-family: inherit; font-size: 12px; }
    .toggle-activity:hover { border-color: var(--accent); }
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
    .layout { display: flex; gap: 16px; }
    .main-content { flex: 1; min-width: 0; }
    .activity-panel { width: 340px; flex-shrink: 0; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; display: none; max-height: calc(100vh - 120px); overflow: hidden; flex-direction: column; }
    .activity-panel.open { display: flex; }
    .activity-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border); }
    .activity-header h2 { font-size: 13px; font-weight: 600; }
    .activity-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; background: var(--border); color: var(--text-muted); }
    .activity-status.active { background: #0a3622; color: var(--green); }
    .activity-feed { flex: 1; overflow-y: auto; padding: 8px 0; }
    .activity-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 16px; font-size: 11px; border-bottom: 1px solid var(--border); }
    .activity-item:hover { background: rgba(255,255,255,0.02); }
    .activity-icon { width: 18px; height: 18px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; margin-top: 1px; }
    .activity-icon.read { background: #1e3a5f; color: var(--cyan); }
    .activity-icon.edit { background: #3b2f06; color: var(--yellow); }
    .activity-icon.bash { background: #0a3622; color: var(--green); }
    .activity-icon.write { background: #2d1b4e; color: var(--purple); }
    .activity-icon.other { background: var(--border); color: var(--text-muted); }
    .activity-tool { font-weight: 600; color: var(--text); }
    .activity-file { color: var(--text-muted); word-break: break-all; }
    .activity-time { color: var(--text-muted); font-size: 10px; margin-left: auto; white-space: nowrap; flex-shrink: 0; }
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
    .timeline { margin-top: 24px; }
    .timeline h2 { font-size: 14px; margin-bottom: 12px; }
    .timeline-item { display: flex; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
    .timeline-time { color: var(--text-muted); min-width: 140px; }
    .timeline-event { flex: 1; }
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
    .settings-hint { font-size: 11px; color: var(--text-muted); margin-top: 8px; line-height: 1.4; }`;

function getScript(activityEnabled: boolean, _port: number, browserNotifications: boolean): string {
  // Base dashboard JS (Kanban, stats, timeline, detail panel, shard nav)
  let script = `
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

      document.getElementById('timeline').innerHTML =
        '<h2>Recent Activity</h2>' +
        events.slice(0, 20).map(function(e) {
          return '<div class="timeline-item"><span class="timeline-time">' + formatTime(e.at) + '</span>' +
          '<span class="timeline-event"><strong>' + e.taskId + '</strong> &rarr; <span class="badge ' + badgeClass(e.status) + '">' + e.status + '</span> by ' + (e.by || '?') + '</span></div>';
        }).join('');
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
      try {
        new Notification(taskId + ' → ' + status, { silent: !sound });
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
          for (var i = 0; i < data.activity.length; i++) {
            addActivityEvent(data.activity[i]);
          }
        }
        if (typeof renderActivityEmptyState === 'function') {
          renderActivityEmptyState();
        }
      });

      sock.on('file-change', function() {
        loadShardIndex().then(function() {
          if (currentShard) return loadShard(currentShard);
        });
      });

      sock.on('activity', function(ev) {
        if (typeof addActivityEvent === 'function') addActivityEvent(ev);
      });
    }`;

  // Activity panel JS (only if enabled)
  if (activityEnabled) {
    script += `

    var activityPanelOpen = false;
    var lastActivityTime = 0;
    var idleTimer = null;
    var autoScroll = true;
    var activityEvents = [];
    var emptyStateTimer = null;

    function toggleActivity() {
      activityPanelOpen = !activityPanelOpen;
      var panel = document.getElementById('activity-panel');
      var btn = document.getElementById('toggle-activity');
      if (activityPanelOpen) {
        panel.classList.add('open');
        btn.textContent = 'Activity ◀';
        renderActivityEmptyState();
      } else {
        panel.classList.remove('open');
        btn.textContent = 'Activity ▶';
        if (emptyStateTimer) { clearTimeout(emptyStateTimer); emptyStateTimer = null; }
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

    function addActivityEvent(ev) {
      activityEvents.push(ev);
      if (activityEvents.length > 200) activityEvents = activityEvents.slice(-200);
      lastActivityTime = Date.now();
      updateActivityStatus(true);
      if (emptyStateTimer) { clearTimeout(emptyStateTimer); emptyStateTimer = null; }
      var empty = document.querySelector('.activity-empty-state');
      if (empty) empty.remove();
      renderActivityItem(ev);

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function() { updateActivityStatus(false); }, 5000);
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
        // Defer the "Waiting for Claude activity" message ~3 s so it does
        // not flash before the first event in a healthy session. The timer
        // is cleared if an event arrives or the panel closes meanwhile.
        emptyStateTimer = setTimeout(function() {
          emptyStateTimer = null;
          paintActivityEmptyState();
        }, 3000);
        return;
      }
      paintActivityEmptyState();
    }

    function updateActivityStatus(active) {
      var el = document.getElementById('activity-status');
      if (!el) return;
      if (active) {
        el.textContent = 'active';
        el.className = 'activity-status active';
      } else {
        el.textContent = 'idle';
        el.className = 'activity-status';
      }
    }

    function renderActivityItem(ev) {
      var feed = document.getElementById('activity-feed');
      if (!feed) return;

      // Remove idle message if present
      var idle = feed.querySelector('.activity-idle');
      if (idle) idle.remove();

      var icon = toolIcon(ev.tool);
      var fileStr = ev.file ? '<div class="activity-file">' + escHtml(ev.file) + '</div>' : '';
      var item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML =
        '<div class="activity-icon ' + icon.cls + '">' + icon.icon + '</div>' +
        '<div style="flex:1;min-width:0"><span class="activity-tool">' + escHtml(ev.tool || '?') + '</span> ' +
        '<span style="color:var(--text-muted);font-size:10px">' + escHtml(ev.action || '') + '</span>' +
        fileStr + '</div>' +
        '<span class="activity-time">' + relativeTime(ev.ts) + '</span>';

      feed.appendChild(item);

      // Auto-scroll if user hasn't scrolled up
      if (autoScroll) {
        feed.scrollTop = feed.scrollHeight;
      }
    }

    // Pause auto-scroll when user scrolls up
    (function() {
      var feed = document.getElementById('activity-feed');
      if (feed) {
        feed.addEventListener('scroll', function() {
          var atBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 40;
          autoScroll = atBottom;
        });
      }
    })();`;
  }

  // Init
  script += `

    loadShardIndex().then(function() {
      if (currentShard) loadShard(currentShard);
    });
    connectWS();`;

  return script;
}
