// N103 — CRUD for user-space custom definitions (modules / agents / projects).
// Writes land only under insightFlow/{modules,agents,projects}; built-ins are
// untouchable (403). Every write is Zod-validated and referentially checked
// against the prospective merged registries *before* touching disk (400 with
// field issues); deletes refuse while the target is referenced (409 listing
// the referencing ids). Files are written atomically (tmp + rename).
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { ZodError } from "zod";
import { AgentModuleSchema, ComposedAgentSchema, ProjectSchema } from "../../core/schema/index.js";
import {
  COMPOSED_AGENTS,
  MODULE_REGISTRY,
  resolveModules,
  type AgentModule,
  type ComposedAgent,
} from "../../agents/compose.js";
import { DEFAULT_PROJECT, type Project } from "../../agents/project.js";
import { clearFlowReferences } from "../../core/config.js";
import {
  CUSTOM_ID_PREFIX,
  isLockedModuleId,
  isModuleEditLocked,
  loadUserRegistries,
  userSpaceRoot,
  type UserRegistries,
} from "../../agents/user-registry.js";

const JSON_MIME = "application/json; charset=utf-8";

type Kind = "modules" | "agents" | "projects";
const KINDS: readonly Kind[] = ["modules", "agents", "projects"];

const SCHEMAS = {
  modules: AgentModuleSchema,
  agents: ComposedAgentSchema,
  projects: ProjectSchema,
} as const;

function send(res: ServerResponse, status: number, payload: unknown): void {
  res.writeHead(status, { "Content-Type": JSON_MIME });
  res.end(JSON.stringify(payload));
}

function fileFor(root: string, kind: Kind, id: string): string {
  // N120 — built-in override ids have no "custom:" prefix to strip; slug the
  // tail so both custom defs and ejected built-ins map to a stable filename.
  const tail = id.startsWith(CUSTOM_ID_PREFIX) ? id.slice(CUSTOM_ID_PREFIX.length) : id;
  const slug = tail.toLowerCase().replace(/[^a-z0-9-_]+/g, "-");
  return resolve(root, kind, `${slug}.json`);
}

/**
 * N111 — optimistic-concurrency token for a stored definition: the hash of
 * the file bytes. GET responses carry it; PUTs may send it back via the
 * `x-revision` header — a mismatch means someone else saved in between (409).
 */
export function definitionRevision(
  kind: Kind,
  id: string,
  root: string = userSpaceRoot(),
): string | null {
  const path = fileFor(root, kind, id);
  if (!existsSync(path)) return null;
  return createHash("sha1").update(readFileSync(path)).digest("hex").slice(0, 16);
}

function builtinIds(kind: Kind): Set<string> {
  if (kind === "modules") return new Set(Object.keys(MODULE_REGISTRY));
  if (kind === "agents") return new Set(Object.keys(COMPOSED_AGENTS));
  return new Set([DEFAULT_PROJECT.id]);
}

/** Referential checks against the prospective registries (current + change). */
export function validateReferences(
  kind: Kind,
  record: AgentModule | ComposedAgent | Project,
  user: UserRegistries,
): string | null {
  const modules: Record<string, AgentModule> = { ...MODULE_REGISTRY, ...user.modules };
  const agents: Record<string, ComposedAgent> = { ...COMPOSED_AGENTS, ...user.agents };

  if (kind === "modules") {
    modules[record.id] = record as AgentModule;
    if ((record as AgentModule).kind === "bundle") {
      try {
        resolveModules({ id: "@probe", title: "probe", modules: [record.id] }, modules);
      } catch (err) {
        return (err as Error).message;
      }
    }
    return null;
  }

  if (kind === "agents") {
    try {
      resolveModules(record as ComposedAgent, modules);
    } catch (err) {
      return (err as Error).message;
    }
    return null;
  }

  const project = record as Project;
  for (const id of project.agents) {
    if (!agents[id]) return `references unknown agent '${id}'`;
  }
  // N166 — an edge's source is always an agent; its target may be an agent OR a
  // terminal status (a "done" node — a declared status flagged `terminal`).
  const terminalIds = new Set((project.statuses ?? []).filter((s) => s.terminal).map((s) => s.id));
  for (const edge of project.flow) {
    if (!project.agents.includes(edge.from)) {
      return `flow edge ${edge.from} → ${edge.to} references undeclared agent '${edge.from}'`;
    }
    if (!project.agents.includes(edge.to) && !terminalIds.has(edge.to)) {
      return `flow edge ${edge.from} → ${edge.to} references undeclared agent or terminal '${edge.to}'`;
    }
  }
  for (const id of project.install) {
    if (!modules[id]) return `install references unknown module '${id}'`;
  }
  return null;
}

/** Ids of user-space records that reference the target (delete guard). */
function referencingIds(kind: Kind, id: string, user: UserRegistries): string[] {
  const refs: string[] = [];
  if (kind === "modules") {
    for (const agent of Object.values(user.agents)) {
      if (agent.modules.includes(id)) refs.push(agent.id);
    }
    for (const mod of Object.values(user.modules)) {
      if (mod.kind === "bundle" && mod.modules.includes(id)) refs.push(mod.id);
    }
    for (const project of Object.values(user.projects)) {
      if (project.install.includes(id)) refs.push(project.id);
    }
  } else if (kind === "agents") {
    for (const project of Object.values(user.projects)) {
      if (project.agents.includes(id)) refs.push(project.id);
    }
  }
  return refs;
}

function readBody(
  req: IncomingMessage,
  res: ServerResponse,
  onJson: (parsed: unknown) => void,
): void {
  let body = "";
  let aborted = false;
  req.on("data", (chunk: Buffer) => {
    if (aborted) return;
    body += chunk.toString("utf-8");
    if (body.length > 256 * 1024) {
      aborted = true;
      send(res, 413, { ok: false, error: "payload too large" });
      req.destroy();
    }
  });
  req.on("end", () => {
    if (aborted) return;
    try {
      onJson(JSON.parse(body));
    } catch {
      send(res, 400, { ok: false, error: "invalid JSON" });
    }
  });
}

/**
 * Persist a record. `exclusive` (used for POST create) fails with EEXIST when
 * the file already exists, closing the concurrent-create race where two POSTs
 * of the same new id both pass the in-memory duplicate check. PUT (overwrite)
 * uses a unique temp file + rename so a crash never leaves a half-written
 * record in place.
 */
function atomicWrite(path: string, record: unknown, exclusive = false): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const body = JSON.stringify(record, null, 2) + "\n";
  if (exclusive) {
    writeFileSync(path, body, { flag: "wx" }); // O_CREAT|O_EXCL — throws EEXIST
    return;
  }
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeFileSync(tmp, body);
  renameSync(tmp, path);
}

/**
 * N188 — transport-agnostic result of a write/delete. The HTTP handler maps it
 * to a response; the composer MCP server maps it to a tool result. The domain
 * logic (validation, locking tiers, eject/override, revision, reference safety,
 * atomic write) lives here ONCE — both transports call the same functions.
 */
export interface DefResult {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Delete a custom definition or revert a built-in override. Locked ids refuse
 * (403); a custom delete refuses while still referenced (409). Performs the
 * unlink + flow-reference cleanup; the caller is responsible for any
 * change-notification side effect.
 */
export function removeDefinition(
  kind: Kind,
  id: string,
  user: UserRegistries,
  root: string = userSpaceRoot(),
): DefResult {
  const existing = user[kind] as Record<string, { id: string }>;
  // N119/N120 — locked ids are read-only (never deletable/revertable).
  if (kind === "modules" && isLockedModuleId(id)) {
    return { status: 403, body: { ok: false, error: `'${id}' is locked (read-only)` } };
  }
  const isCustom = id.startsWith(CUSTOM_ID_PREFIX);
  if (!existing[id]) {
    // No user-space file. Custom → genuinely unknown (404). Built-in → there's
    // no override to revert and you can't delete a shipped definition (403).
    return {
      status: isCustom ? 404 : 403,
      body: isCustom
        ? { ok: false, error: `unknown ${kind.slice(0, -1)} '${id}'` }
        : { ok: false, error: `'${id}' is a shipped definition — nothing to revert` },
    };
  }
  // Reverting an override doesn't remove the id (it falls back to the shipped
  // def), so only a CUSTOM delete can break referencing definitions.
  if (isCustom) {
    const refs = referencingIds(kind, id, user);
    if (refs.length > 0) {
      return { status: 409, body: { ok: false, error: "still referenced", referencedBy: refs } };
    }
  }
  try {
    unlinkSync(fileFor(root, kind, id));
  } catch (err) {
    return { status: 500, body: { ok: false, error: (err as Error).message } };
  }
  // N167 — a removed flow can't remain the binding default / a type mapping;
  // clear any config reference so new tasks don't bind to a deleted flow.
  if (kind === "projects" && isCustom) {
    try {
      clearFlowReferences(id);
    } catch {
      /* config write is best-effort */
    }
  }
  // Custom → deleted; built-in → reverted to the shipped definition.
  return { status: 200, body: isCustom ? { ok: true, deleted: id } : { ok: true, reverted: id } };
}

/**
 * Create (POST) or update/eject (PUT) a definition. `parsed` is the raw,
 * pre-validation record; it is Zod-validated and referentially checked against
 * the prospective merged registries before any disk write. `revision` (when a
 * non-empty string on PUT) is the N111 optimistic-concurrency token. Performs
 * the atomic write; the caller handles change-notification.
 */
export function writeDefinition(
  kind: Kind,
  parsed: unknown,
  user: UserRegistries,
  opts: { method: "POST" | "PUT"; revision?: string | null; pathId?: string | null; root?: string },
): DefResult {
  const { method, revision, pathId } = opts;
  const root = opts.root ?? userSpaceRoot();
  const existing = user[kind] as Record<string, { id: string }>;

  const result = SCHEMAS[kind].safeParse(parsed);
  if (!result.success) {
    const err = result.error as ZodError;
    return {
      status: 400,
      body: {
        ok: false,
        error: "validation failed",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  }
  const record = result.data;

  if (pathId && pathId !== record.id) {
    return {
      status: 400,
      body: { ok: false, error: `body id '${record.id}' does not match URL id '${pathId}'` },
    };
  }
  // N120 — three editability tiers by id shape:
  //   custom:*           → full CRUD (create POST, update PUT)
  //   built-in id        → eject/override: PUT writes the override (no POST)
  //   locked             → read-only (403)
  const isCustom = record.id.startsWith(CUSTOM_ID_PREFIX);
  const isBuiltin = builtinIds(kind).has(record.id);
  // N188 — locked by id AND by kind: overriding a built-in status-transition /
  // handover module is refused (the loader rejects such an override, so accepting
  // the write here would brick user-space loading). Custom defs of those kinds
  // stay editable. `isLockedModuleId` alone (id-only) missed the by-kind case.
  if (kind === "modules" && isModuleEditLocked(record as { id: string; kind?: string }, isCustom)) {
    return { status: 403, body: { ok: false, error: `'${record.id}' is locked (read-only)` } };
  }
  if (!isCustom && !isBuiltin) {
    return {
      status: 400,
      body: {
        ok: false,
        error: `id '${record.id}' must start with 'custom:' or match a shipped built-in to override`,
      },
    };
  }
  if (isBuiltin && method === "POST") {
    return {
      status: 400,
      body: { ok: false, error: `'${record.id}' is a default — use PUT to edit (eject)` },
    };
  }
  if (isCustom && method === "POST" && existing[record.id]) {
    return {
      status: 409,
      body: { ok: false, error: `'${record.id}' already exists — use PUT to update` },
    };
  }
  if (isCustom && method === "PUT" && !existing[record.id]) {
    return {
      status: 404,
      body: {
        ok: false,
        error: `unknown ${kind.slice(0, -1)} '${record.id}' — use POST to create`,
      },
    };
  }
  // built-in PUT (eject/override) is always allowed — create-or-update the override.
  // N111 — optimistic-concurrency floor: a PUT carrying the revision it loaded
  // gets rejected when the stored file has changed since.
  if (method === "PUT" && typeof revision === "string" && revision.length > 0) {
    const current = definitionRevision(kind, record.id, root);
    if (current && current !== revision) {
      return {
        status: 409,
        body: { ok: false, error: "stale revision — reload the flow and retry" },
      };
    }
  }

  if (kind === "modules") {
    // An eject/override of a built-in keeps "builtin"; a custom def is "custom".
    (record as { source: string }).source = isCustom ? "custom" : "builtin";
  }
  // Validate against prospective registries that include the new record
  // (replacing its previous version on PUT).
  const prospective: UserRegistries = {
    modules: { ...user.modules },
    agents: { ...user.agents },
    projects: { ...user.projects },
  };
  (prospective[kind] as Record<string, unknown>)[record.id] = record;
  const refError = validateReferences(
    kind,
    record as AgentModule | ComposedAgent | Project,
    prospective,
  );
  if (refError) {
    return { status: 400, body: { ok: false, error: refError } };
  }
  // PUT must not break records that reference the previous version's shape;
  // re-validate dependents of an updated module/agent against the change.
  if (method === "PUT") {
    for (const agent of Object.values(prospective.agents)) {
      const err = validateReferences("agents", agent, prospective);
      if (err) {
        return { status: 400, body: { ok: false, error: `update breaks '${agent.id}': ${err}` } };
      }
    }
    for (const project of Object.values(prospective.projects)) {
      const err = validateReferences("projects", project, prospective);
      if (err) {
        return { status: 400, body: { ok: false, error: `update breaks '${project.id}': ${err}` } };
      }
    }
  }

  try {
    atomicWrite(fileFor(root, kind, record.id), record, method === "POST");
  } catch (err) {
    // A concurrent create won the exclusive-write race.
    if ((err as NodeJS.ErrnoException).code === "EEXIST") {
      return {
        status: 409,
        body: { ok: false, error: `'${record.id}' already exists — use PUT to update` },
      };
    }
    return { status: 500, body: { ok: false, error: (err as Error).message } };
  }
  return { status: method === "POST" ? 201 : 200, body: { ok: true, id: record.id } };
}

/** Resolve `module|agent|flow` (MCP/CLI vocabulary) to the storage Kind. */
export function kindFromTarget(target: "module" | "agent" | "flow"): Kind {
  return target === "module" ? "modules" : target === "agent" ? "agents" : "projects";
}

/**
 * Router hook: handles POST/PUT/DELETE on /api/{modules,agents,projects}[/:id].
 * Returns true when the request was handled (caller stops routing).
 */
export function handleCustomDefsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  onChanged?: () => void,
): boolean {
  const match = url.pathname.match(/^\/api\/(modules|agents|projects)(?:\/(.+))?$/);
  if (!match) return false;
  const method = req.method ?? "GET";
  if (method === "GET") return false; // read endpoints stay in index.ts
  const kind = match[1] as Kind;
  if (!KINDS.includes(kind)) return false;
  const pathId = match[2] ? decodeURIComponent(match[2]) : null;
  const root = userSpaceRoot();

  if (method !== "POST" && method !== "PUT" && method !== "DELETE") {
    send(res, 405, { ok: false, error: "method not allowed" });
    return true;
  }

  let user: UserRegistries;
  try {
    user = loadUserRegistries();
  } catch (err) {
    send(res, 500, { ok: false, error: `user space is unreadable: ${(err as Error).message}` });
    return true;
  }

  if (method === "DELETE") {
    if (!pathId) {
      send(res, 400, { ok: false, error: "id required" });
      return true;
    }
    const result = removeDefinition(kind, pathId, user, root);
    if (result.status < 300) onChanged?.();
    send(res, result.status, result.body);
    return true;
  }

  readBody(req, res, (parsed) => {
    const sentRevision = req.headers["x-revision"];
    const result = writeDefinition(kind, parsed, user, {
      method: method as "POST" | "PUT",
      revision: typeof sentRevision === "string" ? sentRevision : null,
      pathId,
    });
    if (result.status < 300) onChanged?.();
    send(res, result.status, result.body);
  });
  return true;
}
