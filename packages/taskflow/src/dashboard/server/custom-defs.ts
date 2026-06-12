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
import {
  CUSTOM_ID_PREFIX,
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
  const slug = id
    .slice(CUSTOM_ID_PREFIX.length)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-");
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
function validateReferences(
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
  for (const edge of project.flow) {
    for (const end of [edge.from, edge.to]) {
      if (!project.agents.includes(end)) {
        return `flow edge ${edge.from} → ${edge.to} references undeclared agent '${end}'`;
      }
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

function atomicWrite(path: string, record: unknown): void {
  mkdirSync(resolve(path, ".."), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}`;
  writeFileSync(tmp, JSON.stringify(record, null, 2) + "\n");
  renameSync(tmp, path);
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
  const existing = user[kind] as Record<string, { id: string }>;

  if (method === "DELETE") {
    if (!pathId) {
      send(res, 400, { ok: false, error: "id required" });
      return true;
    }
    if (!pathId.startsWith(CUSTOM_ID_PREFIX)) {
      send(res, 403, { ok: false, error: "built-ins are immutable" });
      return true;
    }
    if (!existing[pathId]) {
      send(res, 404, { ok: false, error: `unknown ${kind.slice(0, -1)} '${pathId}'` });
      return true;
    }
    const refs = referencingIds(kind, pathId, user);
    if (refs.length > 0) {
      send(res, 409, { ok: false, error: "still referenced", referencedBy: refs });
      return true;
    }
    try {
      unlinkSync(fileFor(root, kind, pathId));
    } catch (err) {
      send(res, 500, { ok: false, error: (err as Error).message });
      return true;
    }
    onChanged?.();
    send(res, 200, { ok: true, deleted: pathId });
    return true;
  }

  readBody(req, res, (parsed) => {
    const result = SCHEMAS[kind].safeParse(parsed);
    if (!result.success) {
      const err = result.error as ZodError;
      send(res, 400, {
        ok: false,
        error: "validation failed",
        issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }
    const record = result.data;

    if (pathId && pathId !== record.id) {
      send(res, 400, {
        ok: false,
        error: `body id '${record.id}' does not match URL id '${pathId}'`,
      });
      return;
    }
    if (!record.id.startsWith(CUSTOM_ID_PREFIX)) {
      send(res, 403, {
        ok: false,
        error: "built-ins are immutable — custom ids must start with 'custom:'",
      });
      return;
    }
    if (builtinIds(kind).has(record.id)) {
      send(res, 403, { ok: false, error: `id '${record.id}' collides with a built-in` });
      return;
    }
    if (method === "POST" && existing[record.id]) {
      send(res, 409, { ok: false, error: `'${record.id}' already exists — use PUT to update` });
      return;
    }
    if (method === "PUT" && !existing[record.id]) {
      send(res, 404, {
        ok: false,
        error: `unknown ${kind.slice(0, -1)} '${record.id}' — use POST to create`,
      });
      return;
    }
    // N111 — optimistic-concurrency floor: a PUT carrying the revision it
    // loaded gets rejected when the stored file has changed since.
    const sentRevision = req.headers["x-revision"];
    if (method === "PUT" && typeof sentRevision === "string" && sentRevision.length > 0) {
      const current = definitionRevision(kind, record.id, root);
      if (current && current !== sentRevision) {
        send(res, 409, { ok: false, error: "stale revision — reload the flow and retry" });
        return;
      }
    }

    if (kind === "modules") {
      (record as { source: string }).source = "custom";
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
      send(res, 400, { ok: false, error: refError });
      return;
    }
    // PUT must not break records that reference the previous version's shape;
    // re-validate dependents of an updated module/agent against the change.
    if (method === "PUT") {
      for (const agent of Object.values(prospective.agents)) {
        const err = validateReferences("agents", agent, prospective);
        if (err) {
          send(res, 400, { ok: false, error: `update breaks '${agent.id}': ${err}` });
          return;
        }
      }
      for (const project of Object.values(prospective.projects)) {
        const err = validateReferences("projects", project, prospective);
        if (err) {
          send(res, 400, { ok: false, error: `update breaks '${project.id}': ${err}` });
          return;
        }
      }
    }

    try {
      atomicWrite(fileFor(root, kind, record.id), record);
    } catch (err) {
      send(res, 500, { ok: false, error: (err as Error).message });
      return;
    }
    onChanged?.();
    send(res, method === "POST" ? 201 : 200, { ok: true, id: record.id });
  });
  return true;
}
