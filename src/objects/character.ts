/** People: walkers/joggers, cheerers and idlers built from the pose sheet.
 *  Two-frame step illusion = run pose <> side pose (or the two run strides
 *  for orange/purple kits) plus a bob; see CLAUDE §12.4 named loops. */
import { cyclePhase, wrap } from "../lib/anim";
import { drawSprite, scaledSize } from "../lib/draw";
import type { SpriteStore } from "../lib/sprites";
import type { Ctx, Entity } from "../lib/types";

export type Kit = "red" | "blue" | "green" | "yellow" | "orange" | "purple";
export const KITS: readonly Kit[] = ["red", "blue", "green", "yellow", "orange", "purple"];

const RICH_KITS: ReadonlySet<Kit> = new Set(["orange", "purple"]);

function runFrames(kit: Kit): [string, string] {
  return RICH_KITS.has(kit)
    ? [`char-${kit}-run-right-a`, `char-${kit}-run-right-b`]
    : [`char-${kit}-run-right`, `char-${kit}-side-right`];
}

function cheerFrames(kit: Kit): [string, string] {
  return RICH_KITS.has(kit)
    ? [`char-${kit}-celebrate-front`, `char-${kit}-wave`]
    : [`char-${kit}-celebrate-front`, `char-${kit}-cheer-front`];
}

function drawPose(ctx: Ctx, store: SpriteStore, poseId: string, x: number, feetY: number,
                  height: number, flip: boolean): void {
  const sprite = store.get(poseId);
  const size = scaledSize(sprite.entry.width, sprite.entry.height,
    (height * sprite.entry.width) / sprite.entry.height);
  drawSprite(ctx, sprite.image, { x, y: feetY, w: size.w, h: height, pivotX: 0.5, pivotY: 1, flipX: flip });
}

export type PathPoint = readonly [x: number, feetY: number];

export interface WalkerConfig {
  kit: Kit; feetY: number; height: number; startX: number;
  speedPxPerSec: number; stridePeriodSec: number; worldWidth: number;
  layer: number; phaseOffset: number;
  /** Optional sloped path: feetY interpolated from x along these points. */
  path?: readonly PathPoint[];
}

export function pathYAt(path: readonly PathPoint[], x: number): number {
  const first = path[0];
  const last = path[path.length - 1];
  if (first === undefined || last === undefined) throw new Error("path needs points");
  if (x <= first[0]) return first[1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    if (from === undefined || to === undefined) continue;
    if (x >= from[0] && x <= to[0]) {
      return from[1] + ((to[1] - from[1]) * (x - from[0])) / (to[0] - from[0]);
    }
  }
  return last[1];
}

export function createWalker(store: SpriteStore, cfg: WalkerConfig): Entity {
  const [frameA, frameB] = runFrames(cfg.kit);
  const movingLeft = cfg.speedPxPerSec < 0;
  return {
    layer: cfg.layer,
    draw(ctx, env) {
      const x = wrap(cfg.startX + cfg.speedPxPerSec * env.timeSec, -90, cfg.worldWidth + 90);
      const stepPhase = cyclePhase(env.timeSec, cfg.stridePeriodSec, cfg.phaseOffset);
      const pose = stepPhase < 0.5 ? frameA : frameB;
      const bob = -Math.abs(Math.sin(stepPhase * Math.PI)) * cfg.height * 0.045;
      const feetY = cfg.path ? pathYAt(cfg.path, x) : cfg.feetY;
      drawPose(ctx, store, pose, x, feetY + bob, cfg.height, movingLeft);
    },
  };
}

export interface CheererConfig {
  kit: Kit; x: number; feetY: number; height: number; layer: number; phaseOffset: number;
}

export function createCheerer(store: SpriteStore, cfg: CheererConfig): Entity {
  const [frameA, frameB] = cheerFrames(cfg.kit);
  return {
    layer: cfg.layer,
    draw(ctx, env) {
      const phase = cyclePhase(env.timeSec, 0.72, cfg.phaseOffset);
      const hop = -Math.sin(phase * Math.PI) * cfg.height * 0.05;
      drawPose(ctx, store, phase < 0.5 ? frameA : frameB, cfg.x, cfg.feetY + hop, cfg.height, false);
    },
  };
}

export interface IdlerConfig {
  kit: Kit; x: number; feetY: number; height: number; layer: number; periodSec: number; phaseOffset: number;
}

export function createIdler(store: SpriteStore, cfg: IdlerConfig): Entity {
  const gesture = RICH_KITS.has(cfg.kit) ? `char-${cfg.kit}-wave` : `char-${cfg.kit}-reach-right`;
  const idle = `char-${cfg.kit}-idle-front`;
  return {
    layer: cfg.layer,
    draw(ctx, env) {
      const phase = cyclePhase(env.timeSec, cfg.periodSec, cfg.phaseOffset);
      const pose = phase < 0.16 ? gesture : idle;
      const sway = Math.sin(env.timeSec * 1.7 + cfg.phaseOffset * 9) * 1.1;
      drawPose(ctx, store, pose, cfg.x + sway, cfg.feetY, cfg.height, false);
    },
  };
}
