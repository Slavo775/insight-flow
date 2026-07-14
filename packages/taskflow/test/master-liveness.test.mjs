/**
 * N214 — master hub liveness: a per-project token (reject wrong token on
 * update), connection-based online/offline (open the liveness channel → online,
 * close → offline), an on-demand /health probe, and register-by-path
 * reconciliation. Hermetic: a stub project /health server + a master on random
 * loopback ports. Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, get as httpGet } from "node:http";
import { mkdtempSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startMasterServer, isTrustedActionRequest } from "../dist/index.js";

function startHealthStub(healthy = true) {
  const server = createServer((req, res) => {
    if (req.url.startsWith("/health")) {
      res.writeHead(healthy ? 200 : 500, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: healthy ? "ok" : "down" }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, url: "http://127.0.0.1:" + server.address().port });
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function register(base, body) {
  const r = await fetch(base + "/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function projects(base) {
  return (await (await fetch(base + "/api/hub/projects")).json()).projects;
}

test("token: register issues one; update rejects a wrong token, accepts the right one", async () => {
  const port = 6800 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const { id, token } = await register(base, { projectId: "tok", label: "tok", url: "" });
    assert.ok(id && token, "register returns id + token");

    const bad = await fetch(base + `/api/projects/${id}/update?token=WRONG`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskCounts: {} }),
    });
    assert.equal(bad.status, 401, "wrong token → 401");

    const ok = await fetch(base + `/api/projects/${id}/update?token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ taskCounts: {} }),
    });
    assert.equal(ok.status, 200, "right token → 200");
  } finally {
    close();
  }
});

test("liveness: open the channel → online; close → offline", async () => {
  const port = 6960 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const { id, token } = await register(base, { projectId: "live", label: "live", url: "" });
    assert.equal((await projects(base)).find((p) => p.id === id).online, false, "starts offline");

    const req = httpGet(base + `/api/hub/live?id=${id}&token=${token}`, (res) => res.resume());
    await sleep(200);
    assert.equal((await projects(base)).find((p) => p.id === id).online, true, "online while open");

    req.destroy();
    await sleep(200);
    assert.equal((await projects(base)).find((p) => p.id === id).online, false, "offline on close");
  } finally {
    close();
  }
});

test("on-demand probe: reflects each project's /health; no background timer needed", async () => {
  const up = await startHealthStub(true);
  const down = await startHealthStub(false);
  const port = 7120 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const a = await register(base, { projectId: "up", label: "up", url: up.url });
    const b = await register(base, { projectId: "down", label: "down", url: down.url });

    const res = await fetch(base + "/api/hub/refresh", { method: "POST" });
    const list = (await res.json()).projects;
    assert.equal(list.find((p) => p.id === a.id).online, true, "reachable /health → online");
    assert.equal(list.find((p) => p.id === b.id).online, false, "failing /health → offline");
  } finally {
    close();
    up.server.close();
    down.server.close();
  }
});

test("SSRF guard: the refresh probe never fetches a non-loopback registered url", async () => {
  const up = await startHealthStub(true); // 127.0.0.1 → probed
  const port = 7440 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const a = await register(base, { projectId: "local", label: "local", url: up.url });
    // 192.0.2.1 is TEST-NET-1 (RFC 5737) — non-routable; if it were fetched the
    // probe would hang until the 1.5s abort, so a fast refresh proves it was skipped.
    const b = await register(base, { projectId: "evil", label: "evil", url: "http://192.0.2.1:9" });

    const started = Date.now();
    const list = (await (await fetch(base + "/api/hub/refresh", { method: "POST" })).json()).projects;
    const elapsed = Date.now() - started;

    assert.equal(list.find((p) => p.id === a.id).online, true, "loopback probed → online");
    assert.equal(list.find((p) => p.id === b.id).online, false, "non-loopback skipped → offline");
    assert.ok(elapsed < 1200, `refresh was fast (${elapsed}ms) — non-loopback url not fetched`);
  } finally {
    close();
    up.server.close();
  }
});

test("shell (N215): / serves the switcher overview; start rejects an unknown project", async () => {
  const port = 7600 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const root = await fetch(base + "/");
    assert.equal(root.status, 200, "/ serves the shell");
    const html = await root.text();
    // N231 — the overview is now a React island: the shell mounts the app + loads
    // the bundle (refresh / start-and-go run client-side) and injects the shared
    // notification client. The start-and-go contract is asserted via the API below.
    assert.match(html, /<div id="root">/, "shell mounts the React overview app");
    assert.match(html, /\/assets\/[\w.-]+\.js/, "shell loads the overview bundle");
    assert.match(html, /hub-notify\.js/, "shell injects the shared notification client");

    const start = await fetch(base + "/api/hub/projects/does-not-exist/start", { method: "POST" });
    assert.equal(start.status, 400, "start unknown project → 400");
  } finally {
    close();
  }
});

test("N216: master serves the hub service worker + notification sounds", async () => {
  const port = 7760 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const sw = await fetch(base + "/sw.js");
    assert.equal(sw.status, 200, "/sw.js served");
    assert.match(sw.headers.get("content-type") || "", /javascript/, "sw is javascript");
    assert.match(await sw.text(), /notificationclick/, "sw handles notification clicks");

    const snd = await fetch(base + "/sounds/idle-ping.mp3");
    assert.equal(snd.status, 200, "/sounds/*.mp3 served from the master origin");
    assert.match(snd.headers.get("content-type") || "", /audio\/mpeg/, "mp3 mime");

    const bad = await fetch(base + "/sounds/evil.txt");
    assert.equal(bad.status, 400, "non-mp3 sound → 400");
  } finally {
    close();
  }
});

test("N217: master serves a valid PWA manifest + icons; SW caches an offline shell", async () => {
  const port = 7920 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const man = await fetch(base + "/manifest.webmanifest");
    assert.equal(man.status, 200, "manifest served");
    assert.match(man.headers.get("content-type") || "", /manifest\+json/, "manifest mime");
    const m = await man.json();
    assert.equal(m.start_url, "/", "start_url is the hub");
    assert.equal(m.display, "standalone", "standalone display");
    assert.ok(m.icons.some((i) => i.purpose === "maskable"), "has a maskable icon");

    const icon = await fetch(base + "/icon.svg");
    assert.equal(icon.status, 200, "icon served");
    assert.match(icon.headers.get("content-type") || "", /image\/svg\+xml/, "svg mime");

    const sw = await (await fetch(base + "/sw.js")).text();
    assert.match(sw, /addEventListener\('fetch'/, "SW has a fetch handler");
    assert.match(sw, /caches\.match\('\/'\)/, "SW serves the cached shell offline");
    assert.match(sw, /indexOf\('\/api\/'\)/, "SW never caches /api");

    const shell = await (await fetch(base + "/")).text();
    assert.match(shell, /rel="manifest"/, "shell links the manifest");
    assert.match(shell, /name="theme-color"/, "shell sets theme-color");
  } finally {
    close();
  }
});

test("N218: an unknown /p/<id>/ shows an HTML page for navigations, JSON otherwise", async () => {
  const port = 8080 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const nav = await fetch(base + "/p/bogus/", { headers: { Accept: "text/html" } });
    assert.equal(nav.status, 404, "unknown project → 404");
    assert.match(nav.headers.get("content-type") || "", /text\/html/, "navigation gets HTML");
    const html = await nav.text();
    assert.match(html, /Back to the hub/, "error page links back to the hub");
    assert.doesNotMatch(html, /^\{/, "not raw JSON");

    const api = await fetch(base + "/p/bogus/");
    assert.match(api.headers.get("content-type") || "", /json/, "non-navigation gets JSON");
  } finally {
    close();
  }
});

test("reconcile: a second register with the same path adopts the existing entry", async () => {
  const port = 7280 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    await register(base, { projectId: "old-label", label: "old-label", url: "", path: "/tmp/proj-recon" });
    await register(base, { projectId: "Real Name", label: "Real Name", url: "http://x", path: "/tmp/proj-recon" });
    // N219 — `path` is no longer exposed to clients, so discriminate by projectId:
    // the shared path reconciled the two registers into one entry, re-keyed to
    // the live projectId, and the old projectId is gone.
    const list = await projects(base);
    assert.equal(
      list.filter((p) => p.projectId === "Real Name").length,
      1,
      "one entry re-keyed to the live projectId",
    );
    assert.equal(
      list.filter((p) => p.projectId === "old-label").length,
      0,
      "old projectId reconciled away (not duplicated)",
    );
  } finally {
    close();
  }
});

test("N219: the per-project token never reaches any client surface", async () => {
  const port = 7400 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const { id, token } = await register(base, {
      projectId: "sec-N219",
      label: "sec-N219",
      url: "http://127.0.0.1:59999",
      path: "/tmp/sec-N219",
    });
    assert.ok(token, "register still issues a token to the project (server-side auth)");

    // (a) GET /api/hub/projects — client-safe projection only.
    const list = await projects(base);
    const me = list.find((p) => p.id === id);
    assert.ok(me, "the project is listed");
    assert.equal(me.token, undefined, "no token field in the hub API");
    assert.equal(me.url, undefined, "no url field in the hub API");
    assert.equal(me.path, undefined, "no path field in the hub API");
    assert.equal(me.projectId, "sec-N219", "projectId IS exposed (needed for /project/<id>)");
    assert.ok(!JSON.stringify(list).includes(token), "the token string is absent from the hub API");

    // (b) overview HTML (SSR initial data) — token absent.
    const html = await (await fetch(base + "/")).text();
    assert.ok(!html.includes(token), "token absent from the overview page data");

    // (c) SSE project-update frame — token absent. Re-register (same path
    // reconciles) to trigger a broadcast while the stream is open.
    const frame = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("no project-update frame")), 3000);
      const req = httpGet(base + "/events", (res) => {
        let buf = "";
        res.on("data", (c) => {
          buf += c.toString();
          const m = buf.match(/event: project-update\ndata: (.*)\n/);
          if (m) {
            clearTimeout(timer);
            res.destroy();
            resolve(m[1]);
          }
        });
        res.on("error", reject);
      });
      req.on("error", reject);
      setTimeout(() => {
        void register(base, {
          projectId: "sec-N219",
          label: "sec-N219",
          url: "http://127.0.0.1:59999",
          path: "/tmp/sec-N219",
        });
      }, 150);
    });
    assert.ok(!frame.includes(token), "token absent from the SSE frame");
    assert.equal(JSON.parse(frame).token, undefined, "SSE frame has no token field");
  } finally {
    close();
  }
});

test("N220: /project/<projectId> proxies (by stable projectId); /p/<id> 301-redirects", async () => {
  const port = 8500 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  // A stub 'project dashboard' that echoes the path it was asked for.
  const stub = createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("stub:" + req.url);
  });
  await new Promise((r) => stub.listen(0, "127.0.0.1", r));
  const stubUrl = "http://127.0.0.1:" + stub.address().port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const { id } = await register(base, {
      projectId: "proj-by-pid",
      label: "proj-by-pid",
      url: stubUrl,
    });

    // /project/<projectId>/ resolves by the stable projectId and proxies through.
    const viaPid = await fetch(base + "/project/proj-by-pid/kanban");
    assert.equal(viaPid.status, 200, "proxied via projectId");
    assert.equal(await viaPid.text(), "stub:/kanban", "sub-path forwarded to the project");

    // /p/<registry-id> 301-redirects to the canonical /project/<projectId>/ path.
    const redir = await new Promise((resolve, reject) => {
      const rq = httpGet(base + "/p/" + id + "/kanban?x=1", (r) => {
        resolve({
          status: r.statusCode,
          location: r.headers.location,
          cacheControl: r.headers["cache-control"],
        });
        r.resume();
      });
      rq.on("error", reject);
    });
    assert.equal(redir.status, 301, "old /p/<id> path is a permanent redirect");
    assert.equal(
      redir.location,
      "/project/proj-by-pid/kanban?x=1",
      "redirects to the canonical projectId path (query preserved)",
    );
    // N220 review-fix — the 301 is not cached (avoids a stale redirect on id reuse).
    assert.equal(redir.cacheControl, "no-store", "301 is marked no-store");

    // /project/<id>/hub/* control-plane stays blocked (N219 guard still applies).
    const hub = await fetch(base + "/project/proj-by-pid/hub/reregister", { method: "POST" });
    assert.equal(hub.status, 404, "/hub/* is not proxied");

    // N220 review-fix — /p/<id>/hub/* 404s directly (does not 301-hop to it).
    const legacyHub = await fetch(base + "/p/" + id + "/hub/reregister", {
      method: "POST",
      redirect: "manual",
    });
    assert.equal(legacyHub.status, 404, "legacy /p/<id>/hub/* is not redirected");
  } finally {
    close();
    stub.close();
  }
});

test("N220/N231: the overview shell mounts the app that groups projects by online state", async () => {
  const port = 8650 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    // N231 — Running/Stopped grouping + the /project/ Open links now render
    // client-side. The server contract behind them is the per-project data: an
    // `online` flag (which section) and the stable `projectId` (the link target).
    await register(base, { projectId: "grp-proj", label: "grp-proj", url: "" });
    const entry = (await projects(base)).find((p) => p.projectId === "grp-proj");
    assert.ok(entry, "registered project appears in /api/hub/projects");
    assert.equal(typeof entry.online, "boolean", "carries the online flag the client groups by");
    assert.ok("projectId" in entry, "carries projectId for the /project/ Open link");

    // The shell serves the React island that renders those sections.
    const html = await (await fetch(base + "/")).text();
    assert.match(html, /<div id="root">/, "shell mounts the React overview app");
    assert.match(html, /\/assets\/[\w.-]+\.js/, "shell loads the overview bundle");
  } finally {
    close();
  }
});

test("N221: control-plane endpoints reject cross-origin browser requests (CSRF)", async () => {
  const port = 8330 + Math.floor(Math.random() * 120);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    // register: server-to-server (no browser headers) works; a cross-site POST
    // (which could poison a registry url/path) is refused.
    const ok = await register(base, { projectId: "csrf-ok", label: "csrf-ok", url: "" });
    assert.ok(ok.id && ok.token, "same-origin/server register works");
    const evilReg = await fetch(base + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json", "sec-fetch-site": "cross-site" },
      body: JSON.stringify({ projectId: "csrf-ok", label: "hijacked", url: "http://127.0.0.1:1" }),
    });
    assert.equal(evilReg.status, 403, "cross-site register is refused");

    // hub/projects + hub/refresh: same-origin reads work; cross-site refused.
    assert.equal((await fetch(base + "/api/hub/projects")).status, 200, "same-origin list works");
    const evilList = await fetch(base + "/api/hub/projects", {
      headers: { origin: "http://evil.example" },
    });
    assert.equal(evilList.status, 403, "cross-origin project-list read is refused");
    const evilRefresh = await fetch(base + "/api/hub/refresh", {
      method: "POST",
      headers: { "sec-fetch-site": "cross-site" },
    });
    assert.equal(evilRefresh.status, 403, "cross-site refresh is refused");
  } finally {
    close();
  }
});

test("N221: /api/fs/list lists sub-folders within the browse root and rejects escape", async () => {
  const root = mkdtempSync(join(tmpdir(), "if-browse-"));
  mkdirSync(join(root, "alpha"));
  mkdirSync(join(root, "beta"));
  mkdirSync(join(root, ".hidden"));
  const prev = process.env.INSIGHT_FLOW_BROWSE_ROOT;
  process.env.INSIGHT_FLOW_BROWSE_ROOT = root;
  const port = 8760 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    // Default dir = root: lists alpha + beta (sorted), hides dot-dirs, no parent.
    const r = await (await fetch(base + "/api/fs/list")).json();
    assert.deepEqual(
      r.entries.map((e) => e.name),
      ["alpha", "beta"],
      "sorted directories, hidden excluded",
    );
    assert.equal(r.parent, null, "no parent above the root");

    // Descend into alpha → it has a parent (back toward the root).
    const a = await (
      await fetch(base + "/api/fs/list?dir=" + encodeURIComponent(join(root, "alpha")))
    ).json();
    assert.ok(a.parent, "sub-folder exposes a parent");

    // Escape attempts (outside root / traversal) are refused.
    const outside = await fetch(base + "/api/fs/list?dir=" + encodeURIComponent(tmpdir()));
    assert.equal(outside.status, 400, "a path outside the root is refused");
    const traversal = await fetch(
      base + "/api/fs/list?dir=" + encodeURIComponent(join(root, "..", "..")),
    );
    assert.equal(traversal.status, 400, "traversal outside the root is refused");

    // A cross-site browser fetch (ACAO:* would otherwise leak the listing) → 403.
    const crossSite = await fetch(base + "/api/fs/list", {
      headers: { "sec-fetch-site": "cross-site" },
    });
    assert.equal(crossSite.status, 403, "cross-site fetch of the folder listing is refused");

    // N221 review-fix — DNS rebinding: the socket is loopback but the Host header
    // carries the attacker's hostname → refused (Host validation).
    const rawStatus = (headers) =>
      new Promise((resolve, reject) => {
        const rq = httpGet({ hostname: "127.0.0.1", port, path: "/api/fs/list", headers }, (res) => {
          resolve(res.statusCode);
          res.resume();
        });
        rq.on("error", reject);
      });
    assert.equal(
      await rawStatus({ Host: "evil.example:" + port }),
      403,
      "a non-loopback Host (DNS rebinding) is refused",
    );
    assert.equal(
      await rawStatus({ Origin: "http://evil.example" }),
      403,
      "a cross-origin Origin is refused",
    );
    assert.equal(
      await rawStatus({ Host: "localhost:" + port }),
      200,
      "a loopback Host + no cross-origin markers is allowed",
    );
  } finally {
    close();
    if (prev === undefined) delete process.env.INSIGHT_FLOW_BROWSE_ROOT;
    else process.env.INSIGHT_FLOW_BROWSE_ROOT = prev;
    rmSync(root, { recursive: true, force: true });
  }
});

test("N221: /api/projects/create scaffolds under the chosen folder; rejects outside root", async () => {
  const root = mkdtempSync(join(tmpdir(), "if-create-"));
  mkdirSync(join(root, "sub"));
  const prev = process.env.INSIGHT_FLOW_BROWSE_ROOT;
  process.env.INSIGHT_FLOW_BROWSE_ROOT = root;
  const port = 8910 + Math.floor(Math.random() * 80);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const ok = await fetch(base + "/api/projects/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "My Proj", dir: join(root, "sub") }),
    });
    assert.equal(ok.status, 200, "create under the chosen folder succeeds");
    const d = await ok.json();
    assert.match(d.path, /[/\\]sub[/\\]my-proj$/, "scaffolded as <chosen>/<slug>");
    assert.ok(existsSync(join(d.path, "taskflow.config.json")), "project was scaffolded");

    // A chosen folder outside the browse root is refused (no filesystem write).
    const bad = await fetch(base + "/api/projects/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Evil", dir: tmpdir() }),
    });
    assert.equal(bad.status, 400, "create outside the root is refused");
  } finally {
    close();
    if (prev === undefined) delete process.env.INSIGHT_FLOW_BROWSE_ROOT;
    else process.env.INSIGHT_FLOW_BROWSE_ROOT = prev;
    rmSync(root, { recursive: true, force: true });
  }
});

test("N222: /api/projects/create forwards install options (composer-authoring flow) to init", async () => {
  const root = mkdtempSync(join(tmpdir(), "if-n222-"));
  const prev = process.env.INSIGHT_FLOW_BROWSE_ROOT;
  process.env.INSIGHT_FLOW_BROWSE_ROOT = root;
  const port = 8940 + Math.floor(Math.random() * 50);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const r = await fetch(base + "/api/projects/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Authoring Proj",
        dir: root,
        lifecycle: true,
        activity: false,
        registerHub: false,
        editor: "claude",
        installFlows: ["composer-authoring"],
      }),
    });
    assert.equal(r.status, 200, "create with options succeeds");
    const d = await r.json();
    assert.ok(
      existsSync(join(d.path, ".claude/commands/task-authoring-create.md")),
      "composer-authoring flow installed through the endpoint",
    );
    assert.ok(
      existsSync(join(d.path, ".claude/commands/taskmaster.md")),
      "default flow commands still present",
    );
    // N222 review-fix (blocker 1) — a clean install reports no warnings.
    assert.deepEqual(d.warnings, [], "no flow-install warnings on success");
  } finally {
    close();
    if (prev === undefined) delete process.env.INSIGHT_FLOW_BROWSE_ROOT;
    else process.env.INSIGHT_FLOW_BROWSE_ROOT = prev;
    rmSync(root, { recursive: true, force: true });
  }
});

test("N219: the master never proxies a project's /hub/* control-plane routes", async () => {
  const port = 8300 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    // Registered + "live" project (url set), yet /hub/* under the proxy is
    // refused — so a LAN peer can't reach the loopback-only /hub/reregister via
    // /p/<id>/hub/reregister (which would arrive at the project from the master's
    // own loopback socket, defeating its gate).
    await register(base, { projectId: "hubguard", label: "hubguard", url: "http://127.0.0.1:59998" });
    const blocked = await fetch(base + "/p/hubguard/hub/reregister", { method: "POST" });
    assert.equal(blocked.status, 404, "/hub/* under the proxy is refused");
    assert.equal((await blocked.json()).error, "Not found", "generic 404, endpoint not revealed");

    // A non-/hub path for the same id still routes to the proxy (the stub port
    // is dead → 502), proving only /hub/* is special-cased, not the whole project.
    const proxied = await fetch(base + "/p/hubguard/whatever");
    assert.notEqual(proxied.status, 404, "non-/hub paths still go through the proxy");
  } finally {
    close();
  }
});

// Raw HTTP over the loopback socket so we control the Host/Origin headers a
// browser on the LAN would send. NOTE: the request's `remoteAddress` is always
// 127.0.0.1 here — a loopback-socket test *cannot* reproduce a real phone's LAN
// peer IP. So these tests verify the Host/Origin trust gate (isTrustedLocalRequest);
// the actual remote-peer reachability of the widened write/exec endpoints (N223
// option B) is only confirmable by the manual live phone check (CHECKLIST).
const statusForPath = (port, path, headers) =>
  new Promise((resolve, reject) => {
    const rq = httpGet({ hostname: "127.0.0.1", port, path, headers }, (res) => {
      resolve(res.statusCode);
      res.resume();
    });
    rq.on("error", reject);
  });

test("N223: INSIGHT_FLOW_TRUSTED_HOSTS widens the Host/Origin trust gate to allowlisted hosts only", async () => {
  const trusted = "192.168.0.77"; // an allowlisted LAN host
  const prev = process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  const statusFor = (port, headers) => statusForPath(port, "/api/hub/projects", headers);

  // (1) Default (env unset): a non-loopback Host is refused — behavior unchanged.
  delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  const p1 = 8960 + Math.floor(Math.random() * 15);
  let close = (await startMasterServer({ port: p1, standalone: false })).close;
  try {
    assert.equal(
      await statusFor(p1, { Host: trusted + ":" + p1 }),
      403,
      "without the env, an allowlist-candidate Host is still refused (default localhost-only)",
    );
    assert.equal(
      await statusFor(p1, { Host: "localhost:" + p1 }),
      200,
      "loopback Host still works by default",
    );
  } finally {
    close();
  }

  // (2) With the env set: a same-origin request whose Host is the allowlisted host
  //     passes the trust gate; a non-allowlisted Host and a cross-origin Origin are
  //     both still refused. (Verifies the gate widening on a read endpoint; does NOT
  //     assert phone reachability — see the note above.)
  process.env.INSIGHT_FLOW_TRUSTED_HOSTS = trusted + ":9999"; // host:port form normalizes to the host
  const p2 = 8980 + Math.floor(Math.random() * 15);
  close = (await startMasterServer({ port: p2, standalone: false })).close;
  try {
    assert.equal(
      await statusFor(p2, { Host: trusted + ":" + p2, Origin: "http://" + trusted + ":" + p2 }),
      200,
      "allowlisted Host + same-origin Origin passes the trust gate",
    );
    assert.equal(
      await statusFor(p2, { Host: "localhost:" + p2 }),
      200,
      "loopback is always trusted regardless of the env",
    );
    assert.equal(
      await statusFor(p2, { Host: "evil.example:" + p2 }),
      403,
      "a non-allowlisted Host (DNS rebinding) is still refused",
    );
    assert.equal(
      await statusFor(p2, { Host: trusted + ":" + p2, Origin: "http://evil.example" }),
      403,
      "a cross-origin Origin is still refused even with a trusted Host (CSRF)",
    );
  } finally {
    close();
    if (prev === undefined) delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
    else process.env.INSIGHT_FLOW_TRUSTED_HOSTS = prev;
  }
});

test("N223 (option B): the widened write/exec endpoints are governed by the trusted-host gate", async () => {
  // fs/list (and, by the same edit, create/start) is now gated by
  // isTrustedLocalRequest instead of a raw remoteAddress-loopback check. What a
  // loopback-socket test CAN show: with the host allowlisted, an allowlisted Host
  // reaches the handler while a non-allowlisted Host is refused — i.e. the endpoint
  // is governed by the same Host/Origin trust gate as the read control-plane.
  // What it CANNOT show (remoteAddress is always 127.0.0.1 here): that a real LAN
  // peer is no longer hard-blocked — that removal is verified by code review + the
  // manual live phone check (CHECKLIST). /api/register is intentionally NOT widened
  // and keeps its loopback-only remoteAddress gate (unchanged in this task).
  const root = mkdtempSync(join(tmpdir(), "if-n223-fs-"));
  mkdirSync(join(root, "sub"));
  const prevRoot = process.env.INSIGHT_FLOW_BROWSE_ROOT;
  const prevTrusted = process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  process.env.INSIGHT_FLOW_BROWSE_ROOT = root;
  const trusted = "192.168.0.77";
  const port = 8940 + Math.floor(Math.random() * 15);
  process.env.INSIGHT_FLOW_TRUSTED_HOSTS = trusted;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    // Allowlisted Host → reaches the handler (200), governed only by the trust gate.
    assert.equal(
      await statusForPath(port, "/api/fs/list", {
        Host: trusted + ":" + port,
        Origin: "http://" + trusted + ":" + port,
      }),
      200,
      "fs/list is reachable through the allowlisted-host trust gate (write-family endpoint widened)",
    );
    // Non-allowlisted Host → still refused; the endpoint is not open to all hosts.
    assert.equal(
      await statusForPath(port, "/api/fs/list", { Host: "evil.example:" + port }),
      403,
      "fs/list still refuses a non-allowlisted Host",
    );
    // Default (env unset) keeps fs/list localhost-only: a non-loopback Host is refused.
    delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
    assert.equal(
      await statusForPath(port, "/api/fs/list", { Host: trusted + ":" + port }),
      403,
      "without the env, fs/list refuses a non-loopback Host (default unchanged)",
    );
  } finally {
    close();
    if (prevRoot === undefined) delete process.env.INSIGHT_FLOW_BROWSE_ROOT;
    else process.env.INSIGHT_FLOW_BROWSE_ROOT = prevRoot;
    if (prevTrusted === undefined) delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
    else process.env.INSIGHT_FLOW_TRUSTED_HOSTS = prevTrusted;
    rmSync(root, { recursive: true, force: true });
  }
});

test("N223 (option B, security): the write/exec gate keeps a peer-IP defense — a forged loopback Host from a LAN peer is refused", () => {
  // Unit-test the exported predicate directly, because a loopback-socket
  // integration test can't set a non-loopback `remoteAddress`. This is the
  // regression the round-2 security review caught: dropping the remoteAddress
  // gate made `isTrustedLocalRequest` (header-only) forgeable by a curl-class
  // LAN client sending `Host: 127.0.0.1`.
  const req = (remoteAddress, headers) => ({ socket: { remoteAddress }, headers });
  const prev = process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
  try {
    // --- env UNSET → genuinely localhost-only for ALL client types ---
    delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
    assert.equal(
      isTrustedActionRequest(req("127.0.0.1", { host: "127.0.0.1:6100" })),
      true,
      "the local machine (loopback peer, loopback Host) is allowed",
    );
    assert.equal(
      isTrustedActionRequest(req("192.168.0.50", { host: "127.0.0.1:6100" })),
      false,
      "a NON-loopback peer forging a loopback Host is REFUSED (the regression)",
    );
    assert.equal(
      isTrustedActionRequest(req("192.168.0.50", { host: "192.168.0.77:6100" })),
      false,
      "a non-loopback peer with a non-allowlisted Host is refused",
    );

    // --- env SET to the hub's LAN IP → a real allowlisted phone passes (option B) ---
    process.env.INSIGHT_FLOW_TRUSTED_HOSTS = "192.168.0.77";
    assert.equal(
      isTrustedActionRequest(
        req("192.168.0.50", { host: "192.168.0.77:6100", origin: "http://192.168.0.77:6100" }),
      ),
      true,
      "a phone (non-loopback peer) targeting the allowlisted host is allowed",
    );
    assert.equal(
      isTrustedActionRequest(req("192.168.0.50", { host: "127.0.0.1:6100" })),
      false,
      "even with the env set, a forged loopback Host from a LAN peer is refused (must target the allowlisted host)",
    );
    assert.equal(
      isTrustedActionRequest(
        req("127.0.0.1", { host: "192.168.0.77:6100", origin: "http://evil.example" }),
      ),
      false,
      "a cross-origin Origin is refused even from a loopback peer (CSRF)",
    );
  } finally {
    if (prev === undefined) delete process.env.INSIGHT_FLOW_TRUSTED_HOSTS;
    else process.env.INSIGHT_FLOW_TRUSTED_HOSTS = prev;
  }
});
