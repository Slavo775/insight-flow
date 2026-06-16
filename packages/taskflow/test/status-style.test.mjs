/**
 * N130 — status display resolvers (label/color/canonical) read the relevant
 * flow's status set, falling back to the raw id / no color. The shipped default
 * flow declares title === id and the canonical colors, so a default-only
 * workspace's badges/timeline resolve byte-identically to today.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { statusLabel, statusColor, isCanonicalStatus, DEFAULT_PROJECT } from "../dist/index.js";

const custom = [
  { id: "queued", title: "Queued", color: "#abcabc" },
  { id: "shipped", title: "Shipped", terminal: true }, // no color
];

test("N130: a custom status resolves its own title and color", () => {
  assert.equal(statusLabel("queued", custom), "Queued");
  assert.equal(statusColor("queued", custom), "#abcabc");
  assert.equal(isCanonicalStatus("queued"), false);
});

test("N130: a custom status without a color falls back (undefined color)", () => {
  assert.equal(statusLabel("shipped", custom), "Shipped");
  assert.equal(statusColor("shipped", custom), undefined);
});

test("N130: an unknown status degrades to the raw id / no color", () => {
  assert.equal(statusLabel("mystery", custom), "mystery");
  assert.equal(statusColor("mystery", custom), undefined);
  assert.equal(statusLabel("mystery"), "mystery"); // no flow set at all
});

test("N130: canonical statuses recognized; default flow is byte-identical", () => {
  assert.equal(isCanonicalStatus("in-progress"), true);
  assert.equal(isCanonicalStatus("done"), true);
  // title === id ⇒ badge text unchanged; canonical color preserved
  assert.equal(statusLabel("in-progress", DEFAULT_PROJECT.statuses), "in-progress");
  assert.equal(statusColor("in-progress", DEFAULT_PROJECT.statuses), "#f59e0b");
  // a status with no theme color omits it ⇒ caller falls back to neutral
  assert.equal(statusColor("done", DEFAULT_PROJECT.statuses), undefined);
});
