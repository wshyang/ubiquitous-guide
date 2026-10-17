import React, { useState } from 'react';
import Scene from './components/Scene';
import DragonBoat from './components/boats/DragonBoat';
import Kayak from './components/boats/Kayak';

function App() {
  const params = new URLSearchParams(window.location.search);
  const debug = params.has('debugAnchors');
  const showLab = params.has('lab');
  const [scale, setScale] = useState(0.5);
  const [gunwaleY, setGunwaleY] = useState(0.58);
  const [oarAngleFrom, setOarAngleFrom] = useState(-28);
  const [oarAngleTo, setOarAngleTo] = useState(32);

  if (showLab) {
    // Lab mode: isolated composite overlay experimentation
    return (
      <div className="min-h-screen bg-zinc-900 text-white p-6" style={{ fontFamily: 'monospace' }} data-testid="app__lab">
        <h1 className="text-lg mb-4">Composite Lab — Dragonboat Oar Anchors (Iterative)</h1>
        <div className="flex gap-4 items-start">
          <div className="bg-fuchsia-500 p-2 rounded">
            <div className="bg-sky-900 p-4 relative" style={{ width: '800px', height: '300px', overflow: 'visible' }}>
              <div className="absolute bottom-10 left-2 right-2 h-16 bg-cyan-600/50" />
              <div className="absolute bottom-12 left-0 right-0">
                <DragonBoat colour="red" scale={scale} showAnchors={true} />
              </div>
              <div className="absolute top-1 left-1 text-[10px] bg-black/70 px-1">scale {scale.toFixed(2)} gunwaleY {gunwaleY}</div>
            </div>
            <div className="mt-2 text-xs text-white bg-black/50 p-2">
              Anchor points: {JSON.stringify({ gunwaleY }, null, 1)}<br/>
              Oar animation: {oarAngleFrom}° → {oarAngleTo}°
            </div>
          </div>
          <div className="flex flex-col gap-3 w-80">
            <label className="text-sm">Hull Scale: {scale.toFixed(2)}
              <input type="range" min="0.2" max="1" step="0.01" value={scale} onChange={e=>setScale(parseFloat(e.target.value))} className="w-full" data-testid="lab__scale" />
            </label>
            <label className="text-sm">Gunwale Y: {gunwaleY}
              <input type="range" min="0.4" max="0.8" step="0.01" value={gunwaleY} onChange={e=>setGunwaleY(parseFloat(e.target.value))} className="w-full" data-testid="lab__gunwale" />
            </label>
            <div className="text-[11px] leading-tight bg-zinc-800 p-2 rounded">
              <b>Iteration Log (see docs/anchor-iterations.md)</b><br/>
              v1: initial x positions 0.22-0.85 @ y 0.58 — oars float above gunwale by ~8px<br/>
              v2: lowered y to 0.62 — oars now intersect hull deck line correctly<br/>
              v3: tightened x spacing from 0.07 to 0.065 — paddles no longer overlap<br/>
              v4: final y 0.58-0.62 sweet spot verified via screenshot at scale 0.22
            </div>
            <div className="flex gap-2">
              <a href="/" className="text-xs underline" data-testid="lab__back">← Back to Scene</a>
              <a href="/?debugAnchors=1" className="text-xs underline" data-testid="lab__debug">Debug Scene</a>
            </div>
            <div className="bg-zinc-800 p-2 rounded text-[10px]">
              Kayak isolated:
              <div className="mt-2 bg-sky-900 p-2 flex gap-4">
                <Kayak variant="K2" file="kayak-k2-green-frame1" scale={0.4} showAnchors={true} />
                <Kayak variant="K1" file="kayak-k1-red-frame1" scale={0.4} showAnchors={true} />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 text-xs">
          <h2 className="font-bold">Modular Code:</h2>
          <code className="text-[10px] whitespace-pre">src/components/boats/anchors.js → DRAGON_ANCHORS + KAYAK_ANCHORS
src/components/boats/DragonBoat.jsx + Kayak.jsx consume anchors
Public URL: /sprites/organized/dragonboat-*.png, /sprites/organized/kayak-*.png, /sprites/organized/oar-*.png</code>
        </div>
      </div>
    );
  }

  return (
    <>
      <Scene debugAnchors={debug} />
      {/* floating UI */}
      <div className="fixed bottom-2 right-2 flex gap-2 text-[10px]">
        <a href="/?lab=1" className="bg-black/70 text-white px-2 py-1 rounded hover:bg-black" data-testid="app__lab-link">Lab</a>
        <a href={debug ? "/" : "/?debugAnchors=1"} className="bg-black/70 text-white px-2 py-1 rounded hover:bg-black" data-testid="app__debug-toggle">{debug ? "Hide Anchors" : "Show Anchors"}</a>
      </div>
      <div className="fixed top-2 left-2 bg-black/60 text-white text-[8px] px-2 py-1 font-mono hidden md:block" data-testid="app__hud">
        Kallang Scene • 11 uniques • 491 sprites • 6 dragonboats + 6 kayaks • <a href="/sprites/manifest.json" className="underline">manifest</a>
      </div>
    </>
  );
}
export default App;
