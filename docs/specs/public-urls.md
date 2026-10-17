# Public URL Paths

All extracted pieces are filed into publicly accessible URL paths via Vite `public/` → site root.

## Originals (src/images → public/images)
- /images/backdrop-kallang-sunset-magenta-01.jpg
- /images/backdrop-kallang-daytime-turquoise.jpg
- /images/backdrop-kallang-sunset-orange-02.jpg
- /images/backdrop-kallang-populated-crowded-day.jpg
- /images/backdrop-sky-gradient-blue.jpg
- /images/reference-photo-sportshub-real.png
- /images/sprites-characters-6colours-magenta.jpg
- /images/sprites-boats-dragon-kayak-oars-water.jpg
- /images/sprites-clouds-varied-magenta.jpg
- /images/sprites-event-props-banners-tents-podiums.jpg
- /images/sprites-water-wake-splash-ripple-props.jpg

## Extracted Sprites (public/sprites)
- /sprites/manifest.json — 491 entries with bbox/size/file
- /sprites/characters/characters-000-*.png … 073 (74)
- /sprites/boats/boats-000-*.png … 090 (91)
- /sprites/clouds/clouds-000-*.png … 034 (35)
- /sprites/waterfx/waterfx-000-*.png … 178 (179)
- /sprites/props/props-000-*.png … 111 (112)

## Organized Semantic Aliases (public/sprites/organized)
- /sprites/organized/dragonboat-red.png … purple (6)
- /sprites/organized/kayak-k1-red-frame1.png … k3-peach (12 inc frames)
- /sprites/organized/oar-dragon-frame*.png (5)
- /sprites/organized/paddle-kayak-*.png (7)
- /sprites/organized/wake-*.png, ripple-*, splash-* (5)
- /sprites/organized/character-*.png (12)
- /sprites/organized/cloud-*.png (8)
- /sprites/organized/banner-*, bunting-*, tent-*, arch-*, podium-*, barrier-* (9)

Total 71 semantic aliases for animation use.

All paths are static, cacheable, served at site root on both dev (`vite dev`) and prod (`vite build` → `dist/` → nginx).
