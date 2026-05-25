import type { MasterProjectEntry } from "./types.js";

export function getOverviewHtml(projects: MasterProjectEntry[]): string {
  const initialData = JSON.stringify(projects)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n" +
    "  <meta charset=\"UTF-8\">\n" +
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n" +
    "  <title>Insight Flow — Overview</title>\n" +
    "  <style>\n" + CSS + "\n  </style>\n" +
    "</head>\n<body>\n" +
    "  <div class=\"top-bar\">\n" +
    "    <div>\n" +
    "      <h1><span class=\"live-dot\" id=\"status-dot\"></span>Insight Flow Overview</h1>\n" +
    "      <p class=\"subtitle\" id=\"subtitle\">Connecting...</p>\n" +
    "    </div>\n" +
    "    <div class=\"top-bar-actions\">\n" +
    "      <div class=\"settings-wrap\"><button class=\"settings-btn\" id=\"settings-btn\" onclick=\"toggleSettings()\" title=\"Notification settings\">&#9881;</button>\n" +
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
    "      </div></div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    "  <div id=\"grid\" class=\"card-grid\"></div>\n" +
    "  <script src=\"/socket.io/socket.io.js\"></script>\n" +
    "  <script>\n" + getScript(initialData) + "\n  </script>\n" +
    "</body>\n</html>"
  );
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
    .subtitle { color: var(--text-muted); font-size: 12px; }
    .top-bar { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; }
    .top-bar-actions { display: flex; gap: 8px; align-items: center; }
    .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-right: 6px; animation: pulse 2s infinite; }
    .live-dot.disconnected { background: var(--red); animation: none; }
    .live-dot.reconnecting { background: var(--yellow); }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .card-grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
    .card-grid.grid-2 { grid-template-columns: repeat(2, 1fr); }
    .card-grid.grid-multi { grid-template-columns: repeat(2, 1fr); }
    .proj-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
    .proj-card-header { display: flex; justify-content: space-between; align-items: center; }
    .proj-label { font-size: 14px; font-weight: 600; color: var(--text); }
    .conn-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .conn-live { background: #0a3622; color: var(--green); }
    .conn-stale { background: #3b2f06; color: var(--yellow); }
    .conn-down { background: #3b1111; color: var(--red); }
    .proj-task { background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 8px 10px; }
    .proj-task-id { font-size: 11px; font-weight: 700; color: var(--accent); }
    .proj-task-title { font-size: 12px; color: var(--text); margin-top: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .proj-task-empty { font-size: 12px; color: var(--text-muted); }
    .proj-counts { display: flex; flex-wrap: wrap; gap: 6px; }
    .count-chip { font-size: 10px; padding: 1px 6px; border-radius: 3px; }
    .badge { font-size: 10px; padding: 1px 6px; border-radius: 4px; font-weight: 500; display: inline-block; margin-top: 3px; }
    .badge-ready { background: #1e3a5f; color: var(--cyan); }
    .badge-progress { background: #3b2f06; color: var(--yellow); }
    .badge-review { background: #2d1b4e; color: var(--purple); }
    .badge-fix { background: #3b1111; color: var(--red); }
    .badge-approved { background: #0a3622; color: var(--green); }
    .badge-merged { background: #1a1a2e; color: #818cf8; }
    .badge-pushed { background: #2a1a06; color: var(--orange); }
    .badge-other { background: var(--border); color: var(--text-muted); }
    .proj-activity-feed { display: flex; flex-direction: column; gap: 3px; }
    .proj-activity-item { font-size: 12px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; gap: 6px; align-items: center; }
    .proj-activity-badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; font-weight: 600; text-transform: uppercase; flex-shrink: 0; }
    .proj-activity-badge-phase { background: #3b1a00; color: var(--orange); }
    .proj-activity-badge-skill { background: #1a0a3b; color: var(--purple); }
    .proj-activity-badge-tool { background: var(--border); color: var(--text-muted); }
    .proj-idle-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: var(--border); color: var(--text-muted); }
    .proj-active-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; background: #0a3622; color: var(--green); }
    .proj-card.status-active { border-color: rgba(34,197,94,0.35); background: linear-gradient(135deg,#141414 80%,rgba(34,197,94,0.08)); }
    .proj-card.status-permission { border-color: rgba(234,179,8,0.35); background: linear-gradient(135deg,#141414 80%,rgba(234,179,8,0.08)); }
    .proj-footer { display: flex; justify-content: flex-end; }
    .open-link { font-size: 11px; color: var(--accent); text-decoration: none; }
    .open-link:hover { text-decoration: underline; }
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

function getScript(initialData: string): string {
  return `
    var PROJECTS = ${initialData};
    var prevStatuses = {};
    var NOTIF_WATCHED = ['implemented','approved','fix-needed','merged','changes-requested'];
    var notifSettings = { statuses: {}, sound: true, muteFocused: false };

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function badgeInfo(lastSeenAt) {
      var diff = (Date.now() - new Date(lastSeenAt).getTime()) / 1000;
      if (diff < 60) return { cls: 'conn-live', label: 'live' };
      if (diff < 120) return { cls: 'conn-stale', label: 'stale' };
      return { cls: 'conn-down', label: 'down' };
    }

    function statusBadgeCls(status) {
      if (!status) return 'badge-other';
      if (status === 'ready') return 'badge-ready';
      if (status === 'in-progress' || status === 'fixing' || status === 'changes-implementing') return 'badge-progress';
      if (status === 'reviewing' || status === 'implemented' || status === 'changes-implemented') return 'badge-review';
      if (status === 'fix-needed' || status === 'changes-requested') return 'badge-fix';
      if (status === 'approved' || status === 'fixed') return 'badge-approved';
      if (status === 'pushed') return 'badge-pushed';
      if (status === 'merged' || status === 'done') return 'badge-merged';
      return 'badge-other';
    }

    function renderCounts(counts) {
      var order = ['in-progress','fix-needed','reviewing','implemented','ready','fixing','fixed','pushed','approved','merged','done'];
      var parts = [];
      for (var i = 0; i < order.length; i++) {
        var s = order[i];
        if (counts[s] > 0) {
          parts.push('<span class="count-chip ' + statusBadgeCls(s) + '">' + counts[s] + ' ' + escHtml(s) + '</span>');
        }
      }
      return parts.join('');
    }

    function deriveIdleStatus(recentActivity) {
      if (!recentActivity || !recentActivity.length) return 'none';
      var last = recentActivity[recentActivity.length - 1];
      if (last && last.tool === 'Phase' && last.action === 'done') return 'idle';
      return 'active';
    }

    function renderActivityMini(recentActivity, idleStatus) {
      if (!recentActivity || !recentActivity.length) return '';
      var items = recentActivity.slice(-3).reverse();
      var rows = items.map(function(ev) {
        var tool = ev.tool || '';
        var badgeCls = tool === 'Phase' ? 'proj-activity-badge-phase'
          : tool === 'Skill' ? 'proj-activity-badge-skill'
          : 'proj-activity-badge-tool';
        var primary, secondary;
        if (tool === 'Phase') {
          primary = ev.message || ev.action || 'phase';
          secondary = ev.action && ev.message ? ev.action : null;
        } else if (tool === 'Skill') {
          primary = '/' + (ev.skill || ev.action || '?');
          secondary = ev.action || null;
        } else if (ev.label) {
          primary = ev.label;
          secondary = ev.file ? ev.file.slice(0, 60) : (ev.action || null);
        } else {
          primary = ev.action || tool;
          secondary = ev.file ? ev.file.slice(0, 60) : null;
        }
        return '<div class="proj-activity-item">' +
          '<span class="proj-activity-badge ' + badgeCls + '">' + escHtml(tool.toLowerCase() || '?') + '</span>' +
          '<span style="flex:1;overflow:hidden;text-overflow:ellipsis">' + escHtml(String(primary).slice(0, 60)) + '</span>' +
          (secondary ? '<span style="color:var(--text-muted);font-size:9px;flex-shrink:0;margin-left:4px">' + escHtml(String(secondary).slice(0, 30)) + '</span>' : '') +
          '</div>';
      }).join('');
      var idleBadge = idleStatus === 'idle'
        ? '<span class="proj-idle-badge">idle</span>'
        : idleStatus === 'active'
          ? '<span class="proj-active-badge">active</span>'
          : '';
      var header = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">' +
        '<span style="font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Activity</span>' +
        idleBadge +
        '</div>';
      return '<div class="proj-task">' + header + '<div class="proj-activity-feed">' + rows + '</div></div>';
    }

    function renderCard(p) {
      var bi = badgeInfo(p.lastSeenAt);
      var s = p.state || {};
      var statusCls = s.claudeStatus === 'active' ? 'status-active'
        : s.claudeStatus === 'permission-required' ? 'status-permission'
        : '';
      var taskHtml;
      if (s.currentTaskId) {
        taskHtml = '<div class="proj-task">' +
          '<span class="proj-task-id">' + escHtml(s.currentTaskId) + '</span>' +
          (s.currentTaskStatus ? '<span class="badge ' + statusBadgeCls(s.currentTaskStatus) + '" style="margin-left:6px">' + escHtml(s.currentTaskStatus) + '</span>' : '') +
          (s.currentTaskTitle ? '<div class="proj-task-title">' + escHtml(s.currentTaskTitle) + '</div>' : '') +
          '</div>';
      } else {
        taskHtml = '<div class="proj-task"><span class="proj-task-empty">No active task</span></div>';
      }
      var idleStatus = deriveIdleStatus(s.recentActivity);
      var activityHtml = renderActivityMini(s.recentActivity, idleStatus);
      return '<div class="proj-card' + (statusCls ? ' ' + statusCls : '') + '" data-id="' + escHtml(p.id) + '">' +
        '<div class="proj-card-header">' +
          '<span class="proj-label">' + escHtml(p.label) + '</span>' +
          '<span class="conn-badge ' + bi.cls + '" data-badge>' + bi.label + '</span>' +
        '</div>' +
        taskHtml +
        '<div class="proj-counts">' + renderCounts(s.taskCounts || {}) + '</div>' +
        (activityHtml ? activityHtml : '') +
        '<div class="proj-footer"><a href="' + escHtml(p.url) + '" class="open-link" target="_blank">Open dashboard →</a></div>' +
        '</div>';
    }

    function applyGridClass() {
      var grid = document.getElementById('grid');
      if (!grid) return;
      grid.classList.remove('grid-2', 'grid-multi');
      if (PROJECTS.length === 2) grid.classList.add('grid-2');
      else if (PROJECTS.length >= 3) grid.classList.add('grid-multi');
    }

    function renderAll() {
      document.getElementById('grid').innerHTML = PROJECTS.map(renderCard).join('');
      applyGridClass();
      updateSubtitle();
      snapshotStatuses();
    }

    function updateSubtitle() {
      var live = PROJECTS.filter(function(p) {
        return (Date.now() - new Date(p.lastSeenAt).getTime()) / 1000 < 60;
      }).length;
      document.getElementById('subtitle').textContent =
        PROJECTS.length + ' project' + (PROJECTS.length !== 1 ? 's' : '') +
        ' · ' + live + ' live';
    }

    function refreshBadges() {
      var cards = document.querySelectorAll('.proj-card');
      for (var i = 0; i < cards.length; i++) {
        var card = cards[i];
        var id = card.getAttribute('data-id');
        var p = PROJECTS.find(function(x) { return x.id === id; });
        if (!p) continue;
        var bi = badgeInfo(p.lastSeenAt);
        var badge = card.querySelector('[data-badge]');
        if (badge) { badge.className = 'conn-badge ' + bi.cls; badge.textContent = bi.label; }
      }
      updateSubtitle();
    }

    function upsertProject(p) {
      var idx = PROJECTS.findIndex(function(x) { return x.id === p.id; });
      if (idx >= 0) {
        PROJECTS[idx] = p;
        var existing = document.querySelector('[data-id="' + p.id + '"]');
        if (existing) { existing.outerHTML = renderCard(p); }
      } else {
        PROJECTS.push(p);
        document.getElementById('grid').insertAdjacentHTML('beforeend', renderCard(p));
        applyGridClass();
      }
      updateSubtitle();
    }

    function snapshotStatuses() {
      for (var i = 0; i < PROJECTS.length; i++) {
        var p = PROJECTS[i];
        var s = p.state || {};
        if (s.currentTaskId && s.currentTaskStatus) {
          if (!prevStatuses[p.id]) prevStatuses[p.id] = {};
          prevStatuses[p.id][s.currentTaskId] = s.currentTaskStatus;
        }
      }
    }

    function checkStatusTransitions(p) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (notifSettings.muteFocused && !document.hidden) return;
      var s = p.state || {};
      if (!s.currentTaskId || !s.currentTaskStatus) return;
      var prev = (prevStatuses[p.id] || {})[s.currentTaskId];
      if (prev && prev !== s.currentTaskStatus &&
          notifSettings.statuses[s.currentTaskStatus] !== false &&
          NOTIF_WATCHED.indexOf(s.currentTaskStatus) >= 0) {
        var title = p.label + ': ' + s.currentTaskId + ' → ' + s.currentTaskStatus;
        try { new Notification(title, { silent: !notifSettings.sound }); } catch(e) {}
      }
      if (!prevStatuses[p.id]) prevStatuses[p.id] = {};
      prevStatuses[p.id][s.currentTaskId] = s.currentTaskStatus;
    }

    function loadNotifSettings() {
      try {
        var raw = localStorage.getItem('tf-notif-settings');
        if (raw) notifSettings = JSON.parse(raw);
      } catch(e) {}
      var ids = ['implemented','approved','fix-needed','merged','changes-requested'];
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById('notif-' + ids[i]);
        if (el) el.checked = notifSettings.statuses[ids[i]] !== false;
      }
      var sound = document.getElementById('notif-sound');
      if (sound) sound.checked = notifSettings.sound !== false;
      var mute = document.getElementById('notif-mute-focused');
      if (mute) mute.checked = !!notifSettings.muteFocused;
    }

    function saveNotifSettings() {
      var ids = ['implemented','approved','fix-needed','merged','changes-requested'];
      notifSettings.statuses = {};
      for (var i = 0; i < ids.length; i++) {
        var el = document.getElementById('notif-' + ids[i]);
        if (el) notifSettings.statuses[ids[i]] = el.checked;
      }
      var sound = document.getElementById('notif-sound');
      notifSettings.sound = sound ? sound.checked : true;
      var mute = document.getElementById('notif-mute-focused');
      notifSettings.muteFocused = mute ? mute.checked : false;
      try { localStorage.setItem('tf-notif-settings', JSON.stringify(notifSettings)); } catch(e) {}
    }

    function updatePermissionHint() {
      var hint = document.getElementById('notif-permission-hint');
      if (!hint) return;
      if (!('Notification' in window)) { hint.textContent = 'Notifications not supported.'; return; }
      if (Notification.permission === 'denied') { hint.textContent = 'Permission denied. Allow in browser settings.'; return; }
      if (Notification.permission === 'default') { hint.textContent = 'Click a status toggle to enable.'; return; }
      hint.textContent = 'Notifications enabled.';
    }

    function requestNotifPermission() {
      if (!('Notification' in window)) return;
      if (Notification.permission === 'granted') { updatePermissionHint(); return; }
      if (Notification.permission === 'denied') { updatePermissionHint(); return; }
      try {
        var asked = localStorage.getItem('tf-notif-asked');
        if (!asked) {
          Notification.requestPermission().then(function() { updatePermissionHint(); });
          localStorage.setItem('tf-notif-asked', '1');
        }
      } catch(e) {}
      updatePermissionHint();
    }

    function toggleSettings() {
      var pop = document.getElementById('settings-popover');
      if (pop) pop.classList.toggle('open');
    }

    document.addEventListener('click', function(e) {
      var btn = document.getElementById('settings-btn');
      var pop = document.getElementById('settings-popover');
      if (pop && btn && !btn.contains(e.target) && !pop.contains(e.target)) {
        pop.classList.remove('open');
      }
    });

    function connectWS() {
      var sock = io({ transports: ['websocket', 'polling'], reconnectionDelay: 1000 });
      var dot = document.getElementById('status-dot');

      sock.on('connect', function() {
        if (dot) { dot.className = 'live-dot'; }
        updateSubtitle();
      });
      sock.on('disconnect', function() {
        if (dot) { dot.className = 'live-dot reconnecting'; }
      });
      sock.on('connect_error', function() {
        if (dot) { dot.className = 'live-dot reconnecting'; }
      });

      sock.on('project-update', function(p) {
        checkStatusTransitions(p);
        upsertProject(p);
      });
    }

    renderAll();
    loadNotifSettings();
    requestNotifPermission();
    connectWS();
    setInterval(refreshBadges, 30000);`;
}
