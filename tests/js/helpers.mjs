/** Shared loaders for the js test suite — reads the real repo artifacts. */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export async function loadJSON(relPath) {
  return JSON.parse(await readFile(join(repoRoot, relPath), "utf8"));
}

export async function loadConfig() {
  return loadJSON("public/app/scene-config.json");
}

export async function loadSprites() {
  return loadJSON("public/sprites/manifest.json");
}

export async function loadComposites() {
  return loadJSON("public/composites/manifest.json");
}

export function countsByClass(pieces) {
  const counts = {};
  for (const p of pieces) counts[p.class] = (counts[p.class] || 0) + 1;
  return counts;
}
