// One-off N90 migration tool, committed for the audit trail: decomposes the
// 9 role MD files into composer modules (byte-exact by construction — every
// file is round-tripped against the v3 renderer rules before any JSON is
// written).
//
// ⚠️  Since N90 the JSON under src/agents/ is CANONICAL and the *_ROLE.md
// files are generated FROM it (`prompt-build --compose --apply`). Running
// this script overwrites the canonical JSON from the MD files — only ever
// useful again for a deliberate fresh re-import, never for routine edits.
// It therefore refuses to run without --force.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

if (!process.argv.includes("--force")) {
  console.error(
    "Refusing to run: JSON under src/agents/ is canonical since N90; this one-off\n" +
      "migration tool would overwrite it from the *_ROLE.md files. Re-run with\n" +
      "--force only for a deliberate fresh re-import.",
  );
  process.exit(1);
}

const repoRoot = process.cwd();
const agentsDir = join(repoRoot, "packages/taskflow/src/agents");

const ROLES = {
  "task-analyze": "TASK_ANALYZER_ROLE.md",
  taskmaster: "TASKMASTER_ROLE.md",
  "taskmaster-change": "TASKMASTER_CHANGE_ROLE.md",
  "task-implement": "TASK_IMPLEMENTER_ROLE.md",
  "task-review": "TASK_REVIEWER_ROLE.md",
  "task-review-fix": "TASK_REVIEW_FIXER_ROLE.md",
  "task-human-review": "TASK_HUMAN_REVIEW_ROLE.md",
  "task-incident": "TASK_INCIDENT_ROLE.md",
  "task-request-changes": "TASK_REQUEST_CHANGES_ROLE.md",
};

const TITLES = {
  "task-analyze": "Pre-Taskmaster Strategist",
  taskmaster: "Taskmaster",
  "taskmaster-change": "Taskmaster Change Agent",
  "task-implement": "Task Implementer",
  "task-review": "Task Reviewer",
  "task-review-fix": "Task Review Fixer",
  "task-human-review": "Human Review Recorder",
  "task-incident": "Incident Agent",
  "task-request-changes": "Request Changes Agent",
};

const SHARED_INCLUDES = {
  "AGENT_ENFORCEMENT.md": "enforcement",
  "AGENT_PROTOCOL.md": "protocol",
  "AGENT_EVENTS.md": "events",
  "AGENT_NOTIFY.md": "notify",
  "AGENT_CONFIG.md": "config",
  "AGENT_SECURITY.md": "security",
};

const headingRe = /^[A-Z][A-Z &/-]+$/;
const includeRe = /^@([A-Za-z0-9_.-]+\.md)$/;

const slug = (h) => h.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// ---- parse one file into blocks --------------------------------------------
function parse(content) {
  const lines = content.split("\n");
  if (lines[lines.length - 1] === "") lines.pop(); // trailing newline
  const blocks = [];
  let cur = { type: "section", heading: null, lines: [] };
  let inFence = false;
  const flush = () => {
    if (cur.heading !== null || cur.lines.length) blocks.push(cur);
    cur = { type: "section", heading: null, lines: [] };
  };
  for (const line of lines) {
    if (line.trimStart().startsWith("```")) inFence = !inFence;
    if (!inFence) {
      const inc = line.match(includeRe);
      if (inc) {
        flush();
        blocks.push({ type: "include", ref: inc[1] });
        continue;
      }
      if (headingRe.test(line) && line.length > 2) {
        flush();
        cur = { type: "section", heading: line, lines: [] };
        continue;
      }
    }
    cur.lines.push(line);
  }
  flush();

  // normalize: body = lines minus the single structural blank after a heading
  // and the single structural blank before the next block; extras stay encoded.
  for (const b of blocks) {
    if (b.type !== "section") continue;
    let ls = b.lines;
    if (b.heading !== null && ls[0] === "") ls = ls.slice(1); // blank after heading
    let trailing = 0;
    while (ls.length && ls[ls.length - 1] === "") { ls.pop(); trailing++; }
    // one trailing blank is the standard separator; extras append to body
    const extras = Math.max(0, trailing - 1);
    b.body = ls.join("\n") + "\n".repeat(extras);
    // a block followed by an include still has 1 standard blank — handled in render
    delete b.lines;
  }
  return blocks.filter((b) => b.type === "include" || b.heading !== null || b.body.length);
}

// ---- v3 renderer (must match compose.ts) ------------------------------------
function render(blocks) {
  let out = "";
  blocks.forEach((b, i) => {
    if (i > 0) {
      const prev = blocks[i - 1];
      if (prev.type === "include" && b.type === "include") out += "\n";
      else if (prev.type === "section" && b.type === "section" && b.heading === null) out += "\n";
      else out += "\n\n";
    }
    if (b.type === "include") out += `@${b.ref}`;
    else if (b.heading !== null && b.body.length) out += b.heading + "\n\n" + b.body;
    else if (b.heading !== null) out += b.heading;
    else out += b.body;
  });
  return out.replace(/\n+$/, "") + "\n";
}

// ---- main -------------------------------------------------------------------
let failed = false;
const sharedRefsUsed = new Set();

for (const [agent, file] of Object.entries(ROLES)) {
  const content = readFileSync(join(repoRoot, file), "utf-8");
  const blocks = parse(content);
  const roundtrip = render(blocks);
  if (roundtrip !== content) {
    failed = true;
    console.error(`ROUNDTRIP MISMATCH: ${file}`);
    const a = content.split("\n"), b = roundtrip.split("\n");
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] !== b[i]) { console.error(`  line ${i + 1}: orig=${JSON.stringify(a[i])} got=${JSON.stringify(b[i])}`); break; }
    }
    continue;
  }

  const modules = [];
  const order = [];
  let identityUsed = false;
  const slugCounts = {};
  for (const b of blocks) {
    if (b.type === "include") {
      const shared = SHARED_INCLUDES[b.ref];
      if (!shared) { failed = true; console.error(`Unmapped include ${b.ref} in ${file}`); continue; }
      sharedRefsUsed.add(shared);
      order.push(shared);
      continue;
    }
    let s = b.heading === null ? (identityUsed ? "body" : ((identityUsed = true), "identity")) : slug(b.heading);
    slugCounts[s] = (slugCounts[s] || 0) + 1;
    if (slugCounts[s] > 1) s = `${s}-${slugCounts[s]}`;
    const id = `${agent}/${s}`;
    const mod = {
      id,
      title: `${TITLES[agent]} — ${b.heading ?? s}`,
      source: "builtin",
      kind: "section",
    };
    if (b.heading !== null) mod.heading = b.heading;
    if (b.body.length) mod.body = b.body;
    modules.push(mod);
    order.push(id);
  }

  mkdirSync(join(agentsDir, "modules/roles"), { recursive: true });
  writeFileSync(join(agentsDir, `modules/roles/${agent}.json`), JSON.stringify(modules, null, 2) + "\n");
  writeFileSync(
    join(agentsDir, `composed/${agent}.json`),
    JSON.stringify({ id: agent, title: TITLES[agent], modules: order }, null, 2) + "\n",
  );
  console.log(`OK ${agent}: ${modules.length} role modules, ${order.length} ordered entries`);
}

console.log("shared includes used:", [...sharedRefsUsed].sort().join(", "));
process.exit(failed ? 1 : 0);
