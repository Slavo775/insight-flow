/**
 * N273 — install trust boundary. Secrets are written atomically (0600) and a
 * corrupt file is never wiped; `include.ref` is a safe filename; an override of
 * a built-in agent may not drop the locked baseline; and the composer MCP
 * `install` needs confirmation for executable artifacts, reports missing inputs,
 * refuses to delete an installed def, and reports uninstall of a never-installed
 * target. Requires a prior build (dist/ present).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { writeSecrets, readSecrets, AgentModuleSchema, loadUserRegistries } from "../dist/index.js";

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), "../dist/cli.js");

function makeProject() {
  const dir = mkdtempSync(join(tmpdir(), "n273-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".activity.jsonl", maxEvents: 100 },
    }),
  );
  mkdirSync(join(dir, "insightFlow/workTasks"), { recursive: true });
  writeFileSync(
    join(dir, "insightFlow/workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

test("secrets: atomic 0600 write; a corrupt file is not wiped", () => {
  const dir = makeProject();
  writeSecrets(dir, { API_KEY: "sekret" });
  const path = join(dir, ".insight-flow/secrets.local.json");
  assert.deepEqual(readSecrets(dir), { API_KEY: "sekret" });
  // POSIX perms: owner-only. (mode bits are reliable on the Linux/macOS CI.)
  assert.equal(statSync(path).mode & 0o777, 0o600, "secrets file is 0600");

  // Merge preserves existing keys.
  writeSecrets(dir, { OTHER: "two" });
  assert.deepEqual(readSecrets(dir), { API_KEY: "sekret", OTHER: "two" });

  // A corrupt existing file must NOT be silently overwritten (which would drop
  // every other stored secret).
  writeFileSync(path, "{ not json", "utf-8");
  assert.throws(() => writeSecrets(dir, { THIRD: "three" }), /corrupt/);
  assert.equal(readFileSync(path, "utf-8"), "{ not json", "corrupt file left intact");
});

test("secrets: a corrupt-file error does not leak the file's contents (blocker 2)", () => {
  const dir = makeProject();
  const path = join(dir, ".insight-flow/secrets.local.json");
  mkdirSync(dirname(path), { recursive: true });
  // Invalid JSON (trailing comma) that holds a secret-looking value.
  writeFileSync(path, '{"API_KEY":"sk-live-LEAKME", }', "utf-8");
  let msg = "";
  try {
    writeSecrets(dir, { OTHER: "x" });
  } catch (e) {
    msg = e.message;
  }
  assert.match(msg, /corrupt/, "throws a corrupt-file error");
  assert.doesNotMatch(msg, /sk-live-LEAKME/, "the secret value must NOT be in the error message");
});

test("schema: include.ref must be a plain *.md filename", () => {
  const good = AgentModuleSchema.safeParse({
    id: "custom:i",
    title: "I",
    kind: "include",
    ref: "AGENT_X.md",
  });
  assert.equal(good.success, true, "AGENT_X.md accepted");

  for (const bad of ["../../.env", "a/b.md", "secrets", "AGENT_X.md/../x"]) {
    const r = AgentModuleSchema.safeParse({
      id: "custom:i",
      title: "I",
      kind: "include",
      ref: bad,
    });
    assert.equal(r.success, false, `ref ${JSON.stringify(bad)} rejected`);
  }
});

test("user-registry: an override of a built-in agent cannot drop the locked baseline", () => {
  const dir = makeProject();
  mkdirSync(join(dir, "insightFlow/agents"), { recursive: true });
  // Override the shipped task-implement agent, dropping enforcement + protocol.
  writeFileSync(
    join(dir, "insightFlow/agents/task-implement.json"),
    JSON.stringify({ id: "task-implement", title: "pwned", modules: ["security"] }),
  );
  assert.throws(
    () => loadUserRegistries(dir),
    /locked baseline/,
    "dropping enforcement/protocol from a built-in override is refused",
  );
});

// ---- composer MCP ----

async function withMcp(dir, fn) {
  const client = new Client({ name: "n273-test", version: "0.0.0" });
  await client.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: [CLI, "mcp"],
      cwd: dir,
      env: { ...process.env, HOME: dir },
      stderr: "ignore",
    }),
  );
  const call = async (name, args) => {
    const r = await client.callTool({ name, arguments: args });
    return { isError: !!r.isError, body: JSON.parse(r.content[0].text) };
  };
  try {
    return await fn(call);
  } finally {
    await client.close();
  }
}

test("MCP install: hook target needs confirm; delete refuses while installed", async () => {
  const dir = makeProject();
  await withMcp(dir, async (call) => {
    const mk = await call("create_module", {
      def: {
        id: "custom:xhook",
        title: "X hook",
        kind: "hook",
        event: "PreToolUse",
        command: "echo hi",
      },
    });
    assert.equal(mk.isError, false, "hook module created");

    // Install without confirm → plan only, nothing written.
    const plan = await call("install", { kind: "module", id: "custom:xhook" });
    assert.equal(plan.body.needsConfirm, true, "executable artifact → needsConfirm");
    assert.equal(
      existsSync(join(dir, ".claude/settings.json")),
      false,
      "no settings.json written without confirm",
    );

    // Install with confirm → applied.
    const applied = await call("install", { kind: "module", id: "custom:xhook", confirm: true });
    assert.equal(applied.body.ok, true, "confirm:true installs");

    // Delete while installed → refused.
    const del = await call("delete", { kind: "module", id: "custom:xhook" });
    assert.equal(del.isError, true, "delete of an installed def is refused");
    assert.match(del.body.error, /installed/);
  });
});

test("MCP install: missing ${VAR} inputs are reported, not written as literals", async () => {
  const dir = makeProject();
  await withMcp(dir, async (call) => {
    await call("create_module", {
      def: {
        id: "custom:needskey",
        title: "Needs key",
        kind: "mcp-server",
        name: "needskey",
        config: { command: "srv", env: { TOKEN: "${NEEDED_KEY}" } },
      },
    });
    const res = await call("install", { kind: "module", id: "custom:needskey", confirm: true });
    assert.equal(res.isError, true, "missing input → error");
    assert.ok(
      (res.body.missingInputs || []).includes("NEEDED_KEY"),
      "NEEDED_KEY reported as missing",
    );
  });
});

test("MCP uninstall: a never-installed target reports installed:false", async () => {
  const dir = makeProject();
  await withMcp(dir, async (call) => {
    const res = await call("uninstall", { kind: "module", id: "custom:never" });
    assert.equal(res.body.installed, false, "never-installed → installed:false");
  });
});

test("MCP update_agent: overriding a built-in cannot drop the locked baseline (write path, blocker 1)", async () => {
  const dir = makeProject();
  await withMcp(dir, async (call) => {
    // Eject the shipped task-implement agent, keeping only `security` (drops the
    // enforcement/protocol baseline). The loader already refused this; now the
    // WRITE path must too, else the accepted override bricks every later load.
    const res = await call("update_agent", {
      def: { id: "task-implement", title: "pwned", modules: ["security"] },
    });
    assert.equal(res.isError, true, "write path refuses the baseline-dropping override");
    assert.match(res.body.error, /locked baseline/);
  });
});

test("MCP install: a plan-only call reports missingInputs instead of failing (#8)", async () => {
  const dir = makeProject();
  await withMcp(dir, async (call) => {
    await call("create_module", {
      def: {
        id: "custom:needskey2",
        title: "Needs key",
        kind: "mcp-server",
        name: "needskey2",
        config: { command: "srv", env: { TOKEN: "${NEEDED_KEY2}" } },
      },
    });
    // No confirm, no values: must return the plan AND report the missing input,
    // not fail — so the caller can gather it before confirming.
    const res = await call("install", { kind: "module", id: "custom:needskey2" });
    assert.equal(res.isError, false, "plan-only call does not fail");
    assert.equal(res.body.needsConfirm, true, "hook/mcp target needs confirm");
    assert.ok((res.body.missingInputs || []).includes("NEEDED_KEY2"), "missing input reported");
  });
});
