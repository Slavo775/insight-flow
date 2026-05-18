import type { TaskflowConfig } from "../types.js";

export function getDashboardHtml(config: TaskflowConfig): string {
  const activityEnabled = config.activityEngine?.enabled !== false;
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
    (activityEnabled
      ? "    <button class=\"toggle-activity\" id=\"toggle-activity\" onclick=\"toggleActivity()\">Activity ▶</button>\n"
      : "") +
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
    "  <script>\n" + getScript(activityEnabled, port) + "\n  </script>\n" +
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
    .detail-section h3 { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .detail-section pre { font-size: 11px; background: var(--surface); padding: 8px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; }
    .empty { color: var(--text-muted); font-size: 12px; padding: 20px; text-align: center; }`;

function getScript(activityEnabled: boolean, _port: number): string {
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
    var ws = null;
    var wsConnected = false;

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

    function showDetail(id) {
      var t = tasks.find(function(x) { return x.id === id; });
      if (!t) return;
      var dc = document.getElementById('detail-content');
      dc.innerHTML =
        '<h2>' + t.id + ' — ' + escHtml(t.title) + '</h2>' +
        '<div class="detail-section"><h3>Info</h3><pre>' + JSON.stringify({ type: t.type, priority: t.priority, status: t.status, created: t.createdAt, folder: t.folder, branch: t.branch, mrUrl: t.mrUrl }, null, 2) + '</pre></div>' +
        '<div class="detail-section"><h3>Implementation</h3><pre>' + JSON.stringify(t.implementation, null, 2) + '</pre></div>' +
        (t.reviews && t.reviews.length ? '<div class="detail-section"><h3>Reviews (' + t.reviews.length + ')</h3><pre>' + JSON.stringify(t.reviews, null, 2) + '</pre></div>' : '') +
        (t.pushes && t.pushes.length ? '<div class="detail-section"><h3>Pushes (' + t.pushes.length + ')</h3><pre>' + JSON.stringify(t.pushes, null, 2) + '</pre></div>' : '') +
        (t.incidents && t.incidents.length ? '<div class="detail-section"><h3>Incidents (' + t.incidents.length + ')</h3><pre>' + JSON.stringify(t.incidents, null, 2) + '</pre></div>' : '') +
        '<div class="detail-section"><h3>Status History</h3><pre>' + JSON.stringify(t.statusHistory, null, 2) + '</pre></div>';
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
      tasks = shard.tasks || [];
      try {
        await results[1].json();
        document.getElementById('project-name').textContent = 'Shard: ' + name.replace('tasks-', '').replace('.json', '') + ' · ' + tasks.length + ' tasks';
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
    }

    function connectWS() {
      var protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(protocol + '//' + location.host + '/ws');

      ws.onopen = function() {
        wsConnected = true;
        setConnectionStatus('connected');
      };

      ws.onmessage = function(e) {
        try {
          var msg = JSON.parse(e.data);
          if (msg.type === 'file-change' && currentShard) {
            loadShard(currentShard);
          } else if (msg.type === 'snapshot') {
            if (msg.data && msg.data.activity && typeof addActivityEvent === 'function') {
              for (var i = 0; i < msg.data.activity.length; i++) {
                addActivityEvent(msg.data.activity[i]);
              }
            }
          } else if (msg.type === 'activity' && typeof addActivityEvent === 'function') {
            addActivityEvent(msg.data);
          }
        } catch(err) {}
      };

      ws.onclose = function() {
        wsConnected = false;
        setConnectionStatus('reconnecting');
        setTimeout(connectWS, 3000);
      };

      ws.onerror = function() {
        ws.close();
      };
    }`;

  // Activity panel JS (only if enabled)
  if (activityEnabled) {
    script += `

    var activityPanelOpen = false;
    var lastActivityTime = 0;
    var idleTimer = null;
    var autoScroll = true;
    var activityEvents = [];

    function toggleActivity() {
      activityPanelOpen = !activityPanelOpen;
      var panel = document.getElementById('activity-panel');
      var btn = document.getElementById('toggle-activity');
      if (activityPanelOpen) {
        panel.classList.add('open');
        btn.textContent = 'Activity ◀';
      } else {
        panel.classList.remove('open');
        btn.textContent = 'Activity ▶';
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
      renderActivityItem(ev);

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function() { updateActivityStatus(false); }, 5000);
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
