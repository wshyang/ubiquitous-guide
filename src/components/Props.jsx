import React from 'react';

export function PropsLayer() {
  return (
    <div className="absolute bottom-[42%] left-0 right-0 h-[12%] pointer-events-none" data-testid="props__layer">
      {/* Bunting */}
      <img
        src="/sprites/organized/bunting-triangles.png"
        alt="bunting"
        className="absolute left-[5%] bottom-[65%] w-[30%] pixelated"
        data-testid="props__bunting"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Banner */}
      <img
        src="/sprites/organized/banner-psd-red.png"
        alt="banner"
        className="absolute left-[8%] bottom-[45%] w-[22%] pixelated"
        data-testid="props__banner"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Tents */}
      <div className="absolute left-[38%] bottom-[10%] flex gap-1">
        {['red','blue','yellow','green'].map(c=>(
          <img key={c} src={`/sprites/organized/tent-${c}-market.png`} alt={`tent ${c}`} className="w-20 pixelated" data-testid={`props__tent-${c}`} style={{imageRendering:'pixelated'}} />
        ))}
      </div>
      {/* Start/Finish Arch */}
      <img
        src="/sprites/organized/arch-start-finish.png"
        alt="arch start finish"
        className="absolute left-[62%] bottom-[15%] w-[18%] pixelated"
        data-testid="props__arch-start"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Balloon arch */}
      <img
        src="/sprites/organized/arch-balloon-rainbow.png"
        alt="balloon arch"
        className="absolute left-[80%] bottom-[20%] w-[14%] pixelated"
        data-testid="props__arch-balloon"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Podium */}
      <img
        src="/sprites/organized/podium-123.png"
        alt="podium"
        className="absolute left-[70%] bottom-[5%] w-16 pixelated"
        data-testid="props__podium"
        style={{ imageRendering: 'pixelated' }}
      />
      {/* Barrier */}
      <img
        src="/sprites/organized/barrier-metal.png"
        alt="barrier"
        className="absolute left-[2%] bottom-[5%] w-24 pixelated"
        data-testid="props__barrier"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}
export default PropsLayer;
