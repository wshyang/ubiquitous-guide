/** Ambient water effects (ripples and small splashes) sprinkled on the bay.
 *  Positions come from the water map; a traffic fade (scene/traffic.ts)
 *  dissolves an effect before a hull or wake reaches it. */
import { cyclePhase } from "../lib/anim";
import { drawSprite, scaledSize } from "../lib/draw";
import type { SpriteStore } from "../lib/sprites";
import type { Entity } from "../lib/types";
import { trafficFadeAt } from "../scene/traffic";
import type { Rect } from "../scene/waterMap";

export interface RippleConfig {
  spriteId: string; x: number; y: number; width: number;
  periodSec: number; phaseOffset: number; layer: number;
  /** Boat occupancy at time t; effects fade to 0 under a hull/wake. */
  trafficAt?: (timeSec: number) => Rect[];
}

export function createRipple(store: SpriteStore, cfg: RippleConfig): Entity {
  const sprite = store.get(cfg.spriteId);
  return {
    layer: cfg.layer,
    draw(ctx, env) {
      const traffic = cfg.trafficAt?.(env.timeSec) ?? [];
      const trafficFade = trafficFadeAt(cfg.x, cfg.y, traffic);
      if (trafficFade <= 0.01) return;
      const phase = cyclePhase(env.timeSec, cfg.periodSec, cfg.phaseOffset);
      const scale = 0.75 + 0.5 * phase;
      const alpha = 0.85 * (1 - phase * phase) * trafficFade;
      if (alpha <= 0.01) return;
      const size = scaledSize(sprite.entry.width, sprite.entry.height, cfg.width * scale);
      drawSprite(ctx, sprite.image, {
        x: cfg.x, y: cfg.y, w: size.w, h: size.h, pivotX: 0.5, pivotY: 0.5, alpha,
      });
    },
  };
}
