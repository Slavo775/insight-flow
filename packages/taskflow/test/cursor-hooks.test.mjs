/**
 * N77 — Cursor hooks → dashboard via binary payload parsing.
 *   - hook-parse: Cursor event-name → derived type; stdin normalization.
 *   - statusFromEvent understands Cursor's raw `stop`.
 *   - `insight-flow hook <cursorEvent> --provider cursor` reads piped stdin,
 *     maps the event, and tags `provider: cursor`.
 *   - `insight-flow init --editor cursor` generates `.cursor/hooks.json` + scripts.
 * Run: node test/cursor-hooks.test.mjs   (build must run first)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const CLI = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const { cursorEventToDerived, parseCursorStdin, statusFromEvent } = await import(
  fileURLToPath(new URL("../dist/index.js", import.meta.url))
);

test("cursorEventToDerived maps Cursor events to derived types", () => {
  assert.equal(cursorEventToDerived("stop"), "agent-idle");
  assert.equal(cursorEventToDerived("preToolUse"), "tool-requested");
  assert.equal(cursorEventToDerived("postToolUse"), "tool-approved");
  assert.equal(cursorEventToDerived("sessionStart"), "session-start");
  assert.equal(cursorEventToDerived("totallyUnknown"), "notification");
});

test("parseCursorStdin extracts conversation_id + tool fields, fails soft", () => {
  const parsed = parseCursorStdin(
    JSON.stringify({ conversation_id: "sess-1", command: "git push", tool_name: "Shell" }),
  );
  assert.equal(parsed.sessionId, "sess-1");
  assert.equal(parsed.data.command, "git push");
  assert.equal(parsed.data.tool_name, "Shell");

  assert.deepEqual(parseCursorStdin("not json"), { data: {} });
});

test("statusFromEvent maps Cursor raw `stop` → done", () => {
  assert.equal(statusFromEvent({ id: "1", timestamp: "t", type: "stop" }), "done");
  assert.equal(statusFromEvent({ id: "1", timestamp: "t", type: "preToolUse" }), "active");
});

test("`insight-flow hook <cursorEvent> --provider cursor` parses stdin + tags provider", () => {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-cursor-hook-test-"));
  try {
    writeFileSync(
      resolve(dir, "taskflow.config.json"),
      JSON.stringify({
        workDir: "workTasks", shardSize: 10, projectName: "t", rolesDir: ".claude/roles",
        server: { port: 6099 }, activityEngine: { enabled: true, logFile: ".taskflow-activity.jsonl", maxEvents: 200 },
      }),
    );
    mkdirSync(resolve(dir, "workTasks"), { recursive: true });
    writeFileSync(
      resolve(dir, "workTasks", "master.json"),
      JSON.stringify({ meta: { nextId: 1, currentTaskId: null, nextIncidentId: 1, shards: [] } }),
    );
    const folder = resolve(dir, "workTasks", "N06-test");
    mkdirSync(folder, { recursive: true });

    execFileSync(process.execPath, [CLI, "hook", "stop", "--task", "N06", "--provider", "cursor"], {
      cwd: dir,
      timeout: 1500,
      input: JSON.stringify({ conversation_id: "sess-xyz", hook_event_name: "stop" }),
    });

    const stored = JSON.parse(readFileSync(resolve(folder, "events.json"), "utf-8"));
    assert.equal(stored.events[0].type, "agent-idle", "stop derives agent-idle");
    assert.equal(stored.events[0].provider, "cursor", "tagged provider cursor");
    assert.equal(stored.events[0].sessionId, "sess-xyz", "conversation_id → sessionId");
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("init --editor cursor generates .cursor/hooks.json + hook scripts", () => {
  const dir = mkdtempSync(join(tmpdir(), "taskflow-cursor-hooks-init-"));
  try {
    execFileSync(process.execPath, [CLI, "init", "--editor", "cursor"], { cwd: dir, encoding: "utf-8" });

    const hooksJsonPath = resolve(dir, ".cursor/hooks.json");
    assert.ok(existsSync(hooksJsonPath), ".cursor/hooks.json should exist");
    const hooks = JSON.parse(readFileSync(hooksJsonPath, "utf-8"));
    assert.equal(hooks.version, 1, "Cursor hooks schema version 1");
    assert.ok(hooks.hooks.stop, "has a stop hook");
    assert.ok(hooks.hooks.beforeShellExecution, "has the approval gate hook");
    // Tool events are gated to active sessions (--if-active); milestones are not.
    assert.match(hooks.hooks.preToolUse[0].command, /--if-active/, "tool events gated");
    assert.ok(!/--if-active/.test(hooks.hooks.stop[0].command), "milestone stop not gated");

    for (const s of ["insight-flow-event.sh", "insight-flow-stop.sh", "insight-flow-approval.sh"]) {
      assert.ok(existsSync(resolve(dir, ".cursor/hooks", s)), `${s} should exist`);
    }
    // approval gate forces a prompt on sensitive commands
    const approval = readFileSync(resolve(dir, ".cursor/hooks/insight-flow-approval.sh"), "utf-8");
    assert.match(approval, /"permission":"ask"/);
    assert.match(approval, /--provider cursor/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});
