/** Node QA harness: load sprites from public/ via napi-canvas so the real
 *  renderer produces reviewable PNG stills without a browser (CLAUDE §8). */
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { readFile, writeFile } from "node:fs/promises";
import { buildStore, type SpriteStore } from "../src/lib/sprites";
import type { SpriteImage, SpriteManifest } from "../src/lib/types";

export async function loadNodeStore(): Promise<SpriteStore> {
  const raw = await readFile("src/generated/sprite-manifest.json", "utf8");
  const manifest = JSON.parse(raw) as SpriteManifest;
  return buildStore(manifest, async (entry) => loadImage(`public${entry.url}`) as Promise<SpriteImage>);
}

export async function loadBackdrop(): Promise<SpriteImage> {
  return loadImage("public/backdrops/kallang-day-clean.jpeg") as Promise<SpriteImage>;
}

export { createCanvas };

export async function saveCanvas(canvas: { encode: (f: "png") => Promise<Buffer> }, path: string): Promise<void> {
  await writeFile(path, await canvas.encode("png"));
  console.log(`wrote ${path}`);
}
