/**
 * N102 — user-space registries: insightFlow/{modules,agents,projects}/*.json
 * loaded with the built-ins' schemas, merged without shadowing, every failure
 * mode loud and file-attributed.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadUserRegistries,
  mergedModuleRegistry,
  mergedComposedAgents,
  mergedProjects,
  composeAgent,
  MODULE_REGISTRY,
  COMPOSED_AGENTS,
} from "../dist/index.js";

function project(defs = {}) {
  const dir = mkdtempSync(join(tmpdir(), "n102-user-registry-"));
  writeFileSync(join(dir, "taskflow.config.json"), JSON.stringify({ workDir: "workTasks" }));
  for (const [kind, entries] of Object.entries(defs)) {
    mkdirSync(join(dir, "insightFlow", kind), { recursive: true });
    for (const [name, content] of Object.entries(entries)) {
      writeFileSync(
        join(dir, "insightFlow", kind, name),
        typeof content === "string" ? content : JSON.stringify(content, null, 2),
      );
    }
  }
  return dir;
}

const GREETING = {
  id: "custom:greeting",
  title: "Greeting section",
  kind: "section",
  heading: "GREETING",
  body: "- Say hello before starting.",
};

const AGENT = {
  id: "custom:greeter",
  title: "Greeter",
  description: "Custom smoke agent",
  modules: ["security", "custom:greeting"],
};

const FLOW_PROJECT = {
  id: "custom:hotfix",
  title: "Hotfix flow",
  agents: ["task-implement", "task-git"],
  flow: [{ from: "task-implement", to: "task-git", on: "implemented" }],
  install: [],
};

test("happy path: custom module + agent + project load, merge, and compose", () => {
  const dir = project({
    modules: { "greeting.json": GREETING },
    agents: { "greeter.json": AGENT },
    projects: { "hotfix.json": FLOW_PROJECT },
  });
  const user = loadUserRegistries(dir);
  assert.equal(user.modules["custom:greeting"].source, "custom");
  assert.equal(user.agents["custom:greeter"].title, "Greeter");
  assert.equal(user.projects["custom:hotfix"].flow.length, 1);

  const modules = mergedModuleRegistry(dir);
  assert.ok(modules["security"], "built-ins present");
  assert.ok(modules["custom:greeting"], "custom present");
  assert.equal(
    Object.keys(MODULE_REGISTRY).includes("custom:greeting"),
    false,
    "built-in registry untouched",
  );

  const agents = mergedComposedAgents(dir);
  const md = composeAgent(agents["custom:greeter"], modules);
  assert.match(md, /GREETING/);
  assert.match(md, /@AGENT_SECURITY\.md/);

  const projects = mergedProjects(dir);
  assert.ok(projects["default"], "shipped default present");
  assert.ok(projects["custom:hotfix"]);
});

test("missing dirs are fine: empty registries, built-ins unchanged", () => {
  const dir = project();
  const user = loadUserRegistries(dir);
  assert.deepEqual(user, { modules: {}, agents: {}, projects: {} });
  assert.deepEqual(Object.keys(mergedComposedAgents(dir)), Object.keys(COMPOSED_AGENTS));
});

test("id without custom: prefix is rejected with the file path", () => {
  const dir = project({ modules: { "bad.json": { ...GREETING, id: "greeting" } } });
  assert.throws(
    () => loadUserRegistries(dir),
    (err) => /bad\.json/.test(err.message) && /must start with 'custom:'/.test(err.message),
  );
});

test("dangling module ref in a custom agent is rejected with file + id", () => {
  const dir = project({
    agents: { "greeter.json": { ...AGENT, modules: ["custom:nope"] } },
  });
  assert.throws(
    () => loadUserRegistries(dir),
    (err) => /greeter\.json/.test(err.message) && /custom:nope/.test(err.message),
  );
});

test("malformed JSON reports the filename", () => {
  const dir = project({ modules: { "broken.json": "{ not json" } });
  assert.throws(() => loadUserRegistries(dir), /broken\.json/);
});

test("duplicate custom ids across files are rejected", () => {
  const dir = project({
    modules: { "a.json": GREETING, "b.json": { ...GREETING, title: "Other" } },
  });
  assert.throws(() => loadUserRegistries(dir), /duplicate id 'custom:greeting'/);
});

test("schema violations are rejected with field detail", () => {
  const dir = project({
    modules: { "bad.json": { id: "custom:x", title: "X", kind: "section" } },
  });
  assert.throws(() => loadUserRegistries(dir), /bad\.json/);
});

test("custom project referencing unknown agent or undeclared flow endpoint fails", () => {
  const dir = project({
    projects: { "p.json": { ...FLOW_PROJECT, agents: ["task-implement", "custom:ghost"] } },
  });
  assert.throws(() => loadUserRegistries(dir), /unknown agent 'custom:ghost'/);

  const dir2 = project({
    projects: {
      "p.json": {
        ...FLOW_PROJECT,
        flow: [{ from: "task-implement", to: "task-review", on: "implemented" }],
      },
    },
  });
  assert.throws(() => loadUserRegistries(dir2), /undeclared agent 'task-review'/);
});

test("custom agent can reference custom modules through bundles in built-ins", () => {
  // agent referencing a built-in bundle id still resolves through the merge
  const dir = project({
    agents: { "x.json": { id: "custom:x", title: "X", modules: ["security"] } },
  });
  const agents = mergedComposedAgents(dir);
  assert.ok(agents["custom:x"]);
});

// N119 — eject/override: a file with a BUILT-IN id shadows the shipped def
// (except locked ids); custom unchanged; unknown non-custom id rejected.
test("eject/override shadows a shipped built-in; locked rejected; unknown rejected", () => {
  // override a non-locked built-in module (minimal-diff)
  const dir = project({
    modules: {
      "minimal-diff.json": {
        id: "minimal-diff",
        title: "Minimal-diff (ejected)",
        kind: "section",
        body: "EJECTED BODY",
      },
    },
  });
  const merged = mergedModuleRegistry(dir);
  assert.equal(merged["minimal-diff"].body, "EJECTED BODY", "override shadows the shipped def");
  assert.equal(merged["minimal-diff"].source, "builtin", "an ejected default stays 'builtin'");

  // locked baseline id cannot be overridden
  const locked = project({
    modules: { "security.json": { id: "security", title: "x", kind: "include", ref: "X.md" } },
  });
  assert.throws(() => loadUserRegistries(locked), /locked and cannot be overridden/);

  // a non-custom id that isn't a real built-in is rejected
  const unknown = project({
    modules: { "ghost.json": { id: "ghost", title: "x", kind: "section", body: "y" } },
  });
  assert.throws(
    () => loadUserRegistries(unknown),
    /must start with 'custom:' or match a shipped built-in/,
  );

  // custom ids still work additively
  const custom = project({
    modules: { "c.json": { id: "custom:c", title: "C", kind: "section", body: "z" } },
  });
  assert.equal(mergedModuleRegistry(custom)["custom:c"].source, "custom");
});

test("eject/override applies to agents and the default project flow", () => {
  // override the default project flow (id "default")
  const dir = project({
    projects: {
      "default.json": {
        id: "default",
        title: "Default (ejected)",
        agents: ["task-implement", "task-git"],
        flow: [],
        install: [],
      },
    },
  });
  const projects = mergedProjects(dir);
  assert.equal(
    projects["default"].title,
    "Default (ejected)",
    "default flow override shadows shipped",
  );
});
