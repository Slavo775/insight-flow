/**
 * N282 — hub reliability. The service worker's cache name is version-stamped
 * (so a release invalidates the old cache) and it only caches an HTML shell
 * under '/'; and a second master on a busy port rejects with a clear error
 * instead of hanging. Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { startMasterServer } from "../dist/index.js";

const port = () => 6300 + Math.floor(Math.random() * 200);

test("A23/A79: /sw.js cache is version-stamped and only caches HTML under '/'", async () => {
  const p = port();
  const { close } = await startMasterServer({ port: p, standalone: true });
  try {
    const sw = await (await fetch(`http://127.0.0.1:${p}/sw.js`)).text();
    assert.ok(!sw.includes("if-hub-v3"), "the fixed 'if-hub-v3' cache name is gone");
    assert.match(sw, /var CACHE = 'if-hub-\d+\.\d+\.\d+/, "cache name carries the package version");
    assert.match(sw, /text\/html/, "navigate branch only caches an HTML shell under '/'");
  } finally {
    await close();
  }
});

test("A50: a second master on a busy port rejects with a clear error (no hang)", async () => {
  const p = port();
  const first = await startMasterServer({ port: p, standalone: true });
  try {
    await assert.rejects(
      startMasterServer({ port: p, standalone: true }),
      /EADDRINUSE|address already in use|listen/i,
      "starting a second master on the same port rejects",
    );
  } finally {
    await first.close();
  }
});
