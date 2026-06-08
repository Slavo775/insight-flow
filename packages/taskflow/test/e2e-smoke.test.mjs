/**
 * N81 stage 1a — dashboard e2e smoke.
 *
 * Boots the real `insight-flow ui` server (built dist/cli.js) in a throwaway
 * project and asserts the core HTTP surface answers 200. Hermetic by design:
 *   - master integration disabled via config.master.standalone (no :6100 spawn)
 *   - browser auto-open suppressed via INSIGHT_FLOW_NO_OPEN=1
 *
 * The live master/overview view is covered separately once the master server is
 * folded in (post stage-1b); /overview 404s here because no master is running.
 *
 * Requires a prior build (dist/ present) — same as the rest of the suite.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-e2e-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify(
      {
        workDir: "workTasks",
        shardSize: 10,
        projectName: "n81-e2e",
        master: { standalone: true },
        activityEngine: { enabled: false },
      },
      null,
      2,
    ),
  );
  const workDir = resolve(dir, "workTasks");
  mkdirSync(workDir, { recursive: true });
  writeFileSync(
    resolve(workDir, "master.json"),
    JSON.stringify(
      {
        meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: ["tasks-N00-N09.json"] },
      },
      null,
      2,
    ) + "\n",
  );
  writeFileSync(
    resolve(workDir, "tasks-N00-N09.json"),
    JSON.stringify({ range: { from: 0, to: 9 }, tasks: [] }, null, 2) + "\n",
  );
  return dir;
}

async function waitForOk(url, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200) return res;
      lastErr = new Error("status " + res.status);
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("server not ready at " + url + ": " + (lastErr?.message ?? "timeout"));
}

// Reads an SSE stream until it sees the snapshot frame (or times out), then
// cancels — so the test never hangs on the perpetually-open stream.
async function readSse(url, timeoutMs = 3000) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  let text = "";
  try {
    const res = await fetch(url, { headers: { accept: "text/event-stream" }, signal: ac.signal });
    if (res.status !== 200) throw new Error("SSE status " + res.status);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const { value, done } = await reader.read();
      if (done) break;
      text += decoder.decode(value, { stream: true });
      if (text.includes("event: snapshot")) break;
    }
    await reader.cancel().catch(() => {});
  } catch (err) {
    if (err.name !== "AbortError") throw err;
  } finally {
    clearTimeout(timer);
  }
  return text;
}

test("ui server boots and answers /, /api/work-tasks, /api/activity", async () => {
  const dir = makeProject();
  const port = 6800 + Math.floor(Math.random() * 1000);
  const base = "http://localhost:" + port;
  const child = spawn(process.execPath, [CLI, "ui", "--port", String(port)], {
    cwd: dir,
    env: { ...process.env, INSIGHT_FLOW_NO_OPEN: "1" },
    stdio: "ignore",
  });
  // If the server crashes during startup, surface it instead of hanging.
  const exitedEarly = new Promise((_resolve, reject) => {
    child.on("exit", (code) => reject(new Error("ui server exited early, code=" + code)));
  });
  exitedEarly.catch(() => {}); // settled later by our own kill — don't leak a rejection

  try {
    const root = await Promise.race([waitForOk(base + "/"), exitedEarly]);
    assert.equal(root.status, 200);
    const html = await root.text();
    assert.match(html, /<html|<!doctype/i, "/ should serve an HTML document");

    const tasks = await fetch(base + "/api/work-tasks");
    assert.equal(tasks.status, 200, "/api/work-tasks should answer 200");

    const activity = await fetch(base + "/api/activity");
    assert.equal(activity.status, 200, "/api/activity should answer 200");

    // N83: the SSE stream must deliver the initial snapshot frame.
    const sseText = await readSse(base + "/sse", 3000);
    assert.match(sseText, /event: snapshot/, "/sse should stream a snapshot frame");
    assert.match(sseText, /data: \{/, "/sse snapshot should carry a JSON data line");
  } finally {
    child.kill("SIGINT");
    await new Promise((r) => setTimeout(r, 200));
    try {
      child.kill("SIGKILL");
    } catch {
      // already gone
    }
    rmSync(dir, { recursive: true, force: true });
  }
});
