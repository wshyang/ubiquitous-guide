/** Ambient water: pulsing ripples scattered on the bay. */
import { cyclePhase } from "../lib/anim";
import { drawSprite, scaledSize } from "../lib/draw";
import type { SpriteStore } from "../lib/sprites";
import type { Entity } from "../lib/types";

export interface RippleConfig {
  spriteId: string; x: number; y: number; width: number;
  periodSec: number; phaseOffset: number; layer: number;
}

export function createRipple(store: SpriteStore, cfg: RippleConfig): Entity {
  const sprite = store.get(cfg.spriteId);
  return {
    layer: cfg.layer,
    draw(ctx, env) {
      const phase = cyclePhase(env.timeSec, cfg.periodSec, cfg.phaseOffset);
      const scale = 0.75 + 0.5 * phase;
      const alpha = 0.85 * (1 - phase * phase);
      const size = scaledSize(sprite.entry.width, sprite.entry.height, cfg.width * scale);
      drawSprite(ctx, sprite.image, {
        x: cfg.x, y: cfg.y, w: size.w, h: size.h, pivotX: 0.5, pivotY: 0.5, alpha,
      });
    },
  };
}
