/** Browser entrypoint: load sprites, then run the deterministic scene clock. */
import manifestJson from "./generated/sprite-manifest.json";
import { loadAnchors } from "./lib/anchors";
import { buildStore } from "./lib/sprites";
import type { SpriteEntry, SpriteImage, SpriteManifest } from "./lib/types";
import { buildLab, LAB_HEIGHT, LAB_WIDTH, renderLab } from "./scene/lab";
import {
  backdropTheme, buildScene, renderScene, WORLD_HEIGHT, WORLD_WIDTH,
  type BackdropLayers, type BackdropTheme,
} from "./scene/scene";

interface Controls {
  pause: HTMLButtonElement;
  speed: HTMLButtonElement;
  view: HTMLButtonElement;
  anchors: HTMLButtonElement;
  theme: HTMLSelectElement;
}

async function loadBackdropLayers(theme: BackdropTheme): Promise<BackdropLayers> {
  const [sky, scene] = await Promise.all([loadHtmlImage(theme.skyUrl), loadHtmlImage(theme.sceneUrl)]);
  return { sky, scene };
}

const SPEEDS = [0.5, 1, 2] as const;

function must<T>(value: T | null, label: string): T {
  if (value === null) throw new Error(`Missing element: ${label}`);
  return value;
}

function loadHtmlImage(src: string): Promise<SpriteImage> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function parseParams() {
  const params = new URLSearchParams(location.search);
  return {
    seed: Number(params.get("seed") ?? "20261017"),
    startAt: Number(params.get("t") ?? "0"),
    view: params.get("view") === "lab" ? ("lab" as const) : ("scene" as const),
    theme: backdropTheme(params.get("theme")),
  };
}

async function boot(): Promise<void> {
  const canvas = must(document.querySelector<HTMLCanvasElement>("#scene"), "#scene");
  const ctx = must(canvas.getContext("2d"), "2d context");
  const controls: Controls = {
    pause: must(document.querySelector<HTMLButtonElement>("#btn-pause"), "#btn-pause"),
    speed: must(document.querySelector<HTMLButtonElement>("#btn-speed"), "#btn-speed"),
    view: must(document.querySelector<HTMLButtonElement>("#btn-view"), "#btn-view"),
    anchors: must(document.querySelector<HTMLButtonElement>("#btn-anchors"), "#btn-anchors"),
    theme: must(document.querySelector<HTMLSelectElement>("#theme-select"), "#theme-select"),
  };
  const params = parseParams();
  const manifest = manifestJson as SpriteManifest;
  const store = await buildStore(manifest, (entry: SpriteEntry) => loadHtmlImage(entry.url));
  const backdrop = await loadBackdropLayers(params.theme);
  const anchors = loadAnchors();
  const scene = buildScene(store, anchors, params.seed);
  const lab = buildLab(store, anchors);
  must(document.querySelector<HTMLElement>("#loading"), "#loading").style.display = "none";

  const state: MutableState = {
    paused: false, speedIndex: 1, view: params.view, showAnchors: false, time: params.startAt,
  };
  controls.theme.value = params.theme.id;
  wireControls(controls, state, () => applyView(canvas, controls, state.view));
  applyView(canvas, controls, state.view);
  const clockArgs: ClockArgs = { backdrop, scene, lab, state };
  wireThemeSelect(controls.theme, clockArgs);
  startClock(ctx, clockArgs);
}

function wireControls(controls: Controls, state: MutableState, onViewChange: () => void): void {
  controls.view.addEventListener("click", () => {
    state.view = state.view === "scene" ? "lab" : "scene";
    onViewChange();
  });
  controls.pause.addEventListener("click", () => {
    state.paused = !state.paused;
    controls.pause.textContent = state.paused ? "Play" : "Pause";
  });
  controls.speed.addEventListener("click", () => {
    state.speedIndex = (state.speedIndex + 1) % SPEEDS.length;
    controls.speed.textContent = `Speed: ${SPEEDS[state.speedIndex]}×`;
  });
  controls.anchors.addEventListener("click", () => {
    state.showAnchors = !state.showAnchors;
    controls.anchors.setAttribute("aria-pressed", String(state.showAnchors));
    controls.anchors.textContent = state.showAnchors ? "Hide anchor points" : "Show anchor points";
  });
}

interface MutableState {
  paused: boolean; speedIndex: number; view: "scene" | "lab"; showAnchors: boolean; time: number;
}

function applyView(canvas: HTMLCanvasElement, controls: Controls, view: "scene" | "lab"): void {
  const isLab = view === "lab";
  canvas.width = isLab ? LAB_WIDTH : WORLD_WIDTH;
  canvas.height = isLab ? LAB_HEIGHT : WORLD_HEIGHT;
  canvas.parentElement?.style.setProperty("aspect-ratio", `${canvas.width} / ${canvas.height}`);
  controls.view.textContent = isLab ? "View: Composite lab" : "View: Scene";
}

function wireThemeSelect(select: HTMLSelectElement, clockArgs: ClockArgs): void {
  let request = 0;
  select.addEventListener("change", () => {
    const mine = (request += 1);
    void loadBackdropLayers(backdropTheme(select.value)).then((layers) => {
      if (mine === request) clockArgs.backdrop = layers; // ignore stale loads
    });
  });
}

interface ClockArgs {
  backdrop: BackdropLayers;
  scene: ReturnType<typeof buildScene>;
  lab: ReturnType<typeof buildLab>;
  state: MutableState;
}

function startClock(ctx: CanvasRenderingContext2D, args: ClockArgs): void {
  let last = performance.now();
  const tick = (now: number): void => {
    const deltaSec = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!args.state.paused) args.state.time += deltaSec * (SPEEDS[args.state.speedIndex] ?? 1);
    const env = { timeSec: args.state.time, showAnchors: args.state.showAnchors };
    if (args.state.view === "scene") renderScene(ctx, args.backdrop, args.scene, env);
    else renderLab(ctx, args.lab, env);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

void boot().catch((error: unknown) => {
  const loading = document.querySelector<HTMLElement>("#loading");
  if (loading) loading.textContent = `Could not start the scene: ${error instanceof Error ? error.message : String(error)}`;
});
