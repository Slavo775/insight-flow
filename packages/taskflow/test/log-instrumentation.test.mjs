/**
 * N243 — instrumentation: the master logs the registration handshake into its
 * own debug log (received + generated code). Run after `pnpm build`.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

process.env.INSIGHT_FLOW_CONFIG_DIR = mkdtempSync(join(tmpdir(), "if-loginstr-"));

const { startMasterServer } = await import(
  fileURLToPath(new URL("../dist/index.js", import.meta.url))
);

test("N243: registering a project writes master-side registration logs", async () => {
  const port = 6870 + Math.floor(Math.random() * 120);
  const base = "http://localhost:" + port;
  const { close } = await startMasterServer({ port, standalone: false });
  try {
    await fetch(base + "/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "regtest", label: "regtest", url: "" }),
    });

    const info = await (await fetch(base + "/api/logs?project=master&type=info")).json();
    const byMsg = info.logs.map((l) => l.message);
    assert.ok(byMsg.includes("registration received"), "logged 'registration received'");
    assert.ok(byMsg.includes("generated code"), "logged 'generated code'");
    assert.ok(
      info.logs.every((l) => l.projectName === "master"),
      "master registration logs live under the master project",
    );
    assert.ok(
      info.logs.some((l) => l.data && l.data.projectId === "regtest"),
      "the log carries the registering project's id",
    );
  } finally {
    close();
  }
});
