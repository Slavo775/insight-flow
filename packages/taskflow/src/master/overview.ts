import type { PublicProjectEntry } from "./types.js";

export function getOverviewHtml(projects: PublicProjectEntry[]): string {
  const initialData = JSON.stringify(projects)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");

  return (
    '<!DOCTYPE html>\n<html lang="en">\n<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    "  <title>Insight Flow — Overview</title>\n" +
    // N217 — installable PWA: manifest, theme, and icon on the master origin.
    '  <link rel="manifest" href="/manifest.webmanifest">\n' +
    '  <meta name="theme-color" content="#0a0a0a">\n' +
    '  <link rel="icon" type="image/svg+xml" href="/icon.svg">\n' +
    '  <link rel="apple-touch-icon" href="/icon.svg">\n' +
    '  <meta name="apple-mobile-web-app-capable" content="yes">\n' +
    '  <meta name="apple-mobile-web-app-title" content="insight-flow">\n' +
    "  <style>\n" +
    CSS +
    "\n  </style>\n" +
    "</head>\n<body>\n" +
    '  <div class="top-bar">\n' +
    "    <div>\n" +
    '      <h1><span class="live-dot" id="status-dot"></span>Insight Flow Overview</h1>\n' +
    '      <p class="subtitle" id="subtitle">Connecting...</p>\n' +
    "    </div>\n" +
    '    <div class="top-bar-actions">\n' +
    '      <button class="settings-btn" id="refresh-btn" onclick="refreshProjects()" title="Re-check which projects are running (on-demand healthcheck)">&#8635; Refresh</button>\n' +
    '      <button class="settings-btn" id="new-project-btn" onclick="createProject()" title="Create a new project (scaffolds it and registers it here)">+ New project</button>\n' +
    '      <div class="settings-wrap"><button class="settings-btn" id="settings-btn" onclick="toggleSettings()" title="Notification settings">&#9881;</button>\n' +
    '      <div class="settings-popover" id="settings-popover">\n' +
    '        <div class="settings-header">Notifications</div>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-implemented" onchange="saveNotifSettings()"> Task implemented</label>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-approved" onchange="saveNotifSettings()"> Review approved</label>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-fix-needed" onchange="saveNotifSettings()"> Fix needed</label>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-merged" onchange="saveNotifSettings()"> Merged</label>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-changes-requested" onchange="saveNotifSettings()"> Changes requested</label>\n' +
    '        <div class="settings-divider"></div>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-sound" onchange="saveNotifSettings()"> Sound</label>\n' +
    '        <label class="settings-row"><input type="checkbox" id="notif-mute-focused" onchange="saveNotifSettings()"> Mute when tab focused</label>\n' +
    '        <div id="notif-permission-hint" class="settings-hint"></div>\n' +
    "      </div></div>\n" +
    "    </div>\n" +
    "  </div>\n" +
    '  <div id="grid"></div>\n' +
    "  <script>\n" +
    getScript(initialData) +
    "\n  </script>\n" +
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
    .card-grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
    @media (max-width: 800px) { .card-grid { grid-template-columns: 1fr; } }
    /* N220 — running vs stopped sections */
    .section-label { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin: 0 0 12px; }
    .section-label:not(:first-child) { margin-top: 28px; }
    .section-count { color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 1px 7px; font-size: 10px; font-weight: 500; }
    .proj-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; display: flex; flex-direction: column; gap: 10px; min-width: 0; }
    .proj-card-header { display: flex; justify-content: space-between; align-items: center; }
    .proj-label { font-size: 14px; font-weight: 600; color: var(--text); }
    .mute-btn { background: none; border: none; cursor: pointer; font-size: 13px; line-height: 1; padding: 0 2px; opacity: 0.75; }
    .mute-btn:hover { opacity: 1; }
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
    .proj-card.status-active { border-color: var(--green); background: #0d2318; }
    .proj-card.status-permission { border-color: var(--red); background: #2a0d0d; }
    .claude-status-badge { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
    .claude-status-active { background: #0a3622; color: var(--green); }
    .claude-status-idle { background: var(--border); color: var(--text-muted); }
    .claude-status-permission { background: #3b1111; color: var(--red); }
    /* N68 four-state additions — visually adjacent to their legacy siblings
       (done ≈ idle, awaiting-permission ≈ permission) but with a green accent
       on done so the user can tell "Claude turn ended" apart from "Claude
       60s wait". */
    .claude-status-done { background: var(--border); color: var(--green); }
    .claude-status-awaiting-permission { background: #3b1111; color: var(--red); }
    .proj-footer { display: flex; justify-content: flex-end; }
    .open-link { font-size: 11px; color: var(--accent); text-decoration: none; }
    .card-btn { display: inline-block; background: var(--surface); border: 1px solid var(--border); color: var(--accent); padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; line-height: 1; text-decoration: none; }
    .card-btn:hover { border-color: var(--accent); }
    .card-btn:disabled { opacity: 0.6; cursor: default; color: var(--text-muted); }
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
    // NOTE: this entire block is the body of a TS template literal. Do NOT
    // use backticks anywhere below — including inside // comments — or the
    // outer literal terminates. Use single quotes for any inline samples.
    var PROJECTS = ${initialData};
    var prevStatuses = {};
    var swReg = null; // N216 — set once the hub service worker is active
    var startingIds = {}; // N220 review-fix — project ids with a Start in flight
    // N210 — create a new project from the home base (non-coder onboarding).
    function createProject() {
      var name = prompt('Name your new project:');
      if (!name) return;
      fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.error) { alert('Could not create project: ' + d.error); return; }
        alert('Created "' + d.name + '" at:\\n' + d.path + '\\n\\nOpen it: run  insight-flow  in that folder.');
        location.reload();
      }).catch(function (e) { alert('Error: ' + e.message); });
    }
    var NOTIF_WATCHED = ['implemented','approved','fix-needed','merged','changes-requested'];
    var notifSettings = { statuses: {}, sound: true, muteFocused: false, mutedProjects: [] };

    // N216 — per-project mute (stored under the master origin with the other
    // notif settings). Muted projects fire no hub notification/sound.
    function isMuted(id) {
      return !!(notifSettings.mutedProjects && notifSettings.mutedProjects.indexOf(id) >= 0);
    }
    function toggleMuteProject(id) {
      if (window.event) window.event.stopPropagation();
      if (!notifSettings.mutedProjects) notifSettings.mutedProjects = [];
      var i = notifSettings.mutedProjects.indexOf(id);
      if (i >= 0) notifSettings.mutedProjects.splice(i, 1);
      else notifSettings.mutedProjects.push(id);
      try { localStorage.setItem('tf-notif-settings', JSON.stringify(notifSettings)); } catch(e) {}
      var el = document.querySelector('[data-mute="' + String(id).replace(/[^A-Za-z0-9_-]/g, '') + '"]');
      if (el) el.textContent = isMuted(id) ? '🔕' : '🔔';
    }

    function escHtml(s) {
      return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function isProjectLive(lastSeenAt) {
      return (Date.now() - new Date(lastSeenAt).getTime()) / 1000 < 60;
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

    // N215 — the overview doubles as the launcher/switcher: open an online
    // project through the single-origin proxy (/p/<id>/) in the same tab, or
    // start an offline one first, then go.
    function openControlHtml(p) {
      // ids are registry UUIDs; sanitize defensively before the JS-string context.
      var sid = String(p.id).replace(/[^A-Za-z0-9_-]/g, '');
      if (p.online) {
        // N220 — open via the STABLE /project/<projectId>/ path (survives restarts).
        return '<a href="/project/' + encodeURIComponent(p.projectId) + '/" class="card-btn">Open →</a>';
      }
      return '<button class="card-btn start-btn" onclick="startProject(\\'' + sid + '\\')">Start →</button>';
    }
    // N220 review-fix — the "Starting…" state is tracked in startingIds (not just
    // on the clicked button), so it survives re-renders: applyStartingState()
    // re-disables the button after any render, preventing a lost state + an
    // accidental double-start.
    function applyStartingState() {
      for (var sid in startingIds) {
        if (!startingIds[sid]) continue;
        var card = document.querySelector('[data-id="' + sid + '"]');
        var b = card && card.querySelector('.start-btn');
        if (b) { b.textContent = 'Starting…'; b.disabled = true; }
      }
    }
    function clearStarting(id) {
      delete startingIds[id];
      var card = document.querySelector('[data-id="' + id + '"]');
      var b = card && card.querySelector('.start-btn');
      if (b) { b.textContent = 'Start →'; b.disabled = false; }
    }
    function startProject(id) {
      startingIds[id] = true;
      applyStartingState();
      // Safety net: never leave a button stuck on "Starting…". The initiating
      // tab navigates away on success; but a tab that only ever got a 202 (a
      // concurrent start deduped by the server) or a start that fails to register
      // would otherwise keep the flag. Clear it after the server's ~15s deadline.
      setTimeout(function() { if (startingIds[id]) clearStarting(id); }, 20000);
      fetch('/api/hub/projects/' + encodeURIComponent(id) + '/start', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d && d.url) {
            // N220 — navigate to the stable /project/<projectId>/ path.
            var proj = PROJECTS.filter(function(p) { return p.id === id; })[0];
            var pid = proj ? proj.projectId : id;
            window.location.href = '/project/' + encodeURIComponent(pid) + '/';
          } else if (d && d.starting) {
            // A spawn is already in flight (server dedup) — keep it disabled.
          } else {
            clearStarting(id);
            alert('Could not start: ' + ((d && d.error) || 'unknown'));
          }
        })
        .catch(function() { clearStarting(id); });
    }
    function refreshProjects() {
      fetch('/api/hub/refresh', { method: 'POST' })
        .then(function(r) { return r.json(); })
        .then(function(d) { if (d && d.projects) { PROJECTS = d.projects; renderAll(); } })
        .catch(function() {});
    }

    function renderCard(p) {
      var s = p.state || {};
      var mid = String(p.id).replace(/[^A-Za-z0-9_-]/g, ''); // sanitized id for attrs/onclick
      // N71: gate every claudeStatus-driven visual on liveness. A project
      // that hasn't checked in for 60s renders neutral, regardless of the
      // last-pushed status — registry never clears the value on disconnect,
      // so this is the only place stale 'active' / 'awaiting-permission'
      // gets filtered out.
      var live = isProjectLive(p.lastSeenAt);
      var effectiveStatus = live ? s.claudeStatus : null;
      // N68: 'awaiting-permission' shares the alert card border with the
      // legacy 'permission-required'; 'done' borders nothing (it's a
      // not-actively-working state, same as 'idle').
      var statusCls = effectiveStatus === 'active' ? 'status-active'
        : (effectiveStatus === 'permission-required' || effectiveStatus === 'awaiting-permission') ? 'status-permission'
        : '';
      // Empty-string default is intentional: claudeBadgeHtml below is gated
      // on claudeBadgeLabel being non-empty, so an unknown / null status
      // renders no badge at all. Do NOT add a 'claude-status-idle' fallback
      // here — it would be unreachable (label='' short-circuits the render).
      var claudeBadgeCls = effectiveStatus === 'active' ? 'claude-status-active'
        : effectiveStatus === 'permission-required' ? 'claude-status-permission'
        : effectiveStatus === 'awaiting-permission' ? 'claude-status-awaiting-permission'
        : effectiveStatus === 'done' ? 'claude-status-done'
        : effectiveStatus === 'idle' ? 'claude-status-idle'
        : '';
      var claudeBadgeLabel = effectiveStatus === 'active' ? 'active'
        : effectiveStatus === 'permission-required' ? 'permission required'
        : effectiveStatus === 'awaiting-permission' ? 'awaiting permission'
        : effectiveStatus === 'done' ? 'done'
        : effectiveStatus === 'idle' ? 'idle'
        : '';
      var claudeBadgeHtml = claudeBadgeLabel
        ? '<span class="claude-status-badge ' + claudeBadgeCls + '">' + claudeBadgeLabel + '</span>'
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
          '<div style="display:flex;gap:6px;align-items:center">' +
            (claudeBadgeHtml ? claudeBadgeHtml : '') +
            '<button class="mute-btn" title="Mute notifications for this project" data-mute="' + mid + '" onclick="toggleMuteProject(\\'' + mid + '\\')">' + (isMuted(p.id) ? '🔕' : '🔔') + '</button>' +
          '</div>' +
        '</div>' +
        taskHtml +
        '<div class="proj-counts">' + renderCounts(s.taskCounts || {}) + '</div>' +
        (activityHtml ? activityHtml : '') +
        '<div class="proj-footer">' + openControlHtml(p) + '</div>' +
        '</div>';
    }

    // N220 — group projects into Running (online) and Stopped sections. Each
    // section is hidden when empty; a card moves between them on the next render
    // once its online state flips.
    function sectionHtml(title, list) {
      if (!list.length) return '';
      return '<div class="section-label">' + title +
        '<span class="section-count">' + list.length + '</span></div>' +
        '<div class="card-grid">' + list.map(renderCard).join('') + '</div>';
    }
    function renderSections() {
      var online = PROJECTS.filter(function(p) { return p.online; });
      var offline = PROJECTS.filter(function(p) { return !p.online; });
      document.getElementById('grid').innerHTML =
        sectionHtml('Running', online) + sectionHtml('Stopped', offline);
      updateSubtitle();
      applyStartingState();
    }
    function renderAll() {
      renderSections();
      snapshotStatuses();
    }

    function updateSubtitle() {
      var live = PROJECTS.filter(function(p) { return isProjectLive(p.lastSeenAt); }).length;
      document.getElementById('subtitle').textContent =
        PROJECTS.length + ' project' + (PROJECTS.length !== 1 ? 's' : '') +
        ' · ' + live + ' live';
    }

    // N71: project cards auto-decay when a project goes stale. Re-render
    // every 30s so stale claudeStatus highlights drop off even when no other
    // project pushes an update. N220 — re-renders both sections (full innerHTML
    // replace; fine for static colors at this scale).
    function refreshStaleCards() {
      renderSections();
    }

    // N220 review-fix — targeted per-card update keeps other cards' DOM intact
    // (an in-flight Start button, hover, text selection, activity tooltips). Only
    // rebuild both sections when a card is new, its node is missing, or it
    // crosses the online<->offline boundary (an actual move between sections).
    function upsertProject(p) {
      var idx = PROJECTS.findIndex(function(x) { return x.id === p.id; });
      var wasOnline = idx >= 0 ? PROJECTS[idx].online : null;
      if (idx >= 0) { PROJECTS[idx] = p; } else { PROJECTS.push(p); }
      // The project is up now — clear any in-flight Start flag (covers a tab that
      // didn't navigate, e.g. one that only got a 202), so a later Stop doesn't
      // render a wrongly-disabled "Starting…" button.
      if (p.online && startingIds[p.id]) { delete startingIds[p.id]; }
      var node = document.querySelector('[data-id="' + p.id + '"]');
      if (idx < 0 || node === null || wasOnline !== p.online) {
        renderSections();
      } else {
        node.outerHTML = renderCard(p);
        updateSubtitle();
        applyStartingState();
      }
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

    // N216 — one service worker for the whole hub. Prefer registration.show-
    // Notification (fires while the hub is backgrounded; basis for the N217 PWA),
    // falling back to a page Notification. We keep the OS notification silent and
    // play our own bundled mp3 from the master origin instead.
    function showHubNotification(title, data) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      var opts = { silent: true, data: data || {} };
      // Use the SW only once it's actually active (swReg set on registration).
      // Falling back to a page Notification immediately avoids a silent no-op if
      // SW registration ever fails (navigator.serviceWorker.ready never rejects).
      if (swReg) {
        try { swReg.showNotification(title, opts); return; } catch(e) {}
      }
      try { new Notification(title, opts); } catch(e) {}
    }
    function playTone(status) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        var ctx = new AC();
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = (status === 'awaiting-permission' || status === 'permission-required') ? 660 : 440;
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } catch(e) {}
    }
    function playNotifSound(status) {
      if (notifSettings.sound === false) return;
      if (notifSettings.muteFocused && !document.hidden) return;
      var src = (status === 'awaiting-permission' || status === 'permission-required')
        ? '/sounds/permission-alert.mp3' : '/sounds/idle-ping.mp3';
      // Prefer the bundled mp3 (from the master origin); fall back to a Web-Audio
      // beep if it can't play (missing/empty file, autoplay policy).
      try { new Audio(src).play().catch(function() { playTone(status); }); }
      catch(e) { playTone(status); }
    }

    function checkStatusTransitions(p) {
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (notifSettings.muteFocused && !document.hidden) return;
      if (notifSettings.mutedProjects && notifSettings.mutedProjects.indexOf(p.id) >= 0) return;
      var s = p.state || {};
      if (!s.currentTaskId || !s.currentTaskStatus) return;
      var prev = (prevStatuses[p.id] || {})[s.currentTaskId];
      if (prev && prev !== s.currentTaskStatus &&
          notifSettings.statuses[s.currentTaskStatus] !== false &&
          NOTIF_WATCHED.indexOf(s.currentTaskStatus) >= 0) {
        var title = p.label + ': ' + s.currentTaskId + ' → ' + s.currentTaskStatus;
        showHubNotification(title, { url: '/project/' + encodeURIComponent(p.projectId) + '/' });
        playNotifSound(s.currentTaskStatus);
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

    function connectStream() {
      var es = new EventSource('/events');
      var dot = document.getElementById('status-dot');

      es.onopen = function() {
        if (dot) { dot.className = 'live-dot'; }
        updateSubtitle();
      };
      es.onerror = function() {
        if (dot) { dot.className = 'live-dot reconnecting'; }
      };

      es.addEventListener('project-update', function(e) {
        var p = JSON.parse(e.data);
        checkStatusTransitions(p);
        upsertProject(p);
      });
    }

    // N216 — register the hub service worker (unified notifications + N217 PWA base).
    // swReg is set only once it's active, so showHubNotification can fall back to
    // a page Notification if registration ever fails (no silent no-op).
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(function() { return navigator.serviceWorker.ready; })
        .then(function(reg) { swReg = reg; })
        .catch(function() {});
    }
    renderAll();
    loadNotifSettings();
    requestNotifPermission();
    connectStream();
    refreshProjects(); // N215 — on-demand healthcheck on load so the list is fresh
    setInterval(refreshStaleCards, 30000);`;
}
