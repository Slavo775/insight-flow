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
import { startMasterServer } from "../dist/index.js";

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
    assert.match(html, /refreshProjects\(\)/, "shell has the on-demand refresh");
    assert.match(html, /function startProject/, "shell has start-and-go");

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

test("N220: the overview renders Running and Stopped sections + /project links", async () => {
  const port = 8650 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const html = await (await fetch(base + "/")).text();
    assert.match(html, /'Running'/, "overview has a Running section");
    assert.match(html, /'Stopped'/, "overview has a Stopped section");
    assert.match(html, /section-label/, "section styling present");
    assert.match(html, /\/project\/'/, "Open links use the /project/ path");
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
