/**
 * N81 — the master overview server is now folded into this package (it used to
 * be the standalone `insight-flow-master` binary). This proves the folded
 * server boots from the package's own public API and serves /overview, and that
 * standalone mode rejects registrations.
 *
 * Hermetic: starts on a random port in standalone mode (no lock file, no
 * ~/.insight-flow dependency). Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { startMasterServer } from "../dist/index.js";

test("folded master server serves /overview and rejects registration in standalone", async () => {
  const port = 6500 + Math.floor(Math.random() * 200);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: true });
  try {
    const overview = await fetch(base + "/overview");
    assert.equal(overview.status, 200, "/overview should answer 200");
    const html = await overview.text();
    assert.match(html, /<html|<!doctype/i, "/overview should serve an HTML document");

    const register = await fetch(base + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(register.status, 503, "standalone master must reject /api/register");
  } finally {
    close();
  }
});
