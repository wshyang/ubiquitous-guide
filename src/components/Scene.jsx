import React, { useState, useEffect } from 'react';
import DragonBoat from './boats/DragonBoat';
import Kayak from './boats/Kayak';
import Clouds from './Clouds';
import { CharacterStrip, WalkingCrowd } from './Characters';
import PropsLayer from './Props';
import { WaterSurface, Splash } from './Water';

// Main scene - entire Kallang waterfront populated with animated elements
export function Scene({ debugAnchors=false }) {
  const [now, setNow] = useState(0);
  useEffect(()=> {
    const id = setInterval(()=> setNow(t=>t+1), 1000);
    return ()=> clearInterval(id);
  },[]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-sky-300" data-testid="scene__root" style={{ fontFamily: '"Press Start 2P", monospace' }}>
      {/* Sky gradient backdrop - use extracted sky image as fallback */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(/images/backdrop-sky-gradient-blue.jpg)`,
          backgroundSize: 'cover',
          backgroundPosition: 'top',
        }}
        data-testid="scene__sky"
      >
        <Clouds count={8} />
      </div>

      {/* Stadium backdrop - Kallang dome */}
      <div
        className="absolute inset-x-0 top-[8%] bottom-[38%] overflow-hidden"
        data-testid="scene__stadium"
      >
        <img
          src="/images/backdrop-kallang-daytime-turquoise.jpg"
          alt="Kallang Stadium backdrop"
          className="w-full h-full object-cover object-top pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
        {/* Alternative sunset overlay at top */}
        <div className="absolute top-0 left-0 right-0 h-[18%] bg-gradient-to-b from-fuchsia-500/20 to-transparent pointer-events-none" />
        {/* Title overlay like in original art */}
        <div className="absolute bottom-[10%] left-1/2 -translate-x-1/2 bg-black/60 px-4 py-2 border-2 border-white">
          <h1 className="text-white text-xs md:text-sm lg:text-base tracking-widest" data-testid="scene__title">THE KALLANG 🇸🇬</h1>
        </div>
      </div>

      {/* Props on promenade */}
      <PropsLayer />

      {/* Characters on promenade */}
      <CharacterStrip count={14} />
      <WalkingCrowd count={10} />

      {/* Water surface */}
      <WaterSurface />

      {/* Animated Boats on water */}
      <div className="absolute bottom-0 left-0 right-0 h-[38%] overflow-hidden" data-testid="scene__water-traffic">
        {/* Dragonboats - 3 lanes, moving left->right etc */}
        <div
          className="absolute"
          style={{
            bottom: '60%',
            left: '-25%',
            animation: 'drift 22s linear infinite',
            animationDelay: '0s',
          }}
          data-testid="scene__dragonboat-red"
        >
          <DragonBoat colour="red" scale={0.22} animOffset={0} showAnchors={debugAnchors} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '42%',
            left: '-30%',
            animation: 'drift 18s linear infinite',
            animationDelay: '-7s',
            transform: 'scaleX(1)',
          }}
          data-testid="scene__dragonboat-blue"
        >
          <DragonBoat colour="blue" scale={0.20} animOffset={0.4} showAnchors={debugAnchors} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '24%',
            left: '-35%',
            animation: 'drift 26s linear infinite',
            animationDelay: '-12s',
          }}
          data-testid="scene__dragonboat-green"
        >
          <DragonBoat colour="green" scale={0.23} animOffset={0.2} showAnchors={debugAnchors} />
        </div>

        {/* Kayaks - varied positions & directions */}
        <div
          className="absolute"
          style={{
            bottom: '70%',
            left: '-15%',
            animation: 'drift 14s linear infinite',
            animationDelay: '-2s',
          }}
          data-testid="scene__kayak-red"
        >
          <Kayak variant="K1" colour="red" file="kayak-k1-red-frame1" scale={0.32} animOffset={0} showAnchors={debugAnchors} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '52%',
            left: '-20%',
            animation: 'drift 16s linear infinite',
            animationDelay: '-9s',
          }}
          data-testid="scene__kayak-yellow"
        >
          <Kayak variant="K1" colour="yellow" file="kayak-k1-yellow-frame1" scale={0.30} animOffset={0.3} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '34%',
            left: '-18%',
            animation: 'drift 13s linear infinite',
            animationDelay: '-4s',
          }}
          data-testid="scene__kayak-green"
        >
          <Kayak variant="K2" colour="green" file="kayak-k2-green-frame1" scale={0.28} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '14%',
            left: '-22%',
            animation: 'drift 15s linear infinite',
            animationDelay: '-6s',
          }}
          data-testid="scene__kayak-blue"
        >
          <Kayak variant="K2" colour="blue" file="kayak-k2-blue-frame1" scale={0.29} />
        </div>
        <div
          className="absolute"
          style={{
            bottom: '48%',
            right: '-20%',
            left: 'auto',
            animation: 'drift 19s linear infinite reverse',
            animationDelay: '-3s',
          }}
          data-testid="scene__kayak-purple"
        >
          <div style={{ transform: 'scaleX(-1)' }}>
            <Kayak variant="K3" colour="purple" file="kayak-k3-purple-frame1" scale={0.27} />
          </div>
        </div>
        <div
          className="absolute"
          style={{
            bottom: '8%',
            left: '-25%',
            animation: 'drift 17s linear infinite',
            animationDelay: '-11s',
          }}
          data-testid="scene__kayak-orange"
        >
          <Kayak variant="K2" colour="orange" file="kayak-k2-orange-frame1" scale={0.30} />
        </div>

        {/* Water effects: splashes following boats */}
        <Splash x="20%" y="55%" delay={0.2} />
        <Splash x="45%" y="35%" delay={0.5} />
        <Splash x="70%" y="60%" delay={0.1} />
        {/* Wakes behind dragonboats */}
        <img src="/sprites/organized/wake-medium.png" alt="wake" className="absolute bottom-[58%] left-[12%] w-24 opacity-60 pixelated" style={{imageRendering:'pixelated', animation: 'bob 2s ease-in-out infinite'}} data-testid="scene__wake-1" />
        <img src="/sprites/organized/wake-small-1.png" alt="wake" className="absolute bottom-[40%] left-[18%] w-20 opacity-50 pixelated" style={{imageRendering:'pixelated'}} data-testid="scene__wake-2" />
      </div>

      {/* Vignette / scanlines for pixel feel */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, black 2px, black 3px)`
      }} />

      {/* Debug overlay label */}
      {debugAnchors && (
        <div className="absolute top-2 left-2 bg-black/80 text-lime-300 text-[9px] p-2 font-mono leading-tight whitespace-pre" data-testid="scene__debug-label">
          {`ANCHOR DEBUG MODE
Dragon: 10 rowers @ gunwaleY 0.58
Kayak: cockpit pivots @ 0.55
Drag toggle ?debugAnchors`}
        </div>
      )}
    </div>
  );
}
export default Scene;
