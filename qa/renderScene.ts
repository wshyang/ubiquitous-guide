/** Render full-scene stills at chosen times (defaults 2s and 6.5s). */
import { loadAnchors } from "../src/lib/anchors";
import { buildScene, renderScene, WORLD_HEIGHT, WORLD_WIDTH } from "../src/scene/scene";
import { createCanvas, loadBackdrop, loadNodeStore, saveCanvas } from "./nodeCanvas";

const store = await loadNodeStore();
const anchors = loadAnchors();
const backdrop = await loadBackdrop();
const entities = buildScene(store, anchors, 20261017);
const withGrid = process.argv.includes("--grid");
const times = [2, 6.5];

for (const t of times) {
  const canvas = createCanvas(WORLD_WIDTH, WORLD_HEIGHT);
  const ctx = canvas.getContext("2d");
  renderScene(ctx as never, backdrop, entities, { timeSec: t, showAnchors: false });
  if (withGrid) drawGrid(ctx);
  await saveCanvas(canvas, `qa/scene-t${String(t).replace(".", "_")}${withGrid ? "-grid" : ""}.png`);
}

function drawGrid(ctx: { strokeStyle: unknown; fillStyle: unknown; font: unknown; beginPath(): void; moveTo(x: number, y: number): void; lineTo(x: number, y: number): void; stroke(): void; fillText(s: string, x: number, y: number): void }): void {
  ctx.strokeStyle = "rgba(255,0,0,0.35)";
  ctx.fillStyle = "rgba(255,0,0,0.8)";
  ctx.font = "bold 20px system-ui, sans-serif";
  for (let x = 0; x <= WORLD_WIDTH; x += 200) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, WORLD_HEIGHT); ctx.stroke();
    ctx.fillText(String(x), x + 4, 24);
  }
  for (let y = 0; y <= WORLD_HEIGHT; y += 100) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WORLD_WIDTH, y); ctx.stroke();
    ctx.fillText(String(y), 6, y + 22);
  }
}
