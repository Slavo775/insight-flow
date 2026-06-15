/**
 * N103 — HTTP CRUD for custom definitions. Spawns the CLI server on an
 * ephemeral port and exercises the full matrix: create/read/update/delete,
 * 400 validation, 403 built-ins, 404 unknown, 409 duplicate + referenced.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const PORT = 17103;

function makeTmpProject(port) {
  const dir = mkdtempSync(join(tmpdir(), "tf-customdefs-"));
  writeFileSync(
    resolve(dir, "taskflow.config.json"),
    JSON.stringify({
      workDir: "workTasks",
      shardSize: 10,
      projectName: "customdefs-test",
      rolesDir: ".claude/roles",
      server: { port },
      notifications: { browser: false, cli: false },
      activityEngine: { enabled: false, logFile: ".activity.jsonl", maxEvents: 100 },
      master: { standalone: true },
    }),
  );
  mkdirSync(resolve(dir, "workTasks"), { recursive: true });
  writeFileSync(
    resolve(dir, "workTasks/master.json"),
    JSON.stringify({ meta: { nextId: 0, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
  );
  return dir;
}

async function withServer(fn) {
  const dir = makeTmpProject(PORT);
  const child = spawn(process.execPath, [CLI, "ui", "--port", String(PORT)], {
    cwd: dir,
    env: { ...process.env, HOME: dir },
    stdio: "ignore",
  });
  try {
    let ready = false;
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const r = await fetch(`http://127.0.0.1:${PORT}/api/modules`, {
          signal: AbortSignal.timeout(300),
        });
        if (r.ok) {
          ready = true;
          break;
        }
      } catch {
        /* not ready */
      }
    }
    if (!ready) throw new Error("server did not start within 4s");
    return await fn(dir);
  } finally {
    child.kill("SIGKILL");
    rmSync(dir, { recursive: true, force: true });
  }
}

function api(path, method, body) {
  return fetch(`http://127.0.0.1:${PORT}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const MODULE = {
  id: "custom:greeting",
  title: "Greeting section",
  kind: "section",
  heading: "GREETING",
  body: "- Say hello.",
};
const AGENT = { id: "custom:greeter", title: "Greeter", modules: ["security", "custom:greeting"] };
const PROJECT = {
  id: "custom:hotfix",
  title: "Hotfix",
  agents: ["task-implement", "custom:greeter"],
  flow: [{ from: "task-implement", to: "custom:greeter", on: "implemented" }],
  install: [],
};

test("full CRUD matrix over modules/agents/projects", async () => {
  await withServer(async (dir) => {
    // create module → 201, visible in /api/modules as custom
    let r = await api("/api/modules", "POST", MODULE);
    assert.equal(r.status, 201);
    let listed = await (await api("/api/modules", "GET")).json();
    const mod = listed.modules.find((m) => m.id === "custom:greeting");
    assert.equal(mod?.source, "custom");
    assert.ok(existsSync(join(dir, "insightFlow/modules/greeting.json")), "file in user space");

    // agent referencing it → 201; project referencing the agent → 201
    assert.equal((await api("/api/agents", "POST", AGENT)).status, 201);
    assert.equal((await api("/api/projects", "POST", PROJECT)).status, 201);

    // referenced deletes → 409 with referencing ids
    r = await api("/api/modules/custom:greeting", "DELETE");
    assert.equal(r.status, 409);
    assert.deepEqual((await r.json()).referencedBy, ["custom:greeter"]);
    r = await api("/api/agents/custom:greeter", "DELETE");
    assert.equal(r.status, 409);
    assert.deepEqual((await r.json()).referencedBy, ["custom:hotfix"]);

    // unwind in order → 200s
    assert.equal((await api("/api/projects/custom:hotfix", "DELETE")).status, 200);
    assert.equal((await api("/api/agents/custom:greeter", "DELETE")).status, 200);
    assert.equal((await api("/api/modules/custom:greeting", "DELETE")).status, 200);
    listed = await (await api("/api/modules", "GET")).json();
    assert.equal(
      listed.modules.find((m) => m.id === "custom:greeting"),
      undefined,
    );
  });
});

test("validation, immutability, and conflict failure modes", async () => {
  await withServer(async () => {
    // invalid payload → 400 with zod issue paths
    let r = await api("/api/modules", "POST", { id: "custom:x", title: "X", kind: "section" });
    assert.equal(r.status, 400);
    assert.ok((await r.json()).issues?.length > 0);

    // built-in id → 403 (both shapes)
    r = await api("/api/modules", "POST", { ...MODULE, id: "security" });
    assert.equal(r.status, 403);
    r = await api("/api/agents/task-implement", "DELETE");
    assert.equal(r.status, 403);

    // dangling agent ref → 400 with the module id
    r = await api("/api/agents", "POST", { ...AGENT, modules: ["custom:nope"] });
    assert.equal(r.status, 400);
    assert.match((await r.json()).error, /custom:nope/);

    // unknown PUT → 404; duplicate POST → 409; id mismatch → 400
    r = await api("/api/modules/custom:ghost", "PUT", { ...MODULE, id: "custom:ghost" });
    assert.equal(r.status, 404);
    assert.equal((await api("/api/modules", "POST", MODULE)).status, 201);
    assert.equal((await api("/api/modules", "POST", MODULE)).status, 409);
    r = await api("/api/modules/custom:other", "PUT", MODULE);
    assert.equal(r.status, 400);

    // PUT update round-trips
    r = await api("/api/modules/custom:greeting", "PUT", { ...MODULE, title: "Greeting v2" });
    assert.equal(r.status, 200);
    const listed = await (await api("/api/modules", "GET")).json();
    assert.equal(listed.modules.find((m) => m.id === "custom:greeting").title, "Greeting v2");

    // project with unknown agent → 400
    r = await api("/api/projects", "POST", { ...PROJECT, agents: ["custom:ghost"], flow: [] });
    assert.equal(r.status, 400);
  });
});

// N106 — one module of every form-editable kind round-trips with harness target.
test("each editable module kind round-trips through the API", async () => {
  await withServer(async () => {
    const kinds = [
      {
        id: "custom:k-section",
        title: "S",
        kind: "section",
        heading: "H",
        body: "b",
        target: "claude",
      },
      { id: "custom:k-include", title: "I", kind: "include", ref: "AGENT_X.md", target: "cursor" },
      {
        id: "custom:k-mcp",
        title: "M",
        kind: "mcp-server",
        name: "srv",
        config: { command: "x" },
        target: "both",
      },
      { id: "custom:k-hook", title: "H", kind: "hook", event: "PostToolUse", command: "echo hi" },
      { id: "custom:k-skill", title: "K", kind: "skill", name: "my-skill", content: "# Skill" },
    ];
    for (const record of kinds) {
      const r = await api("/api/modules", "POST", record);
      assert.equal(r.status, 201, `${record.kind} create`);
    }
    const listed = await (await api("/api/modules", "GET")).json();
    for (const record of kinds) {
      const found = listed.modules.find((m) => m.id === record.id);
      assert.ok(found, `${record.id} listed`);
      assert.equal(found.source, "custom");
      if (record.target) assert.equal(found.target, record.target, `${record.id} target`);
    }
  });
});

// N107 — agent reorder round-trip: the saved module order is the UI order.
test("agent module order round-trips through PUT", async () => {
  await withServer(async () => {
    assert.equal((await api("/api/modules", "POST", MODULE)).status, 201);
    assert.equal((await api("/api/agents", "POST", AGENT)).status, 201);
    const reordered = { ...AGENT, modules: ["custom:greeting", "security"] };
    assert.equal((await api("/api/agents/custom:greeter", "PUT", reordered)).status, 200);
    const listed = await (await api("/api/agents", "GET")).json();
    const agent = listed.agents.find((a) => a.id === "custom:greeter");
    assert.deepEqual(
      agent.modules.map((m) => m.id),
      ["custom:greeting", "security"],
    );
    assert.equal(agent.source, "custom");
  });
});

// N108 — flows list + per-id project lookup.
test("projects list and ?id= lookup", async () => {
  await withServer(async () => {
    let list = await (await api("/api/projects", "GET")).json();
    assert.equal(list.projects.length, 1);
    assert.equal(list.projects[0].id, "default");
    assert.equal(list.projects[0].source, "builtin");

    const def = await (await api("/api/project", "GET")).json();
    const dup = {
      id: "custom:hotfix2",
      title: "Hotfix 2",
      agents: def.agents,
      flow: def.flow,
      install: def.install,
    };
    assert.equal((await api("/api/projects", "POST", dup)).status, 201);

    list = await (await api("/api/projects", "GET")).json();
    assert.equal(list.projects.length, 2);
    const custom = list.projects.find((p) => p.id === "custom:hotfix2");
    assert.equal(custom.source, "custom");
    assert.equal(custom.flowCount, def.flow.length);

    const fetched = await (await api("/api/project?id=custom%3Ahotfix2", "GET")).json();
    assert.equal(fetched.title, "Hotfix 2");
    assert.equal(fetched.source, "custom");
    assert.deepEqual(fetched.flow, def.flow);
    assert.ok(fetched.agentTitles["task-implement"]);

    assert.equal((await api("/api/project?id=custom%3Aghost", "GET")).status, 404);
    assert.equal((await api("/api/projects/default", "DELETE")).status, 403);

    // default project lookup unchanged for N96/N104 consumers
    const defAgain = await (await api("/api/project", "GET")).json();
    assert.equal(defAgain.id, "default");
  });
});

// N109 — layout field round-trips; bad coordinates rejected.
test("project layout persists through PUT and bad coords fail validation", async () => {
  await withServer(async () => {
    const def = await (await api("/api/project", "GET")).json();
    const flow = {
      id: "custom:laidout",
      title: "Laid out",
      agents: def.agents,
      flow: def.flow,
      install: [],
    };
    assert.equal((await api("/api/projects", "POST", flow)).status, 201);

    const layout = { "task-implement": { x: 40, y: 80 }, "task-git": { x: 320, y: 80 } };
    const r = await api("/api/projects/custom:laidout", "PUT", { ...flow, layout });
    assert.equal(r.status, 200);
    const fetched = await (await api("/api/project?id=custom%3Alaidout", "GET")).json();
    assert.deepEqual(fetched.layout, layout);

    const bad = await api("/api/projects/custom:laidout", "PUT", {
      ...flow,
      layout: { "task-implement": { x: "left", y: 0 } },
    });
    assert.equal(bad.status, 400);
    assert.ok((await bad.json()).issues.some((i) => i.path.includes("layout")));
  });
});

// N111 — load → edit → save → reload fidelity + the stale-revision guard.
test("flow edit round-trips deep-equal and stale revisions are rejected", async () => {
  await withServer(async () => {
    const def = await (await api("/api/project", "GET")).json();
    const flow = {
      id: "custom:rt",
      title: "Round trip",
      agents: def.agents,
      flow: def.flow,
      install: [],
    };
    assert.equal((await api("/api/projects", "POST", flow)).status, 201);

    // load (capture revision) → edit (move a node + add an edge) → save
    const loaded = await (await api("/api/project?id=custom%3Art", "GET")).json();
    assert.ok(loaded.revision, "custom flows carry a revision token");
    const edited = {
      ...flow,
      flow: [...flow.flow, { from: "task-git", to: "task-incident", on: "merged" }],
      layout: { "task-implement": { x: 11, y: 22 } },
    };
    const put = await fetch(`http://127.0.0.1:${PORT}/api/projects/custom:rt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-revision": loaded.revision },
      body: JSON.stringify(edited),
    });
    assert.equal(put.status, 200);

    // reload: deep-equal what was saved
    const reloaded = await (await api("/api/project?id=custom%3Art", "GET")).json();
    assert.deepEqual(reloaded.flow, edited.flow);
    assert.deepEqual(reloaded.layout, edited.layout);
    assert.notEqual(reloaded.revision, loaded.revision, "revision rotates on save");

    // a second writer using the OLD revision gets 409
    const stale = await fetch(`http://127.0.0.1:${PORT}/api/projects/custom:rt`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "x-revision": loaded.revision },
      body: JSON.stringify(flow),
    });
    assert.equal(stale.status, 409);
    assert.match((await stale.json()).error, /stale revision/);

    // a bad trigger still 400s with a flow path for the inline panel
    const bad = await api("/api/projects/custom:rt", "PUT", {
      ...edited,
      flow: [{ from: "task-implement", to: "task-git", on: "approvedd" }],
    });
    assert.equal(bad.status, 400);
    assert.ok((await bad.json()).issues.some((i) => i.path.startsWith("flow.")));
  });
});

// N112 — states round-trip via the API; undefined custom trigger 400s.
test("custom states round-trip and gate edge triggers", async () => {
  await withServer(async () => {
    const flow = {
      id: "custom:staged",
      title: "Staged",
      agents: ["task-review", "task-human-review"],
      states: [{ id: "qa-verify", title: "QA Verify", color: "#a78bfa", mapsTo: "approved" }],
      flow: [{ from: "task-review", to: "task-human-review", on: "qa-verify" }],
      install: [],
    };
    assert.equal((await api("/api/projects", "POST", flow)).status, 201);
    const fetched = await (await api("/api/project?id=custom%3Astaged", "GET")).json();
    assert.deepEqual(fetched.states, flow.states);
    assert.equal(fetched.flow[0].on, "qa-verify");

    // removing the state while an edge still uses it → 400 with the flow path
    const bad = await api("/api/projects/custom:staged", "PUT", { ...flow, states: [] });
    assert.equal(bad.status, 400);
    const body = await bad.json();
    assert.ok(
      body.issues.some((i) => i.path.startsWith("flow.") && /unknown trigger/.test(i.message)),
    );
  });
});

// Review-fix — the slug-collision silent-overwrite is closed: distinct custom
// ids that would slug onto the same file are now rejected, never written.
test("non-slug custom ids are rejected (no filename collision / silent overwrite)", async () => {
  await withServer(async (dir) => {
    // First create with a clean id succeeds.
    assert.equal(
      (await api("/api/modules", "POST", { ...MODULE, id: "custom:greeting" })).status,
      201,
    );
    // The mixed-case sibling that used to slug onto greeting.json is now a 400.
    const clash = await api("/api/modules", "POST", {
      ...MODULE,
      id: "custom:Greeting",
      title: "X",
    });
    assert.equal(clash.status, 400);
    assert.ok((await clash.json()).issues.some((i) => i.path === "id"));
    // Spaces and slashes are likewise rejected before touching disk.
    assert.equal((await api("/api/modules", "POST", { ...MODULE, id: "custom:a b" })).status, 400);
    assert.equal((await api("/api/modules", "POST", { ...MODULE, id: "custom:a/b" })).status, 400);
    // The original record is untouched (its file still holds "Greeting section").
    const listed = await (await api("/api/modules", "GET")).json();
    assert.equal(listed.modules.find((m) => m.id === "custom:greeting").title, "Greeting section");
    assert.ok(existsSync(join(dir, "insightFlow/modules/greeting.json")));
  });
});

// N113 — a new flow created with a hand-picked agent subset stores exactly
// those agents with empty edges + install (no inheritance from the default).
test("custom flow persists a hand-picked agent subset with empty flow/install", async () => {
  await withServer(async () => {
    const picked = { id: "custom:lean", title: "Lean", agents: ["task-implement", "task-git"] };
    assert.equal((await api("/api/projects", "POST", picked)).status, 201);
    const got = await (await api("/api/project?id=custom%3Alean", "GET")).json();
    assert.deepEqual(got.agents, ["task-implement", "task-git"]);
    assert.deepEqual(got.flow, []);
    assert.deepEqual(got.install, []);
  });
});
