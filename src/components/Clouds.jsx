import React from 'react';

const CLOUD_FILES = [
  '/sprites/organized/cloud-small-000.png',
  '/sprites/organized/cloud-small-001.png',
  '/sprites/organized/cloud-small-002.png',
  '/sprites/organized/cloud-small-003.png',
  '/sprites/organized/cloud-small-004.png',
  '/sprites/organized/cloud-small-005.png',
  '/sprites/organized/cloud-large-01.png',
  '/sprites/organized/cloud-large-02.png',
];

export function Clouds({ count=6, showAnchors=false }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" data-testid="clouds__layer">
      {Array.from({ length: count }).map((_, i) => {
        const file = CLOUD_FILES[i % CLOUD_FILES.length];
        const top = 5 + (i * 13) % 35; // % from top
        const scale = 0.4 + (i % 3)*0.2;
        const duration = 30 + i*8;
        const delay = i* -5;
        const opacity = 0.7 + (i%2)*0.3;
        return (
          <img
            key={i}
            src={file}
            alt="cloud"
            className="absolute pixelated"
            data-testid={`clouds__cloud-${i}`}
            style={{
              top: `${top}%`,
              left: `-20%`,
              width: `${180 * scale}px`,
              animation: `drift ${duration}s linear ${delay}s infinite`,
              opacity,
              imageRendering: 'pixelated',
            }}
          />
        );
      })}
    </div>
  );
}
export default Clouds;
