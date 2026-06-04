/**
 * N81 (1c) — the two bounded extension seams are real and swappable:
 *   - jsonFileStorage implements the Storage port (the JSON-file backend).
 *   - SocketIoTransport implements the Transport contract and attaches to a
 *     plain http server.
 * Both are exported from the package's public API. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { jsonFileStorage, SocketIoTransport } from "../dist/index.js";

test("jsonFileStorage implements the Storage port surface", () => {
  for (const m of [
    "loadMaster", "saveMaster", "loadShard", "saveShard", "loadTaskById",
    "loadAllTasks", "getShardFileName", "getShardPath", "ensureShardExists",
    "ensureWorkDir", "loadTaskReviews", "saveTaskReviews", "loadTaskIncidents",
    "saveTaskIncidents",
  ]) {
    assert.equal(typeof jsonFileStorage[m], "function", `jsonFileStorage.${m} should be a function`);
  }
});

test("SocketIoTransport satisfies the Transport contract and attaches to http", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const transport = new SocketIoTransport(server);
  try {
    assert.equal(typeof transport.emit, "function");
    assert.equal(typeof transport.onConnection, "function");
    assert.equal(typeof transport.close, "function");
    // emitting with no connected clients must be a harmless no-op
    transport.emit("ping", { ok: true });
    transport.onConnection(() => {});
  } finally {
    transport.close();
    await new Promise((resolve) => server.close(resolve));
  }
});
