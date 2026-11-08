#!/usr/bin/env python3
"""Recolour a coloured rim light baked into a pose (e.g. the arcade's cyan neon on Demo18 Hinata) for views whose plate has no such light.

  python3 tools/art/recolor_rim.py <demo> <pose> --to R,G,B [--hue 165-215] [--band 44] [--strength 1] [--dry]

The art generator painted the rim INTO the picture, so this is not a key fringe (clean_cutout.py cannot remove it). Only pixels
within --band px of the character's outline whose hue is in --hue (degrees) and that are clearly coloured are changed: their
brightness stays, their colour moves to --to (the scene's light). Works on media/art/char_<pose>.webp and, with the same mask,
on the flat stills of every view that uses the pose (placement maths of build_stage.py). No redraw, no new pixels elsewhere.
Writes <demo>/assets/patch_check/rim_<pose>.png (before | after on a dark plate, 2x around the strongest band) to look at.
"""
import argparse, colorsys, json, os
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument("demo"); ap.add_argument("pose"); ap.add_argument("--to", required=True)
ap.add_argument("--hue", default="165-215"); ap.add_argument("--band", type=int, default=44); ap.add_argument("--strength", type=float, default=1.)
ap.add_argument("--dry", action="store_true"); ap.add_argument("--minsat", type=float, default=.22)
a = ap.parse_args()
D = os.path.abspath(a.demo); ART = os.path.join(D, "media", "art")
to = np.array([float(v) for v in a.to.split(",")], np.float32); h0, h1 = (float(v) for v in a.hue.split("-"))
t = open(os.path.join(D, "media", "layers.js")).read(); views = json.loads(t[t.index("{"):t.rindex("}") + 1])["views"]


def mask_for(rgba, band):
    rgb = rgba[..., :3].astype(np.float32) / 255; al = rgba[..., 3].astype(np.float32) / 255
    mx, mn = rgb.max(2), rgb.min(2); sat = (mx - mn) / np.maximum(mx, 1e-4)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]; d = np.maximum(mx - mn, 1e-4)
    hue = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    inside = Image.fromarray(((al > .5) * 255).astype(np.uint8))
    near = np.asarray(inside.filter(ImageFilter.MinFilter(band | 1)), np.float32) < 128   # within `band` px of the outline
    m = (hue >= h0) & (hue <= h1) & (sat > a.minsat) & (al > .02) & near
    soft = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255
    return np.clip(soft * 1.4, 0, 1) * np.clip((sat - a.minsat + .1) / .2, 0, 1)


def recolor(rgb, m):
    """brightness kept, colour → the scene light"""
    lum = (rgb * np.array([.299, .587, .114], np.float32)).sum(2)
    tl = float(to @ np.array([.299, .587, .114], np.float32)); new = np.clip(to[None, None] * (lum / max(tl, 1))[..., None], 0, 255)
    return rgb + (new - rgb) * (m * a.strength)[..., None]


cp = os.path.join(ART, f"char_{a.pose}.webp"); ch = np.asarray(Image.open(cp).convert("RGBA")).copy()
m = mask_for(ch, a.band); out = ch.copy(); out[..., :3] = np.clip(recolor(ch[..., :3].astype(np.float32), m), 0, 255).astype(np.uint8)
print(f"char_{a.pose}: {int((m > .3).sum())} px recoloured to {a.to}")
# check sheet: the column of the strongest band, before | after on a dark plate, 2x
ys, xs = np.where(m > .3)
if len(ys):
    cy, cx = int(np.median(ys)), int(np.median(xs)); r = 160
    box = (max(0, cx - r), max(0, cy - r), min(ch.shape[1], cx + r), min(ch.shape[0], cy + r)); tiles = []
    for im in (ch, out):
        bg = Image.new("RGBA", (box[2] - box[0], box[3] - box[1]), (20, 24, 40, 255)); bg.alpha_composite(Image.fromarray(im).crop(box)); tiles.append(bg.convert("RGB").resize((bg.width * 2, bg.height * 2)))
    sheet = Image.new("RGB", (tiles[0].width * 2 + 10, tiles[0].height)); sheet.paste(tiles[0], (0, 0)); sheet.paste(tiles[1], (tiles[0].width + 10, 0))
    os.makedirs(os.path.join(D, "assets", "patch_check"), exist_ok=True); sheet.save(os.path.join(D, "assets", "patch_check", f"rim_{a.pose}.png"))
if a.dry: raise SystemExit(0)
Image.fromarray(out).save(cp, quality=88, method=6)
# the flat stills of the views drawing this pose: the same change, placed with build_stage's maths
FW, FH = 1920, 1080
for stem, v in views.items():
    c = v["char"]
    if f"char_{a.pose}." not in c["src"]: continue
    sp = next((os.path.join(ART, stem + e) for e in (".jpg", ".webp", ".png") if os.path.exists(os.path.join(ART, stem + e))), None)
    if not sp: continue
    st = Image.open(sp).convert("RGB"); sc = st.width / FW
    hpx = c["height"] * FH * sc; wpx = hpx * c["w"] / c["h"]; x0, y0 = round(c["x"] * FW * sc - wpx / 2), round(c["y"] * FH * sc - hpx)
    mm = Image.fromarray((m * ch[..., 3] / 255 * 255).astype(np.uint8)).resize((round(wpx), round(hpx)), Image.LANCZOS)
    full = Image.new("L", st.size, 0); full.paste(mm, (x0, y0)); M = np.asarray(full, np.float32) / 255
    arr = np.asarray(st, np.float32); res = recolor(arr, M)
    Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(sp, quality=88)
    print(f"still {os.path.basename(sp)}: same change")
# the page fetches char_<pose>.webp?v=<content hash>: refresh that hash in media/layers.js
import hashlib, re
lj = os.path.join(D, "media", "layers.js"); txt = open(lj).read(); hv = hashlib.md5(open(cp, "rb").read()).hexdigest()[:8]
open(lj, "w").write(re.sub(rf"(art/char_{re.escape(a.pose)}\.webp)\?v=[0-9a-f]+", rf"\1?v={hv}", txt)); print(f"media/layers.js: char_{a.pose}.webp?v={hv}")
