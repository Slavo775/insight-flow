/**
 * N272 — localhost trust gate for both servers. Verifies the dashboard refuses
 * cross-origin writes (CSRF) and foreign-Host reads (DNS rebinding), sends no
 * `Access-Control-Allow-Origin`, no longer serves `/api/config`, and that the
 * hub pins its proxy to the project origin (no `//host:port` open-proxy escape)
 * and gates `/events`. Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { startMasterServer } from "../dist/index.js";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const DASH_PORT = 17180;
const PROJECT_NAME = "trust-gate-secret-marker";

function makeProject(port) {
  const dir = mkdtempSync(join(tmpdir(), "tf-trust-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: PROJECT_NAME,
      server: { port },
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".activity.jsonl", maxEvents: 100 },
      master: { standalone: true },
    }),
  );
  const wd = resolve(dir, "workTasks");
  mkdirSync(wd, { recursive: true });
  writeFileSync(
    resolve(wd, "master.json"),
    JSON.stringify({
      meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: ["tasks-N00-N09.json"] },
    }),
  );
  writeFileSync(
    resolve(wd, "tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks: [] }),
  );
  return dir;
}

async function withDashboard(fn) {
  const dir = makeProject(DASH_PORT);
  const child = spawn(process.execPath, [CLI, "ui", "--port", String(DASH_PORT)], {
    cwd: dir,
    env: { ...process.env, HOME: dir, INSIGHT_FLOW_NO_OPEN: "1" },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const r = await fetch(`http://127.0.0.1:${DASH_PORT}/health`, {
          signal: AbortSignal.timeout(300),
        });
        if (r.status === 200) {
          ready = true;
          break;
        }
      } catch {
        /* not ready */
      }
    }
    if (!ready) throw new Error("dashboard did not start within 6s");
    return await fn();
  } finally {
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

const D = (p) => `http://127.0.0.1:${DASH_PORT}${p}`;

// Node's `fetch` (undici) forbids overriding the `Host` header, so a raw
// http.request is required to simulate a DNS-rebinding request (loopback TCP
// peer, attacker hostname in Host).
function rawGet(port, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = httpRequest({ host: "127.0.0.1", port, path, method: "GET", headers }, (res) => {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", reject);
    req.end();
  });
}

test("dashboard: loopback GET is served, foreign Host is 421 (DNS rebinding)", async () => {
  await withDashboard(async () => {
    const ok = await fetch(D("/api/work-tasks/tasks-N00-N09.json"));
    assert.equal(ok.status, 200, "loopback GET → 200");

    const rebound = await rawGet(DASH_PORT, "/api/work-tasks/tasks-N00-N09.json", {
      Host: "evil.example",
    });
    assert.equal(rebound, 421, "foreign Host → 421");
  });
});

test("dashboard: no Access-Control-Allow-Origin on reads", async () => {
  await withDashboard(async () => {
    const res = await fetch(D("/api/work-tasks/tasks-N00-N09.json"));
    assert.equal(
      res.headers.get("access-control-allow-origin"),
      null,
      "ACAO header must be absent",
    );
  });
});

test("dashboard: cross-origin write is refused (CSRF → hook install chain)", async () => {
  await withDashboard(async () => {
    const res = await fetch(D("/api/modules"), {
      method: "POST",
      // A cross-site "simple request": text/plain avoids a preflight. The browser
      // still attaches a foreign Origin, which the gate rejects.
      headers: { "Content-Type": "text/plain", Origin: "https://evil.example" },
      body: JSON.stringify({
        id: "custom:x",
        title: "x",
        kind: "hook",
        event: "PreToolUse",
        command: "touch /tmp/if-pwned",
      }),
    });
    assert.equal(res.status, 403, "cross-origin POST → 403");
  });
});

test("dashboard: /api/config no longer leaks the config", async () => {
  await withDashboard(async () => {
    const res = await fetch(D("/api/config"));
    const body = await res.text();
    assert.ok(
      !body.includes(PROJECT_NAME),
      "the project config (projectName marker) must not be served",
    );
  });
});

test("dashboard: non-json work-tasks name is rejected", async () => {
  await withDashboard(async () => {
    const res = await fetch(D("/api/work-tasks/secrets.txt"));
    assert.equal(res.status, 400, "non-.json filename → 400");
  });
});

test("dashboard: HTML responses carry a CSP (N274)", async () => {
  await withDashboard(async () => {
    const res = await fetch(D("/"));
    const csp = res.headers.get("content-security-policy");
    assert.ok(csp, "CSP header present on the SPA shell");
    assert.match(csp, /img-src 'self' data:/, "img-src restricts remote images");
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  });
});

// ---- master hub ----

test("hub: proxy is pinned to the project origin (no //host:port escape)", async () => {
  const port = 6840 + Math.floor(Math.random() * 100);
  const base = `http://127.0.0.1:${port}`;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const reg = await fetch(base + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        projectId: "trustproj",
        label: "trustproj",
        url: "http://127.0.0.1:9", // dead loopback port; escape must 403 before connecting
      }),
    });
    assert.ok((await reg.json()).id, "registered");

    // Raw request so the `//` in the path survives to the server verbatim.
    const escape = await rawGet(port, "/project/trustproj//127.0.0.1:1/api/hub/projects");
    assert.equal(escape, 403, "protocol-relative proxy target → 403");
  } finally {
    await close();
  }
});

test("hub: /events refuses a cross-origin reader", async () => {
  const port = 6940 + Math.floor(Math.random() * 100);
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const status = await rawGet(port, "/events", { Origin: "https://evil.example" });
    assert.equal(status, 403, "cross-origin EventSource → 403");
  } finally {
    await close();
  }
});
