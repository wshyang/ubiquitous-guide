import React from 'react';

export function WaterSurface() {
  return (
    <div className="absolute bottom-0 left-0 right-0 h-[38%] bg-gradient-to-b from-cyan-500/40 to-teal-700/60 backdrop-blur-[0.5px] overflow-hidden" data-testid="water__surface">
      {/* shimmer lines */}
      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage: `repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.3) 40px 42px)`,
        animation: 'wave 2s linear infinite',
      }} />
      {/* subtle wave texture */}
      <div className="absolute top-2 left-0 right-0 h-1 bg-white/20 blur-[1px]" style={{ animation: 'bob 3s ease-in-out infinite'}} />
    </div>
  );
}

export function Splash({ x='50%', y='50%', delay=0 }) {
  return (
    <div
      className="absolute w-6 h-6 pointer-events-none"
      data-testid="water__splash"
      style={{
        left: x, top: y,
        background: 'radial-gradient(circle, rgba(180,240,255,0.9) 0%, transparent 70%)',
        borderRadius: '50%',
        animation: `splash 0.9s ease-out ${delay}s infinite`,
      }}
    />
  );
}
