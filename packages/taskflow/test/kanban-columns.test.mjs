/**
 * N129 — kanban columns derived from flows' status sets: default-only parity,
 * custom-flow columns appended/deduped, orphan statuses collected.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildColumns,
  orphanStatuses,
  CANONICAL_COLUMNS,
  DEFAULT_PROJECT,
  TASK_STATUSES,
} from "../dist/index.js";

test("N129: default-only board == the canonical 6 columns (parity)", () => {
  const cols = buildColumns([DEFAULT_PROJECT]);
  assert.deepEqual(cols, CANONICAL_COLUMNS); // keys, labels, and matches identical
  // every canonical status has a home — no orphans for real tasks
  assert.deepEqual(orphanStatuses([...TASK_STATUSES], cols), []);
});

test("N129: a custom flow's non-canonical statuses become appended columns", () => {
  const custom = {
    id: "custom:qa",
    statuses: [
      { id: "ready", title: "Ready" }, // canonical → folds into its column
      { id: "queued", title: "Queued" },
      { id: "verifying", title: "Verifying" },
      { id: "shipped", title: "Shipped", terminal: true },
    ],
  };
  const cols = buildColumns([DEFAULT_PROJECT, custom]);
  assert.deepEqual(cols.slice(0, 6), CANONICAL_COLUMNS); // canonical unchanged
  assert.deepEqual(
    cols.slice(6).map((c) => ({ key: c.key, label: c.label, matches: c.matches })),
    [
      { key: "queued", label: "Queued", matches: ["queued"] },
      { key: "verifying", label: "Verifying", matches: ["verifying"] },
      { key: "shipped", label: "Shipped", matches: ["shipped"] },
    ],
  );
  // the canonical 'ready' did NOT create a duplicate column
  assert.equal(cols.filter((c) => c.key === "ready").length, 1);
});

test("N129: duplicate custom statuses across flows are deduped (first wins)", () => {
  const a = { id: "custom:a", statuses: [{ id: "queued", title: "Queued A" }] };
  const b = { id: "custom:b", statuses: [{ id: "queued", title: "Queued B" }] };
  const cols = buildColumns([a, b]);
  assert.equal(cols.filter((c) => c.key === "queued").length, 1);
  assert.equal(cols.find((c) => c.key === "queued").label, "Queued A");
});

test("N129: orphan statuses (matched by no column) are reported in order, deduped", () => {
  const cols = buildColumns([DEFAULT_PROJECT]);
  const orphans = orphanStatuses(["in-progress", "weird", "merged", "weird", "lost"], cols);
  assert.deepEqual(orphans, ["weird", "lost"]);
});
