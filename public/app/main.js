/**
 * Bootstrap: fetch scene-config.json, load assets, build the scene, run the loop.
 * No bundler — plain ES modules (see CLAUDE.md stack table).
 */
import { ensureImage, loadJSON, loadSceneAssets } from "./assets.js";
import { drawFrame } from "./render.js";
import { buildScene } from "./scene.js";

const $ = (sel) => document.querySelector(sel);

function showError(err) {
  console.error(err);
  const el = $("[data-testid='scene-error']");
  if (el) {
    el.hidden = false;
    el.textContent = `Scene failed: ${err.message}`;
  }
}

function setCanvasSize(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
  canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
}

function setupControls(config) {
  const select = $("[data-testid='scene-controls__backdrop-select']");
  config.backdrops.forEach((b, i) => {
    const opt = document.createElement("option");
    opt.value = String(i);
    opt.textContent = b.label;
    select.appendChild(opt);
  });
  return select;
}

function setupStats(scene, config) {
  const actors = [
    ...scene.boats.map((b) => b.kind),
    ...scene.walkers.map(() => "walker"),
    ...scene.cheerers.map(() => "cheer"),
  ];
  const counts = actors.reduce((acc, k) => ({ ...acc, [k]: (acc[k] || 0) + 1 }), {});
  $("[data-testid='scene-stats__actors']").textContent =
    `${config.props.length} props, ${scene.clouds.length} clouds, ` +
    `${counts.dragon} dragon boats, ${counts.small} kayaks, ` +
    `${counts.walker} walkers, ${counts.cheer} cheerers, ${scene.ripples.length} ripple slots`;
}

function startLoop(canvas, ctx, assets, scene, config) {
  let paused = false;
  let t = 0;
  let last = performance.now();
  const button = $("[data-testid='scene-controls__pause-button']");
  button.addEventListener("click", () => {
    paused = !paused;
    button.textContent = paused ? "Play" : "Pause";
    button.setAttribute("aria-pressed", String(paused));
  });
  const step = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!paused) t += dt;
    drawFrame(ctx, assets, scene, config, t, canvas);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

async function init() {
  try {
    const canvas = $("[data-testid='scene-canvas']");
    const ctx = canvas.getContext("2d");
    const config = await loadJSON("/app/scene-config.json");
    config.currentBackdropUrl = config.backdrops[0].url;
    const status = $("[data-testid='scene-stats__loading']");
    const assets = await loadSceneAssets(config, (done, total) => {
      status.textContent = `Loading assets ${done}/${total}`;
    });
    status.textContent = "";
    const scene = buildScene(config, assets.spriteManifest, assets.compositeManifest);
    const select = setupControls(config);
    select.addEventListener("change", async () => {
      const url = config.backdrops[Number(select.value)].url;
      try {
        await ensureImage(assets, url);
        config.currentBackdropUrl = url;
      } catch (err) {
        showError(err);
      }
    });
    setupStats(scene, config);
    setCanvasSize(canvas);
    window.addEventListener("resize", () => setCanvasSize(canvas));
    startLoop(canvas, ctx, assets, scene, config);
    window.__SCENE_READY__ = true;
  } catch (err) {
    showError(err);
  }
}

init();
