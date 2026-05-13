import { createServer } from "node:http";
import { readFileSync, existsSync, readdirSync, watch } from "node:fs";
import { resolve, extname } from "node:path";
import { exec } from "node:child_process";
import type { TaskflowConfig } from "../types.js";
import { getWorkDir } from "../config.js";

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Taskflow Dashboard</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #0a0a0a; --surface: #141414; --border: #262626;
      --text: #e5e5e5; --text-muted: #737373; --accent: #3b82f6;
      --green: #22c55e; --yellow: #eab308; --red: #ef4444; --purple: #a855f7;
      --orange: #f97316; --cyan: #06b6d4;
    }
    body { font-family: 'SF Mono', 'Fira Code', monospace; background: var(--bg); color: var(--text); padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .subtitle { color: var(--text-muted); font-size: 12px; margin-bottom: 24px; }
    .live-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--green); margin-right: 6px; animation: pulse 2s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
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
    .empty { color: var(--text-muted); font-size: 12px; padding: 20px; text-align: center; }
  </style>
</head>
<body>
  <h1><span class="live-dot"></span>Taskflow Dashboard</h1>
  <p class="subtitle" id="project-name">Loading...</p>

  <div class="shard-nav" id="shard-nav"></div>
  <div class="stats" id="stats"></div>
  <div class="kanban" id="kanban"></div>
  <div class="timeline" id="timeline"></div>

  <div class="detail-overlay" id="overlay" onclick="closeDetail()"></div>
  <div class="detail-panel" id="detail" style="display:none">
    <button class="close" onclick="closeDetail()">&times;</button>
    <div id="detail-content"></div>
  </div>

  <script>
    const COLUMNS = [
      { key: 'ready', label: 'Ready', matches: ['ready'] },
      { key: 'progress', label: 'In Progress', matches: ['in-progress', 'implemented', 'changes-implementing', 'changes-implemented'] },
      { key: 'review', label: 'Review', matches: ['reviewing'] },
      { key: 'fix', label: 'Fix', matches: ['fix-needed', 'fixing', 'fixed', 'changes-requested', 'request-changes'] },
      { key: 'approved', label: 'Approved', matches: ['approved', 'pushed'] },
      { key: 'merged', label: 'Done', matches: ['merged', 'done'] },
    ];

    let tasks = [];
    let shards = [];
    let currentShard = null;
    let es = null;

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
      const d = new Date(iso);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function render() {
      // Stats
      const total = tasks.length;
      const merged = tasks.filter(t => ['merged', 'done'].includes(t.status)).length;
      const active = tasks.filter(t => ['in-progress', 'implementing', 'changes-implementing'].includes(t.status)).length;
      const reviews = tasks.reduce((s, t) => s + (t.reviews || []).length, 0);

      document.getElementById('stats').innerHTML = [
        { value: total, label: 'Total Tasks' },
        { value: merged, label: 'Completed' },
        { value: active, label: 'Active' },
        { value: reviews, label: 'Reviews' },
      ].map(s => '<div class="stat"><div class="stat-value">' + s.value + '</div><div class="stat-label">' + s.label + '</div></div>').join('');

      // Kanban
      document.getElementById('kanban').innerHTML = COLUMNS.map(col => {
        const colTasks = tasks.filter(t => col.matches.includes(t.status));
        const cards = colTasks.length === 0
          ? '<div class="empty">No tasks</div>'
          : colTasks.map(t =>
            '<div class="card" onclick="showDetail(\\'' + t.id + '\\')">' +
              '<div class="card-id">' + t.id + ' <span class="badge ' + badgeClass(t.status) + '">' + t.status + '</span></div>' +
              '<div class="card-title">' + escHtml(t.title) + '</div>' +
              '<div class="card-meta"><span>' + t.type + '</span><span>' + t.priority + '</span><span>' + formatTime(t.createdAt) + '</span></div>' +
            '</div>'
          ).join('');
        return '<div class="column"><div class="column-header"><span>' + col.label + '</span><span class="column-count">' + colTasks.length + '</span></div>' + cards + '</div>';
      }).join('');

      // Timeline (last 20 status changes across all tasks)
      const events = [];
      for (const t of tasks) {
        for (const h of t.statusHistory || []) {
          events.push({ taskId: t.id, title: t.title, ...h });
        }
      }
      events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

      document.getElementById('timeline').innerHTML =
        '<h2>Recent Activity</h2>' +
        events.slice(0, 20).map(e =>
          '<div class="timeline-item"><span class="timeline-time">' + formatTime(e.at) + '</span>' +
          '<span class="timeline-event"><strong>' + e.taskId + '</strong> &rarr; <span class="badge ' + badgeClass(e.status) + '">' + e.status + '</span> by ' + (e.by || '?') + '</span></div>'
        ).join('');
    }

    function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    function showDetail(id) {
      const t = tasks.find(x => x.id === id);
      if (!t) return;
      const dc = document.getElementById('detail-content');
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
      const res = await fetch('/api/work-tasks');
      const files = await res.json();
      shards = files.filter(f => f.startsWith('tasks-')).sort((a, b) => b.localeCompare(a));
      if (shards.length > 0 && !currentShard) currentShard = shards[0];
      renderShardNav();
    }

    async function loadShard(name) {
      currentShard = name;
      const [shardRes, masterRes] = await Promise.all([
        fetch('/api/work-tasks/' + name),
        fetch('/api/work-tasks/master.json'),
      ]);
      const shard = await shardRes.json();
      tasks = shard.tasks || [];
      try {
        const master = await masterRes.json();
        document.getElementById('project-name').textContent = 'Shard: ' + name.replace('tasks-', '').replace('.json', '') + ' · ' + tasks.length + ' tasks';
      } catch {}
      renderShardNav();
      render();
    }

    function renderShardNav() {
      const idx = shards.indexOf(currentShard);
      const nav = document.getElementById('shard-nav');
      nav.innerHTML =
        '<button ' + (idx <= 0 ? 'disabled' : '') + ' onclick="loadShard(shards[' + (idx - 1) + '])">&laquo; Newer</button>' +
        '<span>' + (currentShard || '...').replace('tasks-', '').replace('.json', '') + ' (' + (idx + 1) + '/' + shards.length + ')</span>' +
        '<button ' + (idx >= shards.length - 1 ? 'disabled' : '') + ' onclick="loadShard(shards[' + (idx + 1) + '])">&raquo; Older</button>';
    }

    // SSE for live updates
    function connectSSE() {
      es = new EventSource('/api/events');
      es.onmessage = (e) => {
        if (e.data === 'reload' && currentShard) {
          loadShard(currentShard);
        }
      };
      es.onerror = () => {
        es.close();
        setTimeout(connectSSE, 3000);
      };
    }

    loadShardIndex().then(() => {
      if (currentShard) loadShard(currentShard);
    });
    connectSSE();
  </script>
</body>
</html>`;

export function startServer(config: TaskflowConfig, port?: number): void {
  const serverPort = port || config.server.port;
  const workDir = getWorkDir(config);
  const sseClients: Set<import("node:http").ServerResponse> = new Set();

  if (!existsSync(workDir)) {
    console.error(`Work directory not found: ${workDir}`);
    console.error("Run 'taskflow init' first.");
    process.exit(1);
  }

  // Watch for file changes
  const watcher = watch(workDir, { recursive: false }, () => {
    for (const client of sseClients) {
      client.write("data: reload\n\n");
    }
  });

  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://localhost:" + serverPort);

    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    // SSE endpoint
    if (url.pathname === "/api/events") {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      res.write("data: connected\n\n");
      sseClients.add(res);
      req.on("close", () => sseClients.delete(res));
      return;
    }

    // List work task files
    if (url.pathname === "/api/work-tasks") {
      try {
        const files = readdirSync(workDir).filter((f) => f.endsWith(".json"));
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(files));
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to list files" }));
      }
      return;
    }

    // Serve specific JSON file
    if (url.pathname.startsWith("/api/work-tasks/")) {
      const fileName = url.pathname.replace("/api/work-tasks/", "");
      if (fileName.includes("..") || fileName.includes("/")) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid filename" }));
        return;
      }
      const filePath = resolve(workDir, fileName);
      if (!existsSync(filePath)) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "File not found" }));
        return;
      }
      try {
        const content = readFileSync(filePath, "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(content);
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to read file" }));
      }
      return;
    }

    // Serve dashboard
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(DASHBOARD_HTML);
  });

  server.listen(serverPort, () => {
    console.log("\n  Taskflow Dashboard\n");
    console.log("  Local:   http://localhost:" + serverPort);
    console.log("  Data:    " + workDir);
    console.log("  Live:    Watching for changes...\n");

    // Auto-open browser
    const openCmd =
      process.platform === "darwin"
        ? "open"
        : process.platform === "win32"
          ? "start"
          : "xdg-open";
    exec(openCmd + " http://localhost:" + serverPort);
  });

  process.on("SIGINT", () => {
    watcher.close();
    server.close();
    process.exit(0);
  });
}
