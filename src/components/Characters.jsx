import React from 'react';

// Character promenade walker using sprite animation via translation + bob
// We have 74 character sprites extracted; we use a subset for walking/cheering

const CHARACTER_VARIANTS = [
  '/sprites/organized/character-red-front-idle.png',
  '/sprites/organized/character-blue-front-idle.png',
  '/sprites/organized/character-green-front-idle.png',
  '/sprites/organized/character-yellow-front-idle.png',
  '/sprites/organized/character-orange-front-idle.png',
  '/sprites/organized/character-purple-front-idle.png',
];

export function CharacterStrip({ count=12 }) {
  return (
    <div className="absolute bottom-[44%] left-0 right-0 h-[10%] flex items-end gap-2 px-4 overflow-hidden" data-testid="characters__strip">
      {Array.from({ length: count }).map((_, i) => {
        const src = CHARACTER_VARIANTS[i % CHARACTER_VARIANTS.length];
        const delay = (i * 0.3) % 2;
        return (
          <div
            key={i}
            className="relative"
            style={{
              animation: `character-bob 0.8s ease-in-out ${delay}s infinite`,
            }}
          >
            <img
              src={src}
              alt="character"
              className="pixelated"
              data-testid={`characters__avatar-${i}`}
              style={{
                width: '32px',
                height: '56px',
                imageRendering: 'pixelated',
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function WalkingCrowd({ count=18 }) {
  // Walkers translating across promenade
  return (
    <div className="absolute bottom-[46%] left-0 right-0 h-8 overflow-hidden pointer-events-none" data-testid="characters__walkers">
      {Array.from({ length: count }).map((_, i) => {
        const src = CHARACTER_VARIANTS[i % CHARACTER_VARIANTS.length];
        const duration = 18 + (i % 5)*4;
        const top = (i % 2)*8;
        const scale = 0.9 + (i%3)*0.1;
        return (
          <img
            key={i}
            src={src}
            alt="walker"
            className="absolute pixelated"
            data-testid={`characters__walker-${i}`}
            style={{
              top: `${top}px`,
              width: `${28*scale}px`,
              animation: `drift ${duration}s linear ${-i*2}s infinite`,
              imageRendering: 'pixelated',
            }}
          />
        );
      })}
    </div>
  );
}
