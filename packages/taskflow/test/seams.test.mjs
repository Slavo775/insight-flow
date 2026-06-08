/**
 * N81 (1c) — the two bounded extension seams are real and swappable:
 *   - jsonFileStorage implements the Storage port (the JSON-file backend).
 *   - SseTransport implements the Transport contract (native SSE; replaced socket.io).
 * Both are exported from the package's public API. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { jsonFileStorage, SseTransport } from "../dist/index.js";

test("jsonFileStorage implements the Storage port surface", () => {
  for (const m of [
    "loadMaster",
    "saveMaster",
    "loadShard",
    "saveShard",
    "loadTaskById",
    "loadAllTasks",
    "getShardFileName",
    "getShardPath",
    "ensureShardExists",
    "ensureWorkDir",
    "loadTaskReviews",
    "saveTaskReviews",
    "loadTaskIncidents",
    "saveTaskIncidents",
  ]) {
    assert.equal(
      typeof jsonFileStorage[m],
      "function",
      `jsonFileStorage.${m} should be a function`,
    );
  }
});

test("SseTransport satisfies the Transport contract", () => {
  const transport = new SseTransport();
  assert.equal(typeof transport.handleRequest, "function");
  assert.equal(typeof transport.emit, "function");
  assert.equal(typeof transport.onConnection, "function");
  assert.equal(typeof transport.close, "function");
  // emitting / registering with no connected clients must be harmless no-ops
  transport.onConnection(() => {});
  transport.emit("ping", { ok: true });
  transport.close();
});
