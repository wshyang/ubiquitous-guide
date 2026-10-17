# Dedup Report

## Source File Inventory (13 files in repo root at e0a1ab3)

| Original Filename | SHA256 | Status |
|---|---|---|
| Gemini_Generated_Image_1t2nkv1t2nkv1t2n.jpeg | c5dc3081122cb6634cab965c494f4f667e0638a64ec824be2d7585e422743d41 | KEEP |
| Gemini_Generated_Image_1t2nkv1t2nkv1t2n (1).jpeg | c5dc3081122cb6634cab965c494f4f667e0638a64ec824be2d7585e422743d41 | DUPLICATE — removed (byte-identical to above) |
| Gemini_Generated_Image_2jlj7b2jlj7b2jlj.jpeg | be1544b902071fc680b66ac06a918c78d7de303e6473e4ac54cec58fe4708ab3 | KEEP |
| Gemini_Generated_Image_3opyjq3opyjq3opy.jpeg | 0c480ac2819a5503e3098be1bdad6c73b5d4b6c6f82f795d1475668c87a0ffba | KEEP |
| Gemini_Generated_Image_7cr2ov7cr2ov7cr2.jpeg | 91a865632da6dc31afc5b6450d77eaa2d0bc4bf105079667f134e0a241f1a340 | KEEP |
| Gemini_Generated_Image_7x6cuk7x6cuk7x6c.jpeg | 5c1906f69b2691315be4d278a991a5e83363d355509ff71f91ff79fe0c1623a4 | KEEP |
| Gemini_Generated_Image_aoywriaoywriaoyw.jpeg | 746f6f614beea8de6c38fa9adc5b245314bcfd2bf4f0e2c810d1a74225cb5021 | KEEP |
| Gemini_Generated_Image_n64hnkn64hnkn64h.jpeg | 24f6dfc5e8e4a304a5d5ca64ed138ed942be20fe6d9c4ae31dcf0d5893f5db31 | KEEP |
| Gemini_Generated_Image_n64hnkn64hnkn64h (1).jpeg | 24f6dfc5e8e4a304a5d5ca64ed138ed942be20fe6d9c4ae31dcf0d5893f5db31 | DUPLICATE — removed |
| Gemini_Generated_Image_on5iyhon5iyhon5i.jpeg | 24182c9b506ceceac9a01abc7af6d995504d26071111a08b94263e843dab6adb | KEEP |
| Gemini_Generated_Image_v7m2evv7m2evv7m2.jpeg | 07c0ff32161710da2439fb71e5c53912e0c13931c2aa8404e41f586803ea0a21 | KEEP |
| Gemini_Generated_Image_wiwaelwiwaelwiwa.jpeg | 76a011031deb6c1d74b90c17230985106be4dea3309a8f2b81cf8803461a1315 | KEEP |
| SportsHub.png | 6c8f2cdfa8adad86beffcea7bc64ceed427b16cc09a443acf82b004daccb0f33 | KEEP |

**Result:** 11 unique files retained (13 − 2 duplicates = 11 uniques).
All uniques verified via SHA256; no perceptual near-duplicates detected beyond the two byte-identical pairs. Visual inspection confirms 3 variant Kallang backdrops are intentionally distinct (different lighting/angle/crowd density) — not dedup candidates.

## Filing into /src/images with Meaningful Filenames

| New Filename | Category | Content Description | Source |
|---|---|---|---|
| backdrop-kallang-sunset-magenta-01.jpg | BACKDROP | Wide Kallang stadium, magenta-pink sunset, orange gradient, waterfront boardwalk, Tennis courts on right | ex 1t2nkv |
| backdrop-kallang-daytime-turquoise.jpg | BACKDROP | Alternate angle, turquoise water sparkles, blue-purple sky with clouds, more foreground greenery | ex 2jlj7b |
| backdrop-kallang-sunset-orange-02.jpg | BACKDROP | Same stadium different crop/exposure, stronger orange sunset band, waterfront pier prominent | ex 7x6cuk |
| backdrop-kallang-populated-crowded-day.jpg | BACKDROP | Daytime variant with hundreds of tiny people populating promenade, boats in water — ideal as "populated reference" | ex on5iyh |
| backdrop-sky-gradient-blue.jpg | BACKDROP | Pure sky gradient (no stadium) — used as sky fill / parallax layer | ex wiwael |
| sprites-characters-6colours-magenta.jpg | SPRITE_SHEET | 6 colourways (red/blue/green/yellow/orange/purple) × 12-13 poses: idle 4-dir, run 2, cheer, punch etc. Magenta backing | ex 3opyjq |
| sprites-boats-dragon-kayak-oars-water.jpg | SPRITE_SHEET | 6 dragonboats (8-paddlers+drummer) + 12 kayaks (K1/K2/K3) + 3×12 loose oars + paddle variants + 7 wake splashes | ex 7cr2ov |
| sprites-clouds-varied-magenta.jpg | SPRITE_SHEET | 14 small cumulus + 4 large cumulus + 2 extra-large + 5 wispy streaks + ~10 scattered wisps. Magenta backing | ex aoywri |
| sprites-water-wake-splash-ripple-props.jpg | SPRITE_SHEET | 4 water wakes + 5 splash crowns + 6 ripples + 6 oar-splash combos + festive props? Actually this is v7m2ev: water-focused | ex v7m2ev |
| sprites-event-props-banners-tents-podiums.jpg | SPRITE_SHEET | PSD ACTIVE DAY banners (8 variants), bunting, market tents 12 variants, START/FINISH arch, balloon arches, trophies, cones, barriers etc. Top section is water effects (5 wakes + oar splashes + ripples) | ex n64hnk |
| reference-photo-sportshub-real.png | REFERENCE | Photographic Sports Hub, for visual fidelity comparison, not cut for animation | ex SportsHub.png |

All original Gemini_* files remain git-tracked at root for provenance but canonical source is src/images; extraction script reads only src/images.

## Uniqueness Guarantee
- SHA256 dedup guarantees byte-level uniqueness.
- Perceptual dedup: visual inspection confirms no perceptual duplicates beyond byte-identical pairs. The 3 Kallang backdrops are intentionally variant (different time-of-day, crowd density, camera angle) and retained.
- Public URL manifest: each src/images file served at /images/<filename> via Vite public copy.

## Update 2026-10-17 — Merged origin/main 357c3fb (8 new sky/backdrop variants)
New files: `backdrop dawn (sky corruption).jpeg`, `backdrop day.jpeg`, `backdrop dusk.jpeg`, `sky afternoon/dusk/early morning/late afternoon/late morning.jpeg`, plus duplicate `Gemini_dsa34fdsa34fdsa3 (1).jpeg` (hash identical to `backdrop day.jpeg` → deduped).

Filed:
- `backdrop-kallang-dawn-corrupted.jpg` (sky corruption artefact, retained for reference)
- `backdrop-kallang-day-02.jpg` (day variant, deduped from duplicate)
- `backdrop-kallang-dusk-02.jpg`
- `sky-afternoon.jpg`, `sky-dusk.jpg`, `sky-early-morning.jpg`, `sky-late-afternoon.jpg`, `sky-late-morning.jpg`

Total uniques now 19 (11 + 8 new) in `src/images/`, all publicly at `/images/*`.
