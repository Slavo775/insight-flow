/**
 * N274 — untrusted config + data never run code. events.hooks run only after
 * `trust-hooks` approves them; config paths are confined to the project; a config
 * Langfuse host is ignored when the keys come from the env; mr-update rejects a
 * non-http(s) URL; and HTML responses carry a CSP. Requires a prior build.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { resolveConfig, resolveLangfuseCreds } from "../dist/index.js";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

function makeProject(extraConfig = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n274-"));
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "n274",
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".taskflow-activity.jsonl", maxEvents: 100 },
      ...extraConfig,
    }),
  );
  const wd = resolve(dir, "workTasks");
  mkdirSync(wd, { recursive: true });
  writeFileSync(
    join(wd, "master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

function cli(dir, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd: dir,
    env: { ...process.env, HOME: dir, INSIGHT_FLOW_NO_OPEN: "1" },
    encoding: "utf-8",
  });
}

test("config: a path outside the project root is rejected", () => {
  const dir = makeProject({ rolesDir: "/tmp/escape-roles" });
  assert.throws(() => resolveConfig(dir), /must stay inside the project/);
});

test("config: master.url must be http(s)", () => {
  const dir = makeProject({ master: { url: "javascript:alert(1)" } });
  assert.throws(() => resolveConfig(dir), /master\.url must be an http\(s\) URL/);
});

test("langfuse: a config host is ignored when the keys come from the environment", () => {
  const saved = {
    pub: process.env.LANGFUSE_PUBLIC_KEY,
    sec: process.env.LANGFUSE_SECRET_KEY,
    host: process.env.LANGFUSE_HOST,
    base: process.env.LANGFUSE_BASEURL,
  };
  try {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-env";
    process.env.LANGFUSE_SECRET_KEY = "sk-env";
    delete process.env.LANGFUSE_HOST;
    delete process.env.LANGFUSE_BASEURL;
    const creds = resolveLangfuseCreds({
      observability: { langfuse: { enabled: true, host: "https://attacker.example" } },
    });
    assert.ok(creds, "creds resolved from env keys");
    assert.notEqual(creds.baseUrl, "https://attacker.example", "config host must be ignored");
  } finally {
    for (const [k, v] of [
      ["LANGFUSE_PUBLIC_KEY", saved.pub],
      ["LANGFUSE_SECRET_KEY", saved.sec],
      ["LANGFUSE_HOST", saved.host],
      ["LANGFUSE_BASEURL", saved.base],
    ]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test("mr-update rejects a non-http(s) URL", () => {
  const dir = makeProject();
  cli(dir, ["create", "--title", "t", "--type", "fix", "--priority", "low"]);
  const r = cli(dir, ["mr-update", "--id", "N00", "--url", "javascript:alert(1)"]);
  assert.notEqual(r.status, 0, "non-http(s) url exits non-zero");
  assert.match(r.stderr, /http\(s\)/);
});

test("events.hooks run only after trust-hooks approves them", async () => {
  const dir = makeProject({ events: { dedupWindowSeconds: 0 } });
  const marker = join(dir, "hook-ran");
  // single-quote the path inside the double-quoted `node -e` arg (tmp paths have
  // no single quotes), so the sh -c command parses correctly.
  const cmd = `node -e "require('fs').writeFileSync('${marker}','1')"`;
  // rewrite config with the hook (needs the absolute marker path)
  writeFileSync(
    join(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "n274",
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".taskflow-activity.jsonl", maxEvents: 100 },
      events: { dedupWindowSeconds: 0, hooks: { start: [cmd] } },
    }),
  );
  const waitMarker = async (want) => {
    for (let i = 0; i < 30; i++) {
      if (existsSync(marker) === want) return true;
      await new Promise((r) => setTimeout(r, 100));
    }
    return existsSync(marker) === want;
  };

  // Untrusted: the hook must NOT run.
  cli(dir, ["log-event", "start"]);
  assert.equal(await waitMarker(false), true, "untrusted hook did not run");

  // Approve, then it runs.
  const t = cli(dir, ["trust-hooks", "--yes"]);
  assert.equal(t.status, 0, "trust-hooks --yes succeeds");
  cli(dir, ["log-event", "start"]);
  assert.equal(await waitMarker(true), true, "trusted hook ran");
});
