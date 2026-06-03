/**
 * N81 stage 1a — characterization test pinning the PUBLISHED SURFACE.
 *
 * Guards the consolidation refactor (1b): the package's outward contract — bin,
 * exports, the npm-pack tarball file set, and the CLI command surface — must
 * survive the file moves unchanged. Assertions are "must still contain"
 * (superset-tolerant) on purpose: additive changes such as folding the master
 * server in as a new bin/entry must NOT trip the test, while any LOSS of
 * published surface will.
 *
 * Requires a prior build (dist/ present) — same as the rest of the suite.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PKG = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf-8"));
const PKG_DIR = fileURLToPath(new URL("..", import.meta.url));
const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

test("package.json: bin `insight-flow` → ./dist/cli.js", () => {
  assert.equal(PKG.name, "insight-flow");
  assert.equal(PKG.bin?.["insight-flow"], "./dist/cli.js");
});

test("package.json: public exports['.'] shape is stable", () => {
  const dot = PKG.exports?.["."];
  assert.ok(dot, "exports['.'] must exist");
  assert.equal(dot.import, "./dist/index.js");
  assert.equal(dot.types, "./dist/index.d.ts");
  assert.equal(PKG.main, "./dist/index.js");
  assert.equal(PKG.types, "./dist/index.d.ts");
});

test("package.json: `files` whitelist still includes the published roots", () => {
  const files = new Set(PKG.files ?? []);
  for (const f of ["dist", "schema", "templates", "README.md", "LICENSE"]) {
    assert.ok(files.has(f), `files[] must include '${f}'`);
  }
});

test("npm pack --dry-run: tarball keeps its top-level roots and required dist entries", () => {
  const raw = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    cwd: PKG_DIR,
    encoding: "utf-8",
  });
  const entry = JSON.parse(raw)[0];
  const paths = entry.files.map((f) => f.path);
  const topLevel = new Set(paths.map((p) => p.split("/")[0]));
  for (const d of ["dist", "schema", "templates", "README.md", "LICENSE", "package.json"]) {
    assert.ok(topLevel.has(d), `tarball must contain top-level '${d}'`);
  }
  for (const f of [
    "dist/cli.js",
    "dist/index.js",
    "dist/index.d.ts",
    "dist/sounds/idle-ping.mp3",
    "dist/sounds/permission-alert.mp3",
  ]) {
    assert.ok(paths.includes(f), `tarball must contain '${f}'`);
  }
});

test("bin: `insight-flow --help` exits 0 and enumerates the command surface", () => {
  const out = execFileSync(process.execPath, [CLI, "--help"], { encoding: "utf-8" });
  const commands = [
    "init", "ui", "create", "status", "list", "current", "show", "stats",
    "next", "next-review", "next-fix", "next-change",
    "implement-start", "implement-end", "review-start", "review-end",
    "fix-start", "fix-end", "push", "mr-update", "merge", "done",
    "change-request", "change-start", "change-end",
    "incident-create", "incident-status", "incident-resolve", "incident-list",
    "migrate", "migrate-reviews", "prompt-build",
    "install-activity-hook", "install-lifecycle-hooks", "migrate-hooks",
    "notify", "log-activity", "log-event", "hook",
    "bulk-register", "bulk-unregister", "bulk-down", "bulk-ui",
  ];
  for (const cmd of commands) {
    assert.match(out, new RegExp("(^|\\s)" + cmd + "(\\s|$)", "m"), `--help must list '${cmd}'`);
  }
});
