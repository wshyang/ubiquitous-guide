import React from 'react';
import { KAYAK_ANCHORS } from './anchors';

export function Kayak({ variant='K1', colour='red', file, scale=1, animOffset=0, showAnchors=false }) {
  // file overrides variant/colour lookup
  const hullSrc = file ? `/sprites/organized/${file}.png` : `/sprites/organized/kayak-k1-${colour}-frame1.png`;
  // Determine config based on variant
  let cfg;
  if (variant === 'K1') cfg = KAYAK_ANCHORS.K1;
  else if (variant === 'K2') cfg = KAYAK_ANCHORS.K2;
  else if (variant === 'K3') cfg = KAYAK_ANCHORS.K3;
  else cfg = KAYAK_ANCHORS.K1;

  const hullW = cfg.hull.width * scale;
  const hullH = cfg.hull.height * scale;

  const paddleSrc = `/sprites/organized/paddle-kayak-horizontal-brown.png`;

  // For K1 single cockpit, K2/K3 multiple
  const cockpits = cfg.cockpit ? [cfg.cockpit] : cfg.cockpits;

  return (
    <div
      className="relative inline-block pixelated"
      data-testid="kayak__hull"
      style={{ width: hullW, height: hullH }}
    >
      <img
        src={hullSrc}
        alt={`kayak ${variant} ${colour}`}
        className="absolute inset-0 w-full h-full pixelated"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      {cockpits.map((cp, idx) => {
        const x = cp.x * hullW;
        const y = cp.y * hullH;
        const delay = (cp.phase || 0) + animOffset;
        const paddleW = 178 * scale * 0.6;
        const paddleH = 32 * scale * 0.6;
        return (
          <img
            key={idx}
            src={paddleSrc}
            alt="paddle"
            className="absolute pixelated"
            data-testid={`kayak__paddle-${idx}`}
            style={{
              left: x - paddleW * 0.5,
              top: y - paddleH * 0.5,
              width: paddleW,
              height: paddleH,
              transformOrigin: `50% 50%`,
              animation: `paddle-kayak ${cfg.animation.duration}s ease-in-out ${delay}s infinite`,
              imageRendering: 'pixelated',
              zIndex: 2,
            }}
          />
        );
      })}
      {showAnchors && cockpits.map((cp,i)=>(
        <div key={`dot-${i}`} className="absolute w-2 h-2 bg-cyan-400 rounded-full border border-white" style={{ left: cp.x*hullW-4, top: cp.y*hullH-4, zIndex:10 }} />
      ))}
    </div>
  );
}
export default Kayak;
