/**
 * HTTP-level tests for N68 `POST /log/events`.
 * Spawns the CLI server on an ephemeral port, exercises the request handler
 * via real `fetch` calls, kills the server afterwards.
 *
 * Run: node test/log-events-endpoint.test.mjs (after `pnpm build`)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const PORT = 17068;

function makeTmpProject(port) {
  const dir = mkdtempSync(join(tmpdir(), "tf-logevents-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "logevents-test",
      rolesDir: ".claude/roles",
      server: { port },
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".activity.jsonl", maxEvents: 100 },
      master: { standalone: true },
    }),
  );
  mkdirSync(resolve(dir, "workTasks"), { recursive: true });
  writeFileSync(
    resolve(dir, "workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

async function withServer(port, fn) {
  const dir = makeTmpProject(port);
  const child = spawn(process.execPath, [CLI, "ui", "--port", String(port)], {
    cwd: dir,
    env: { ...process.env, HOME: dir },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const r = await fetch(`http://127.0.0.1:${port}/log/status`, {
          signal: AbortSignal.timeout(300),
        });
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {
        /* not ready */
      }
    }
    if (!ready) throw new Error("server did not start within 4s");
    return await fn();
  } finally {
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

async function post(port, body) {
  return await fetch(`http://127.0.0.1:${port}/log/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("POST /api/agent-permission returns 200", async () => {
  await withServer(PORT + 1, async () => {
    const res = await fetch(`http://127.0.0.1:${PORT + 1}/api/agent-permission`, {
      method: "POST",
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });
});

test("POST /api/agent-done returns 200", async () => {
  await withServer(PORT + 2, async () => {
    const res = await fetch(`http://127.0.0.1:${PORT + 2}/api/agent-done`, { method: "POST" });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
  });
});

test("POST /log/events: Stop event derives `done` and returns 200", async () => {
  await withServer(PORT, async () => {
    const res = await post(PORT, {
      id: "evt-stop-1",
      timestamp: "2026-05-28T10:00:00.000Z",
      type: "Stop",
      payload: {},
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.status, "done");
    assert.equal(body.duplicate, false);
  });
});

test("POST /log/events: invalid JSON returns 400", async () => {
  await withServer(PORT, async () => {
    const res = await post(PORT, "not-json-{");
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /JSON/);
  });
});

test("POST /log/events: missing required field returns 400 with issues", async () => {
  await withServer(PORT, async () => {
    const res = await post(PORT, { type: "Stop" });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.equal(body.error, "validation failed");
    assert.ok(Array.isArray(body.issues));
    assert.ok(body.issues.length > 0);
  });
});

test("POST /log/events: oversize body returns 413 (not connection reset)", async () => {
  await withServer(PORT, async () => {
    const huge = "x".repeat(70 * 1024);
    const res = await post(PORT, {
      id: "evt-huge",
      timestamp: "2026-05-28T10:00:00.000Z",
      type: "Notification",
      payload: { message: huge },
    });
    assert.equal(res.status, 413);
    const body = await res.json();
    assert.equal(body.ok, false);
    assert.match(body.error, /too large/);
  });
});

test("POST /log/events: duplicate id is reported as duplicate, status unchanged", async () => {
  await withServer(PORT, async () => {
    const event = {
      id: "evt-dup-1",
      timestamp: "2026-05-28T10:00:00.000Z",
      type: "Stop",
      payload: {},
    };
    const first = await post(PORT, event);
    assert.equal(first.status, 200);
    const firstBody = await first.json();
    assert.equal(firstBody.duplicate, false);
    assert.equal(firstBody.status, "done");

    const second = await post(PORT, event);
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.duplicate, true);
    assert.equal(secondBody.status, "done");
  });
});

test("POST /log/events: Notification with permission wording yields awaiting-permission", async () => {
  await withServer(PORT, async () => {
    const res = await post(PORT, {
      id: "evt-perm-1",
      timestamp: "2026-05-28T10:00:00.000Z",
      type: "Notification",
      payload: { message: "Claude needs your permission to use Bash" },
    });
    const body = await res.json();
    assert.equal(body.status, "awaiting-permission");
  });
});

test("GET /log/status returns current status + events array", async () => {
  await withServer(PORT, async () => {
    await post(PORT, {
      id: "evt-pre-1",
      // N238 — a fresh timestamp: the stuck-active decay reads a >5min-stale
      // event as idle, so "active" requires a recent event (as in real usage).
      timestamp: new Date().toISOString(),
      type: "PreToolUse",
      payload: { tool_name: "Read" },
    });
    const res = await fetch(`http://127.0.0.1:${PORT}/log/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.status, "active");
    assert.ok(Array.isArray(body.events));
    assert.equal(body.events.length, 1);
  });
});
