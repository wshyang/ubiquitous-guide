from pathlib import Path
import shutil, glob, json

# Mapping for boats: rename key hulls to meaningful names
# Hulls indices 0-17 -> names
hull_names = [
    "dragonboat-red",
    "kayak-k1-red-frame1",
    "kayak-k1-red-frame2",
    "dragonboat-blue",
    "kayak-k1-yellow-frame1",
    "kayak-k1-yellow-frame2",
    "dragonboat-green",
    "kayak-k2-green-frame1",
    "kayak-k2-green-frame2",
    "dragonboat-yellow",
    "kayak-k2-blue-frame1",
    "kayak-k2-blue-frame2",
    "dragonboat-orange",
    "kayak-k3-purple-frame1",
    "kayak-k3-purple-frame2",
    "dragonboat-purple",
    "kayak-k2-orange-frame1",
    "kayak-k3-peach-frame2",
]

# Oars: pick representative vertical oars for dragonboat
# From montage, oar indices 18-27 are wooden vertical variants with slight angles
# Let's map: 21 is clean vertical 34x180, 24 is also 34x180, 29 is 34x189 etc.
# Choose one for each dragonboat colour? But all use same brown wood, so just one.
# Pick boats-021 (34x180) as canonical dragon oar
# Also pick a few angled variants for animation frames: we can use boats-018 (tilted left), 021 (vertical), 025/026 etc.

# Kayak paddles: pick horizontal paddles
# From earlier list: boats-037 180x32, boats-038 178x32, boats-041 178x31, boats-062 178x32 etc.
# These are horizontal paddles. Choose boats-037 as canonical kayak paddle

# Clouds: rename clouds to ordered names already fine, but we can keep generic

# Characters: 74 characters in 6 colours x 12-13 poses
# Indices: 0-11 red, 12-23 blue, 24-35 green, 36-47 yellow, 48-60 orange, 61-73 purple
# But orange/purple have extra running frames (13 vs 12)
# For simplicity keep indices but also create aliases

def copy_with_name(src_pattern, dest_name):
    src = glob.glob(src_pattern)
    if not src:
        print(f"WARN missing {src_pattern}")
        return
    src = src[0]
    dest = Path(f"public/sprites/organized/{dest_name}.png")
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(src, dest)
    print(f"copied {src} -> {dest}")

# Hulls
for idx, name in enumerate(hull_names):
    copy_with_name(f"public/sprites/boats/boats-{idx:03d}-*.png", name)

# Oars - key selections
# Use 5 frames of rowing animation from first oar row
# Indices: check sheet order: first row 12 oars angles from ~30deg to vertical
# Our extracted order for oars is top-to-bottom: after hulls 18-27 are first row? Let's assume 18 is most tilted, 21-23 vertical.
# Let's copy 5 frames:
copy_with_name("public/sprites/boats/boats-018-*.png", "oar-dragon-frame00-tilted")
copy_with_name("public/sprites/boats/boats-020-*.png", "oar-dragon-frame01")
copy_with_name("public/sprites/boats/boats-021-*.png", "oar-dragon-frame02-vertical")
copy_with_name("public/sprites/boats/boats-023-*.png", "oar-dragon-frame03")
copy_with_name("public/sprites/boats/boats-025-*.png", "oar-dragon-frame04")

# Kayak paddles: horizontal and angled
copy_with_name("public/sprites/boats/boats-037-*.png", "paddle-kayak-horizontal-brown")
copy_with_name("public/sprites/boats/boats-039-*.png", "paddle-kayak-diagonal-brown")
copy_with_name("public/sprites/boats/boats-042-*.png", "paddle-kayak-vertical-brown")
copy_with_name("public/sprites/boats/boats-028-*.png", "paddle-kayak-horizontal-light")
# Red/blue/black variants
copy_with_name("public/sprites/boats/boats-038-*.png", "paddle-kayak-horizontal-red")
copy_with_name("public/sprites/boats/boats-054-*.png", "paddle-kayak-horizontal-blue")
copy_with_name("public/sprites/boats/boats-040-*.png", "paddle-kayak-diagonal-red")

# Splashes / wakes
# Look at boats sheet: bottom left has wakes 3? Actually wakes are at bottom of boat sheet: indices after 90? Let's inspect
# We have 91 total, last indices 78-90 include wakes/splashes
# boats-078 104x47 etc are wakes? Hard to map.
# We'll copy couple wakes
copy_with_name("public/sprites/boats/boats-078-*.png", "wake-small-1")
copy_with_name("public/sprites/boats/boats-079-*.png", "wake-small-2")
copy_with_name("public/sprites/boats/boats-080-*.png", "splash-ripple-small")
copy_with_name("public/sprites/boats/boats-081-*.png", "wake-medium")
copy_with_name("public/sprites/boats/boats-085-*.png", "ripple-small")

# Also waterfx sprites (separate sheet) - copy representative
# waterfx-000 etc includes large wakes, splashes
# Let's pick a few
import glob
wakes = glob.glob("public/sprites/waterfx/waterfx-*.png")
print(f"waterfx count {len(wakes)}")
# Copy first 5 wakes (large)
for i in range(min(5, len(wakes))):
    src=wakes[i]
    dest=Path(f"public/sprites/organized/waterfx-{i:03d}.png")
    shutil.copy(src, dest)

# Characters - create aliases per colour
# We'll not copy all 74 but demonstrate
# copy first of each colour
char_map = {
 0:"character-red-front-idle",
 1:"character-red-back",
 2:"character-red-side-right",
 3:"character-red-side-left",
 4:"character-red-run1",
 5:"character-red-run2",
 6:"character-red-cheer-front",
 7:"character-red-cheer-back",
 12:"character-blue-front-idle",
 24:"character-green-front-idle",
 36:"character-yellow-front-idle",
 48:"character-orange-front-idle",
 61:"character-purple-front-idle",
}
for idx,name in char_map.items():
    copy_with_name(f"public/sprites/characters/characters-{idx:03d}-*.png", name)

# Clouds
for i in range(6):
    copy_with_name(f"public/sprites/clouds/clouds-{i:03d}-*.png", f"cloud-small-{i:03d}")
copy_with_name(f"public/sprites/clouds/clouds-014-*.png", "cloud-large-01")
copy_with_name(f"public/sprites/clouds/clouds-015-*.png", "cloud-large-02")

# Props - copy key props
# Props indices: need to map manually
# Based on inspection, props-001 is banner red "PSD ACTIVE DAY", props-004 tents etc.
copy_with_name("public/sprites/props/props-001-*.png", "banner-psd-red")
copy_with_name("public/sprites/props/props-027-*.png", "bunting-triangles")
copy_with_name("public/sprites/props/props-078-*.png", "tent-red-market")
copy_with_name("public/sprites/props/props-079-*.png", "tent-blue-market")
copy_with_name("public/sprites/props/props-080-*.png", "tent-yellow-market")
copy_with_name("public/sprites/props/props-081-*.png", "tent-green-market")
copy_with_name("public/sprites/props/props-089-*.png", "arch-start-finish")
copy_with_name("public/sprites/props/props-092-*.png", "arch-balloon-rainbow")
copy_with_name("public/sprites/props/props-094-*.png", "podium-123")
copy_with_name("public/sprites/props/props-099-*.png", "barrier-metal")

print("Done renaming key sprites")
