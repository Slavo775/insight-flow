/**
 * N151 — dashboard request error boundary. Spawns the CLI server, corrupts the
 * project's master.json after boot, and asserts /api/task-flow returns 500
 * (handled) and the server stays up — i.e. an unhandled throw in an async body
 * callback no longer crashes the long-running dashboard.
 *
 * Run: node test/dashboard-error-boundary.test.mjs (after `pnpm build`)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function setup(port) {
  const dir = mkdtempSync(join(tmpdir(), "tf-dasherr-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "dasherr",
      rolesDir: ".claude/roles",
      server: { port },
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".a.jsonl", maxEvents: 100 },
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
  const dir = setup(port);
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
    return await fn(dir);
  } finally {
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

test("N151: malformed master.json → /api/task-flow returns 500, server stays up", async () => {
  const PORT = 17151;
  await withServer(PORT, async (dir) => {
    // corrupt the project's master.json after the server is up
    writeFileSync(resolve(dir, "workTasks/master.json"), "{ this is not valid json");
    const res = await fetch(`http://127.0.0.1:${PORT}/api/task-flow`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "N00", flow: "default" }),
    });
    assert.equal(res.status, 500, "malformed master is handled, not a crash");
    // the server is still responsive (it did not exit)
    const status = await fetch(`http://127.0.0.1:${PORT}/log/status`, {
      signal: AbortSignal.timeout(500),
    });
    assert.equal(status.status, 200, "dashboard survived the bad request");
  });
});
