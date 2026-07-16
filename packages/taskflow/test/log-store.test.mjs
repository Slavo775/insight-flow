/**
 * N242 — debug log engine: log-store unit tests + master /log & /logs integration.
 * Run: node test/log-store.test.mjs (after `pnpm build`)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// Isolate the store in a temp global-config dir (getGlobalConfigDir reads this
// env at call time, so setting it before import + before any call is enough).
process.env.INSIGHT_FLOW_CONFIG_DIR = mkdtempSync(join(tmpdir(), "if-logs-"));

const { appendLog, readLogs, readMerged, clearLogs, startMasterServer } = await import(
  fileURLToPath(new URL("../dist/index.js", import.meta.url))
);

// ── log-store unit ────────────────────────────────────────────────────────

test("log-store: append + read roundtrip (enriched fields preserved)", () => {
  appendLog({
    type: "error",
    message: "boom",
    data: { a: 1 },
    timestamp: "2026-07-16T10:00:00.000Z",
    projectName: "proj-a",
  });
  const logs = readLogs("proj-a", "error");
  assert.equal(logs.length, 1);
  assert.equal(logs[0].message, "boom");
  assert.equal(logs[0].projectName, "proj-a");
  assert.deepEqual(logs[0].data, { a: 1 });
  // a different level is a different file → empty
  assert.equal(readLogs("proj-a", "info").length, 0);
});

test("log-store: throttled trim caps a file at 1000 on the first over-limit append", () => {
  for (let i = 0; i < 1001; i++) {
    appendLog({
      type: "info",
      message: "m" + i,
      timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, i)).toISOString(),
      projectName: "proj-trim",
    });
  }
  const logs = readLogs("proj-trim", "info");
  assert.equal(logs.length, 1000, "trimmed to exactly 1000");
  assert.equal(logs[0].message, "m1", "oldest entry (m0) was dropped");
});

test("log-store: readMerged sorts newest-first across projects", () => {
  appendLog({ type: "error", message: "old", timestamp: "2026-01-01T00:00:00.000Z", projectName: "p1" });
  appendLog({ type: "error", message: "new", timestamp: "2026-12-31T00:00:00.000Z", projectName: "p2" });
  const merged = readMerged({ type: "error" });
  assert.equal(merged[0].message, "new", "newest first");
});

test("log-store: clearLogs removes a project's logs", () => {
  appendLog({ type: "warning", message: "w", timestamp: "2026-06-01T00:00:00.000Z", projectName: "wipe-me" });
  assert.equal(readLogs("wipe-me", "warning").length, 1);
  clearLogs("wipe-me");
  assert.equal(readLogs("wipe-me", "warning").length, 0);
});

// ── master /log + /logs integration ───────────────────────────────────────

async function register(base, body) {
  const r = await fetch(base + "/api/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}
async function postLog(base, key, log) {
  return fetch(base + "/log", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ key, log }),
  });
}

test("master /log: valid token stores; bad key 401; bad body 400; master key works; GET /logs reads", async () => {
  const port = 6720 + Math.floor(Math.random() * 150);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    const { token } = await register(base, { projectId: "logproj", label: "logproj", url: "" });
    assert.ok(token, "register issues a token (the log key)");

    assert.equal(
      (await postLog(base, token, { type: "error", message: "hello", data: { x: 1 } })).status,
      202,
      "valid token + log → 202",
    );
    assert.equal(
      (await postLog(base, "nope-key", { type: "info", message: "m" })).status,
      401,
      "unknown key → 401",
    );
    assert.equal(
      (await postLog(base, token, { message: "no type" })).status,
      400,
      "invalid log (missing type) → 400",
    );
    assert.equal(
      (await postLog(base, "master", { type: "warning", message: "mw" })).status,
      202,
      "reserved master key → 202",
    );

    const all = await (await fetch(base + "/api/logs?project=all")).json();
    assert.ok(all.total >= 2, "GET /logs returns stored entries");
    assert.ok(
      all.logs.some((l) => l.message === "hello" && l.projectName === "logproj"),
      "project log present",
    );
    assert.ok(
      all.logs.some((l) => l.message === "mw" && l.projectName === "master"),
      "master log present",
    );

    const errOnly = await (await fetch(base + "/api/logs?project=logproj&type=error")).json();
    assert.ok(
      errOnly.logs.length > 0 && errOnly.logs.every((l) => l.type === "error" && l.projectName === "logproj"),
      "project+type filter works",
    );
  } finally {
    close();
  }
});
