import React from 'react';
import { DRAGON_ANCHORS } from './anchors';

// DragonBoat component - composite hull + oars with anchor points
// Props: colour='red' etc., scale, animOffset, showAnchors (debug)
export function DragonBoat({ colour='red', scale=1, animOffset=0, showAnchors=false, debug=false }) {
  const hullSrc = `/sprites/organized/dragonboat-${colour}.png`;
  const oarSrc = `/sprites/organized/oar-dragon-frame02-vertical.png`;
  // fallback to generic if colour missing
  const hullWidth = DRAGON_ANCHORS.hull.width * scale;
  const hullHeight = DRAGON_ANCHORS.hull.height * scale;

  return (
    <div
      className="relative inline-block pixelated"
      data-testid="dragonboat__hull"
      style={{ width: hullWidth, height: hullHeight }}
    >
      {/* Hull */}
      <img
        src={hullSrc}
        alt={`dragonboat ${colour}`}
        className="absolute inset-0 w-full h-full pixelated"
        draggable={false}
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Oars - one per rower */}
      {DRAGON_ANCHORS.rowers.map((rower, idx) => {
        const x = rower.x * hullWidth;
        const y = rower.y * hullHeight;
        // Stagger animation via delay
        const delay = rower.phase + animOffset;
        // Oar size: scale similarly
        const oarW = 34 * scale * 0.7; // slightly smaller for visual fit
        const oarH = 180 * scale * 0.7;
        return (
          <img
            key={rower.id}
            src={oarSrc}
            alt="oar"
            className="absolute pixelated"
            data-testid={`dragonboat__oar-${rower.id}`}
            style={{
              left: x - oarW * DRAGON_ANCHORS.oar.pivotX,
              top: y - oarH * DRAGON_ANCHORS.oar.pivotY,
              width: oarW,
              height: oarH,
              transformOrigin: `${DRAGON_ANCHORS.oar.pivotX*100}% ${DRAGON_ANCHORS.oar.pivotY*100}%`,
              animation: `oar-row ${DRAGON_ANCHORS.animation.duration}s ease-in-out ${delay}s infinite`,
              imageRendering: 'pixelated',
              zIndex: 2,
            }}
          />
        );
      })}
      {/* Debug anchor dots */}
      {showAnchors && DRAGON_ANCHORS.rowers.map(r => (
        <div
          key={`dot-${r.id}`}
          className="absolute w-2 h-2 bg-red-500 rounded-full border border-white"
          style={{
            left: r.x * hullWidth - 4,
            top: r.y * hullHeight - 4,
            zIndex: 10,
          }}
          title={`${r.id} ${r.x},${r.y}`}
        />
      ))}
      {showAnchors && (
        <div className="absolute bottom-0 left-0 text-[7px] bg-black/70 text-white px-1 font-mono">
          {colour} {hullWidth.toFixed(0)}x{hullHeight.toFixed(0)}
        </div>
      )}
    </div>
  );
}

export default DragonBoat;
