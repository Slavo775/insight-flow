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
    await register(base, { projectId: "old-label", label: "old-label", url: "", path: "/tmp/proj" });
    await register(base, { projectId: "Real Name", label: "Real Name", url: "http://x", path: "/tmp/proj" });
    const list = (await projects(base)).filter((p) => p.path === "/tmp/proj");
    assert.equal(list.length, 1, "one entry for the path (reconciled, not duplicated)");
    assert.equal(list[0].projectId, "Real Name", "re-keyed to the live projectId");
  } finally {
    close();
  }
});
