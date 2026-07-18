import { execFileSync } from "node:child_process";
import { readHubRegistry } from "../../core/global-config.js";

/**
 * N251 — `insight-flow update`. The global self-update backbone the hub's
 * update-available toast points at. Runs the global install, then lists the
 * bulk-registered projects and points at `/task-release-rollout` for the
 * per-project bump (that logic lives in the rollout agent — not duplicated here).
 *
 * The package spec is a fixed literal (`insight-flow@latest`) passed as an argv
 * element to `npm` via execFileSync — no shell, no interpolation of any fetched
 * value.
 */
export function cmdUpdate(): void {
  console.log("Updating insight-flow globally: npm i -g insight-flow@latest\n");
  try {
    execFileSync("npm", ["i", "-g", "insight-flow@latest"], { stdio: "inherit" });
  } catch {
    console.error("\nGlobal install failed. Run `npm i -g insight-flow@latest` manually.");
    process.exit(1);
  }

  const projects = readHubRegistry().filter((p) => p.bulkRegistered);
  if (projects.length === 0) {
    console.log("\nGlobal install done. No hub-registered projects to bump.");
    return;
  }

  console.log("\nGlobal install done. Hub-registered projects that may need a local bump:");
  for (const p of projects) {
    console.log(`  • ${p.label}  ${p.path}`);
  }
  console.log(
    "\nTo bump each project's local insight-flow dependency, run `/task-release-rollout` in Claude.",
  );
}
