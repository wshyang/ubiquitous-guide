import { createScene, STAGE_HEIGHT, STAGE_WIDTH } from "./scene/scene";
import { loadSpriteLibrary } from "./scene/sprites";

const canvas = document.querySelector<HTMLCanvasElement>("#scene");
const toggle = document.querySelector<HTMLButtonElement>("#play-toggle");
if (!canvas || !toggle) {
  throw new Error("scene markup is missing");
}
const context = canvas.getContext("2d");
if (!context) {
  throw new Error("2D canvas is not available");
}
const ctx: CanvasRenderingContext2D = context;

/**
 * `?t=<ms>` freezes the simulated clock at that time, so screenshots are reproducible.
 * Without it the scene plays in real time from load.
 */
const params = new URLSearchParams(window.location.search);
const frozenAt = params.has("t") ? Number(params.get("t")) : null;

function fitCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const scale = Math.min(window.innerWidth / STAGE_WIDTH, window.innerHeight / STAGE_HEIGHT);
  canvas!.style.width = `${Math.round(STAGE_WIDTH * scale)}px`;
  canvas!.style.height = `${Math.round(STAGE_HEIGHT * scale)}px`;
  canvas!.width = Math.round(STAGE_WIDTH * scale * dpr);
  canvas!.height = Math.round(STAGE_HEIGHT * scale * dpr);
  ctx.setTransform((canvas!.width / STAGE_WIDTH), 0, 0, canvas!.height / STAGE_HEIGHT, 0, 0);
}

async function start(): Promise<void> {
  const library = await loadSpriteLibrary();
  const scene = createScene(library);
  let paused = frozenAt !== null;
  let clockOrigin = performance.now();
  let pausedAt = frozenAt ?? 0;

  const now = (): number => (paused ? pausedAt : performance.now() - clockOrigin);

  toggle!.addEventListener("click", () => {
    if (paused) {
      clockOrigin = performance.now() - pausedAt;
      paused = false;
    } else {
      pausedAt = now();
      paused = true;
    }
    toggle!.textContent = paused ? "Play" : "Pause";
  });
  toggle!.textContent = paused ? "Play" : "Pause";

  const frame = (): void => {
    fitCanvas();
    scene.draw(ctx, now());
    requestAnimationFrame(frame);
  };
  window.addEventListener("resize", fitCanvas);
  document.body.dataset.ready = "true";
  requestAnimationFrame(frame);
}

start().catch((error: unknown) => {
  document.body.dataset.error = String(error);
  console.error(error);
});
