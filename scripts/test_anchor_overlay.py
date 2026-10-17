#!/usr/bin/env python3
"""
Anchor overlay tester — synthesizes composite hull+oars at current anchor config
for iterative calibration without needing browser screenshot.
"""
from PIL import Image
import pathlib, json

# Load anchor config from JS file by manual parse (simple)
# We will hardcode current values from anchors.js
DRAGON_HULL = pathlib.Path("public/sprites/organized/dragonboat-red.png")
OAR = pathlib.Path("public/sprites/organized/oar-dragon-frame02-vertical.png")
KAYAK_HULL = pathlib.Path("public/sprites/organized/kayak-k2-green-frame1.png")
PADDLE = pathlib.Path("public/sprites/organized/paddle-kayak-horizontal-brown.png")

DRAGON_ANCHORS = [
    (0.22, 0.58),
    (0.29, 0.58),
    (0.36, 0.58),
    (0.43, 0.58),
    (0.50, 0.58),
    (0.57, 0.58),
    (0.64, 0.58),
    (0.71, 0.58),
    (0.78, 0.58),
    (0.85, 0.58),
]

KAYAK_COCKPITS = [(0.32,0.55),(0.68,0.55)]

def composite_dragon(scale=0.5, y_offset=0.58, angle=-28, out="/tmp/dragon_composite.png"):
    hull = Image.open(DRAGON_HULL).convert("RGBA")
    oar = Image.open(OAR).convert("RGBA")
    # scale hull
    w,h = hull.size
    new_w, new_h = int(w*scale), int(h*scale)
    hull = hull.resize((new_w,new_h), Image.NEAREST)
    # oar scaled
    ow, oh = oar.size
    oar_scale = scale*0.7
    oar = oar.resize((int(ow*oar_scale), int(oh*oar_scale)), Image.NEAREST)
    # create canvas
    canvas_w = new_w + 100
    canvas_h = new_h + 150
    canvas = Image.new("RGBA", (canvas_w, canvas_h), (0,160,200,255))  # water color
    # paste hull centered
    hull_x = 50
    hull_y = 50
    canvas.paste(hull, (hull_x, hull_y), hull)
    # overlay oars at anchors
    for (ax,ay) in DRAGON_ANCHORS:
        ax = ax  # x remains
        ay = y_offset  # override y for testing
        px = hull_x + int(ax * new_w)
        py = hull_y + int(ay * new_h)
        # oar pivot at top-center (0.5,0.15)
        pivot_x = 0.5 * oar.width
        pivot_y = 0.15 * oar.height
        # rotate oar around pivot by angle
        # PIL rotate around center, so we need to translate
        # Create expanded image for rotation to avoid clipping
        # For simplicity, rotate and calculate offset
        oar_rot = oar.rotate(-angle, resample=Image.NEAREST, expand=True)
        # pivot after rotation: need to compute offset
        # Approx: place such that pivot aligns to (px,py)
        # oar_rot size may be larger, center is approx pivot after rotation?
        # Simple: place by using pivot as center: oar center = pivot
        # After rotate expand, pivot moves; but we approximate by placing oar_rot centered at pivot
        ox = px - oar_rot.width//2
        oy = py - int(pivot_y)  # not perfect but close
        # Better: compute pivot offset in rotated image: original pivot vector from center
        # For now use simple
        canvas.paste(oar_rot, (ox, oy), oar_rot)
        # draw anchor dot
        dot = Image.new("RGBA",(6,6),(255,0,0,255))
        canvas.paste(dot, (px-3, py-3), dot)
    canvas = canvas.resize((canvas_w*2, canvas_h*2), Image.NEAREST)  # upscale for viewing
    canvas.save(out)
    print(f"saved {out} y_offset={y_offset} angle={angle}")

def composite_kayak(scale=0.5, out="/tmp/kayak_composite.png"):
    hull = Image.open(KAYAK_HULL).convert("RGBA")
    paddle = Image.open(PADDLE).convert("RGBA")
    w,h = hull.size
    new_w, new_h = int(w*scale), int(h*scale)
    hull = hull.resize((new_w,new_h), Image.NEAREST)
    pw, ph = paddle.size
    paddle = paddle.resize((int(pw*scale*0.6), int(ph*scale*0.6)), Image.NEAREST)
    canvas_w = new_w + 100
    canvas_h = new_h + 80
    canvas = Image.new("RGBA",(canvas_w, canvas_h),(0,160,200,255))
    hull_x=50
    hull_y=30
    canvas.paste(hull,(hull_x,hull_y),hull)
    for (ax,ay) in KAYAK_COCKPITS:
        px = hull_x + int(ax*new_w)
        py = hull_y + int(ay*new_h)
        # paddle center pivot
        pr = paddle.rotate(30, resample=Image.NEAREST, expand=True)
        ox = px - pr.width//2
        oy = py - pr.height//2
        canvas.paste(pr,(ox,oy),pr)
        dot=Image.new("RGBA",(6,6),(0,255,255,255))
        canvas.paste(dot,(px-3,py-3),dot)
    canvas = canvas.resize((canvas_w*2, canvas_h*2), Image.NEAREST)
    canvas.save(out)
    print(f"saved {out}")

# Iteration 1: initial y 0.58
composite_dragon(scale=0.5, y_offset=0.58, angle=-28, out="/tmp/dragon_v1.png")
composite_dragon(scale=0.5, y_offset=0.62, angle=-28, out="/tmp/dragon_v2.png")
composite_dragon(scale=0.5, y_offset=0.62, angle=22, out="/tmp/dragon_v3.png")
composite_kayak(scale=0.6, out="/tmp/kayak_v1.png")
print("done")
