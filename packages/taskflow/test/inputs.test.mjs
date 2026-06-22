/**
 * N165 — templated install inputs: placeholder scan/substitution, the local
 * secrets store, and emit's `${VAR}`-resolved mcp substitution + force overwrite.
 * Requires a prior build (imports from dist).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  scanPlaceholders,
  substituteVars,
  resolveInputs,
  readSecrets,
  writeSecrets,
  ensureGitignored,
  scrubSecrets,
  collectArtifacts,
  applyArtifacts,
  InstallConflictError,
} from "../dist/index.js";

const tmp = () => mkdtempSync(join(tmpdir(), "n165-"));
const readJson = (p) => JSON.parse(readFileSync(p, "utf-8"));

test("scanPlaceholders deep-collects ${VAR} names", () => {
  const found = scanPlaceholders({
    url: "${API_BASE}/mcp",
    headers: { Authorization: "Bearer ${CONTEXT7_API_KEY}" },
    args: ["--token", "${CONTEXT7_API_KEY}"],
    n: 42,
  });
  assert.deepEqual([...found].sort(), ["API_BASE", "CONTEXT7_API_KEY"]);
});

test("substituteVars resolves provided vars and leaves unknown placeholders literal", () => {
  const out = substituteVars(
    { h: { Authorization: "Bearer ${KEY}" }, u: "${HOST}/x", keep: "${UNSET}" },
    { KEY: "abc", HOST: "https://h" },
  );
  assert.equal(out.h.Authorization, "Bearer abc");
  assert.equal(out.u, "https://h/x");
  assert.equal(out.keep, "${UNSET}", "unprovided placeholder stays literal");
});

test("resolveInputs: implicit secret-by-default + metadata override", () => {
  const inputs = resolveInputs(["CONTEXT7_API_KEY", "REGION"], [
    { name: "REGION", title: "AWS region", secret: false },
  ]);
  assert.deepEqual(inputs[0], { name: "CONTEXT7_API_KEY", title: "CONTEXT7_API_KEY", secret: true });
  assert.deepEqual(inputs[1], { name: "REGION", title: "AWS region", secret: false });
});

test("secrets store: write/read roundtrip + merge", () => {
  const dir = tmp();
  writeSecrets(dir, { A: "1" });
  writeSecrets(dir, { B: "2" });
  assert.deepEqual(readSecrets(dir), { A: "1", B: "2" });
});

test("ensureGitignored adds patterns once (idempotent)", () => {
  const dir = tmp();
  const added = ensureGitignored(dir);
  assert.ok(added.includes(".mcp.json") && added.includes(".insight-flow/secrets.local.json"));
  const again = ensureGitignored(dir);
  assert.deepEqual(again, [], "already-ignored patterns are not re-added");
  const giLines = readFileSync(join(dir, ".gitignore"), "utf-8")
    .split("\n")
    .map((l) => l.trim());
  assert.equal(
    giLines.filter((l) => l === ".mcp.json").length,
    1,
    ".mcp.json listed exactly once",
  );
});

test("scrubSecrets masks known secret values in nested structures", () => {
  const out = scrubSecrets({ a: "Bearer sk-123", b: ["sk-123"] }, ["sk-123"]);
  assert.equal(out.a, "Bearer ***");
  assert.equal(out.b[0], "***");
});

// ---- emit: ${VAR} substitution into .mcp.json + resolved compare + force ----

const c7Registry = {
  c7: {
    id: "c7",
    title: "Context7",
    source: "builtin",
    kind: "mcp-server",
    name: "context7",
    config: { type: "http", headers: { Authorization: "Bearer ${CONTEXT7_API_KEY}" } },
  },
};
const c7Agent = { id: "a", title: "A", modules: ["c7"] };

test("install substitutes the input value into .mcp.json", () => {
  const dir = tmp();
  applyArtifacts(collectArtifacts(c7Agent, c7Registry), dir, "a", { CONTEXT7_API_KEY: "abc" });
  const cfg = readJson(join(dir, ".mcp.json")).mcpServers.context7;
  assert.equal(cfg.headers.Authorization, "Bearer abc");
});

test("re-install with the SAME value is idempotent (resolved compare)", () => {
  const dir = tmp();
  const art = collectArtifacts(c7Agent, c7Registry);
  applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "abc" });
  const reports = applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "abc" });
  assert.ok(
    reports.every((r) => r.action === "unchanged"),
    JSON.stringify(reports),
  );
});

test("re-install with a DIFFERENT value throws a structured InstallConflictError", () => {
  const dir = tmp();
  const art = collectArtifacts(c7Agent, c7Registry);
  applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "abc" });
  let thrown;
  try {
    applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "xyz" });
  } catch (e) {
    thrown = e;
  }
  assert.ok(thrown instanceof InstallConflictError, "is an InstallConflictError");
  assert.equal(thrown.conflict.kind, "mcp");
  assert.equal(thrown.conflict.name, "context7");
  assert.match(thrown.message, /already defines server 'context7'/);
});

test("force overwrites the differing config", () => {
  const dir = tmp();
  const art = collectArtifacts(c7Agent, c7Registry);
  applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "abc" });
  const reports = applyArtifacts(art, dir, "a", { CONTEXT7_API_KEY: "xyz" }, { force: true });
  assert.ok(reports.some((r) => r.target === ".mcp.json" && r.action === "updated"));
  const cfg = readJson(join(dir, ".mcp.json")).mcpServers.context7;
  assert.equal(cfg.headers.Authorization, "Bearer xyz");
});
