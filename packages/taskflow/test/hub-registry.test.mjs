/**
 * N213 — the persistent master-hub registry (~/.insight-flow/hub.json): the
 * single source of truth for hub membership, folding in the legacy bulk-ui list.
 * Hermetic: INSIGHT_FLOW_CONFIG_DIR redirects the store to a temp dir. Requires
 * a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CFG = mkdtempSync(join(tmpdir(), "if-hub-"));
process.env.INSIGHT_FLOW_CONFIG_DIR = CFG;

const {
  readHubRegistry,
  upsertHubProject,
  findHubProjectByPath,
  assignHubPort,
  migrateBatchUiIntoHub,
  writeBatchUiRegistry,
  writeServerPortPointer,
  readServerPortPointer,
  clearServerPortPointer,
} = await import("../dist/index.js");

test("hub registry: empty read, upsert, idempotency, port assignment", () => {
  assert.deepEqual(readHubRegistry(), [], "missing file → empty");

  const entry = {
    id: "id-1",
    label: "alpha",
    path: "/tmp/alpha",
    port: 6007,
    bulkRegistered: true,
    registeredAt: "2026-07-10T00:00:00.000Z",
  };
  upsertHubProject(entry);
  assert.equal(readHubRegistry().length, 1, "one entry after upsert");
  assert.equal(findHubProjectByPath("/tmp/alpha")?.label, "alpha", "found by path");

  // Idempotent on path: no duplicate, keeps id + port.
  upsertHubProject({ ...entry, id: "id-CHANGED", port: 9999, label: "alpha-renamed" });
  const after = readHubRegistry();
  assert.equal(after.length, 1, "upsert by path does not duplicate");
  assert.equal(after[0].id, "id-1", "keeps original id");
  assert.equal(after[0].port, 6007, "keeps original port");
  assert.equal(after[0].label, "alpha-renamed", "refreshes label");

  // assignHubPort skips taken ports.
  assert.equal(assignHubPort(), 6008, "next free port skips 6007");
});

test("hub registry: folds bulk-ui entries in, idempotently", () => {
  writeBatchUiRegistry([
    { label: "beta", path: "/tmp/beta" },
    { label: "alpha", path: "/tmp/alpha" }, // already in hub → must not duplicate
  ]);

  const merged = migrateBatchUiIntoHub();
  const paths = merged.map((e) => e.path).sort();
  assert.deepEqual(paths, ["/tmp/alpha", "/tmp/beta"], "beta folded in, alpha not duplicated");
  assert.ok(
    merged.find((e) => e.path === "/tmp/beta")?.port >= 6007,
    "migrated entry got a port",
  );

  // Idempotent: a second migration adds nothing.
  const again = migrateBatchUiIntoHub();
  assert.equal(again.length, merged.length, "re-migration is a no-op");
});

test("hub registry: one malformed entry is dropped, not the whole list", () => {
  writeFileSync(
    join(CFG, "hub.json"),
    JSON.stringify({
      projects: [
        {
          id: "good",
          label: "good",
          path: "/tmp/good",
          port: 6007,
          bulkRegistered: true,
          registeredAt: "2026-07-10T00:00:00.000Z",
        },
        { id: "bad", label: "missing-fields" }, // invalid → dropped
      ],
    }),
  );
  const entries = readHubRegistry();
  assert.equal(entries.length, 1, "only the valid entry survives");
  assert.equal(entries[0].id, "good", "kept the good one");
});

test("N225: server-port pointer round-trips per project root (log-event delivery)", () => {
  const rootA = "/tmp/if-n225-proj-a";
  const rootB = "/tmp/if-n225-proj-b";
  assert.equal(readServerPortPointer(rootA), null, "unset root → null");
  writeServerPortPointer(rootA, 6007);
  writeServerPortPointer(rootB, 6008);
  assert.equal(readServerPortPointer(rootA), 6007, "reads A's real port");
  assert.equal(readServerPortPointer(rootB), 6008, "distinct per project root");
  clearServerPortPointer(rootA);
  assert.equal(readServerPortPointer(rootA), null, "cleared → null");
  assert.equal(readServerPortPointer(rootB), 6008, "clearing A leaves B");
});
