import * as fileStore from "./storage.js";

/**
 * Persistence seam (N81, 1c).
 *
 * All task / review / incident state lives as JSON files under `workTasks/`.
 * This interface is the seam where a different backend (SQLite, a service)
 * could be dropped in later without rewriting callers. The method signatures
 * are derived from the file-store impl via `typeof`, so the interface can never
 * drift from the implementation it abstracts.
 *
 * Adoption is deliberately incremental ("lean now, scale deliberately"): the
 * free functions in `storage.ts` remain the implementation and current call
 * sites, while new/central read paths route through `jsonFileStorage`. A future
 * backend implements `Storage` and is swapped in at the wiring points.
 */
export interface Storage {
  loadMaster: typeof fileStore.loadMaster;
  saveMaster: typeof fileStore.saveMaster;
  loadShard: typeof fileStore.loadShard;
  saveShard: typeof fileStore.saveShard;
  loadTaskById: typeof fileStore.loadTaskById;
  loadAllTasks: typeof fileStore.loadAllTasks;
  getShardFileName: typeof fileStore.getShardFileName;
  getShardPath: typeof fileStore.getShardPath;
  ensureShardExists: typeof fileStore.ensureShardExists;
  ensureWorkDir: typeof fileStore.ensureWorkDir;
  loadTaskReviews: typeof fileStore.loadTaskReviews;
  saveTaskReviews: typeof fileStore.saveTaskReviews;
  loadTaskIncidents: typeof fileStore.loadTaskIncidents;
  saveTaskIncidents: typeof fileStore.saveTaskIncidents;
}

/** JSON-file implementation — the default store under `workTasks/`. */
export const jsonFileStorage: Storage = {
  loadMaster: fileStore.loadMaster,
  saveMaster: fileStore.saveMaster,
  loadShard: fileStore.loadShard,
  saveShard: fileStore.saveShard,
  loadTaskById: fileStore.loadTaskById,
  loadAllTasks: fileStore.loadAllTasks,
  getShardFileName: fileStore.getShardFileName,
  getShardPath: fileStore.getShardPath,
  ensureShardExists: fileStore.ensureShardExists,
  ensureWorkDir: fileStore.ensureWorkDir,
  loadTaskReviews: fileStore.loadTaskReviews,
  saveTaskReviews: fileStore.saveTaskReviews,
  loadTaskIncidents: fileStore.loadTaskIncidents,
  saveTaskIncidents: fileStore.saveTaskIncidents,
};
