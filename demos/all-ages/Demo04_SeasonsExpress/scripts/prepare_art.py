# -*- coding: utf-8 -*-
"""Demo 4 v2: the transforming carriage as layers (DEMO_DESIGN_GUIDE §6.2 strict layers; no video).

  python3 scripts/prepare_art.py

assets/art/car_closed.png (gpt-image-2, windows = flat #00B140) + car_open.png (the same picture, panels flipped open to rune circuits)
  → media/art/car_base.webp          the wooden carriage, window glass keyed to alpha (the seasons are drawn behind it)
  → media/art/car_runes_ice.webp     ONLY the open rune panels / vents (alpha = where open differs from closed), ice-blue glow
  → media/art/car_runes_fire.webp    the same, glow re-coloured orange-red (cold = blue-white, hot = orange-red, §0.1)
  → media/art/frame_glow.webp        a white glow along every window frame edge (the page tints it blue / orange by the thermal output)
  → media/car_geo.js                 window boxes, rune panel boxes (side, hinge) for the flip animation, lamp / screen / hatch positions
assets/art/toys.png → media/art/toy_snowman.webp, toy_sun.webp (green keyed)
"""
import json, os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets", "art"); M = os.path.join(ROOT, "media"); ART = os.path.join(M, "art")
os.makedirs(ART, exist_ok=True)
W, H = 1920, 1080


def green_alpha(rgb):
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    k = g - np.maximum(r, b)                                    # how green (#00B140: r ≈ 0, b ≈ 64 — the mint carpet has r > 100)
    a = 1 - np.clip((k - 40) / 50, 0, 1) * np.clip((110 - r) / 40, 0, 1)   # soft key, only the saturated screen green
    return a


def despill(rgb, a):
    out = rgb.astype(np.float32).copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    lim = np.maximum(r, b); spill = (g > lim) & (a < 1)
    out[..., 1] = np.where(spill, lim, g)
    return out


def components(mask, min_px):
    """connected components (4-neighbour) of a bool mask → list of (x0, y0, x1, y1, n)"""
    from collections import deque
    h, w = mask.shape; seen = np.zeros_like(mask); out = []
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; minx = maxx = x0; miny = maxy = y0; n = 0
        while q:
            y, x = q.popleft(); n += 1
            minx, maxx, miny, maxy = min(minx, x), max(maxx, x), min(miny, y), max(maxy, y)
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not seen[yy, xx]: seen[yy, xx] = True; q.append((yy, xx))
        if n >= min_px: out.append((int(minx), int(miny), int(maxx) + 1, int(maxy) + 1, n))
    return out


def main():
    cl = np.asarray(Image.open(os.path.join(A, "car_closed.png")).convert("RGB").resize((W, H), Image.LANCZOS))
    op = np.asarray(Image.open(os.path.join(A, "car_open.png")).convert("RGB").resize((W, H), Image.LANCZOS))
    a = green_alpha(cl)
    a_img = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.6))
    a = np.asarray(a_img).astype(np.float32) / 255
    base = np.dstack([despill(cl, a), a * 255]).clip(0, 255).astype(np.uint8)
    Image.fromarray(base, "RGBA").save(os.path.join(ART, "car_base.webp"), quality=90, method=5)

    # rune panels = where the opened picture differs from the closed one (outside the green glass)
    d = np.abs(op.astype(np.int16) - cl.astype(np.int16)).sum(2)
    small = Image.fromarray((d > 90).astype(np.uint8) * 255).resize((W // 4, H // 4), Image.BOX)
    m = np.asarray(small) > 70
    m = np.asarray(Image.fromarray(m.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))) > 0
    m &= np.asarray(Image.fromarray((a < .5).astype(np.uint8) * 255).resize((W // 4, H // 4))) < 128   # never on the glass
    boxes = [b for b in components(m, 60)]
    mask = np.zeros((H, W), np.float32)
    panels = []
    for x0, y0, x1, y1, n in boxes:
        X0, Y0, X1, Y1 = x0 * 4 - 4, y0 * 4 - 4, x1 * 4 + 4, y1 * 4 + 4
        X0, Y0, X1, Y1 = max(0, X0), max(0, Y0), min(W, X1), min(H, Y1)
        o_ = op[Y0:Y1, X0:X1].astype(np.int16)   # only the rune plates themselves (navy / cyan: blue > red) — not the re-shaded wood around them
        plate = ((o_[..., 2] - o_[..., 0] > 6) & (d[Y0:Y1, X0:X1] > 40)).astype(np.uint8) * 255
        plate = np.asarray(Image.fromarray(plate).filter(ImageFilter.MinFilter(7)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(3)))   # open (drop thin frame reflections), close holes, 1 px rim
        sub = np.asarray(Image.fromarray(plate).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
        mask[Y0:Y1, X0:X1] = np.maximum(mask[Y0:Y1, X0:X1], sub)
        cx = (X0 + X1) / 2
        kind = "vent" if Y1 < H * .2 and abs(cx - W / 2) < W * .2 else "front" if abs(cx - W / 2) < W * .16 else "wall"
        side = "L" if cx < W / 2 else "R"
        panels.append(dict(box=[X0, Y0, X1, Y1], side=side, kind=kind, hinge="out" if kind == "wall" else "in"))
    mask *= (a > .5)
    # the flipping panels = the plates themselves (tight boxes: squashing a loose box would warp the wood / ceiling around it)
    panels = []
    small = np.asarray(Image.fromarray((mask > .5).astype(np.uint8) * 255).resize((W // 4, H // 4), Image.BOX)) > 100
    for x0, y0, x1, y1, n in components(small, 25):
        X0, Y0, X1, Y1 = max(0, x0 * 4 - 3), max(0, y0 * 4 - 3), min(W, x1 * 4 + 3), min(H, y1 * 4 + 3); cx = (X0 + X1) / 2
        kind = "vent" if Y1 < H * .2 and abs(cx - W / 2) < W * .2 else "front" if abs(cx - W / 2) < W * .16 else "wall"
        panels.append(dict(box=[X0, Y0, X1, Y1], side="L" if cx < W / 2 else "R", kind=kind, hinge="out" if kind == "wall" else "in"))
    panels.sort(key=lambda p: (p["side"], -abs((p["box"][0] + p["box"][2]) / 2 - W / 2)))   # outer (near you) first

    # rune layers: ice = as drawn (cyan-white glow), fire = the glow re-coloured orange-red, both premultiplied by the panel mask
    opf = op.astype(np.float32)
    r_, g_, b_ = opf[..., 0], opf[..., 1], opf[..., 2]; lum = opf.max(2)
    blue = np.clip((b_ - r_ - 8) / 40, 0, 1)                                   # the navy rune plates and the cyan lines (wood is r > b)
    glow = np.clip((lum - 110) / 90, 0, 1) * np.clip((b_ - r_ + 30) / 60, 0, 1)  # bright cyan / white rune light
    ice = opf * (1 - .3 * glow[..., None]) + np.array([215, 245, 255]) * .3 * glow[..., None]
    tl = np.clip((lum - 140) / 115, 0, 1)
    hot = np.stack([255 * np.ones_like(lum), 110 + 140 * tl, 35 + 180 * tl ** 2], 2)
    plate = np.stack([lum * .55 + 20, lum * .22 + 8, lum * .14 + 6], 2)          # navy plate → dark ember red
    fire = opf * (1 - blue[..., None]) + plate * blue[..., None]
    fire = fire * (1 - glow[..., None]) + hot * glow[..., None]
    for name, img in (("car_runes_ice", ice), ("car_runes_fire", fire)):
        Image.fromarray(np.dstack([img.clip(0, 255), mask * 255]).astype(np.uint8), "RGBA").save(os.path.join(ART, name + ".webp"), quality=90, method=5)
    Image.fromarray(np.dstack([np.full((H, W, 3), 255, np.uint8), (glow * mask * 255).astype(np.uint8)]), "RGBA").save(os.path.join(ART, "runes_glow.webp"), quality=88, method=5)

    # window frame glow: a soft band just outside every glass edge
    glass = Image.fromarray(((a < .5) * 255).astype(np.uint8))
    ring = np.asarray(glass.filter(ImageFilter.MaxFilter(21))).astype(np.float32) - np.asarray(glass).astype(np.float32)
    ring = np.asarray(Image.fromarray(ring.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))).astype(np.float32)
    Image.fromarray(np.dstack([np.full((H, W, 3), 255, np.uint8), ring.clip(0, 255).astype(np.uint8)]), "RGBA").save(os.path.join(ART, "frame_glow.webp"), quality=88, method=5)

    # window boxes per side (the scenery is drawn inside them)
    g = a < .5
    win = []
    for x0, y0, x1, y1, n in components(np.asarray(Image.fromarray(g.astype(np.uint8) * 255).resize((W // 4, H // 4))) > 128, 40):
        win.append(dict(box=[x0 * 4, y0 * 4, x1 * 4, y1 * 4], side="L" if (x0 + x1) * 2 < W / 2 else "R"))
    geo = dict(size=[W, H], eye=round(H * .545), panels=panels, windows=win,
               screen=[640, 213, 1530 - 640, 413 - 213], lamp=[148, 470],
               door_glass=[1280, 619, 52])
    # positions measured on the 2560×1440 source, converted to 1920×1080
    k = W / 2560
    geo["screen"] = [round(1069 * k), round(222 * k), round((1525 - 1069) * k), round((413 - 222) * k)]
    geo["lamp"] = [round(150 * k), round(470 * k)]
    geo["hatches"] = [[round(476 * k), round(80 * k)], [round(2093 * k), round(80 * k)]]
    geo["door_glass"] = [round(1280 * k), round(622 * k), round(46 * k)]
    with open(os.path.join(M, "car_geo.js"), "w") as f:
        f.write("// generated by scripts/prepare_art.py — do not edit\nwindow.D04_GEO = "); json.dump(geo, f, separators=(",", ":")); f.write(";\n")
    print(f"panels {len(panels)}: " + ", ".join(f"{p['side']}{p['kind'][0]}{p['box']}" for p in panels))
    print(f"windows {len(win)}")

    # toys: two sprites from one green sheet
    t = np.asarray(Image.open(os.path.join(A, "toys.png")).convert("RGB"))
    ta = green_alpha(t); tr = np.dstack([despill(t, ta), ta * 255]).clip(0, 255).astype(np.uint8)
    cols = np.nonzero((ta > .5).any(0))[0]; mid = t.shape[1] // 2
    for name, (c0, c1) in (("toy_snowman", (0, mid)), ("toy_sun", (mid, t.shape[1]))):
        sub = tr[:, c0:c1]; ys, xs = np.nonzero(sub[..., 3] > 20)
        im = Image.fromarray(sub[ys.min():ys.max() + 1, xs.min():xs.max() + 1], "RGBA"); im.thumbnail((400, 400))
        im.save(os.path.join(ART, name + ".webp"), quality=90)

    # the tea cup on its own (it can be lifted in the winter gate), the snow globe + book as the rest of the table props
    tp = Image.open(os.path.join(ROOT, "assets", "train_interior", "table_props.png")).convert("RGBA")
    tp.crop((0, 190, 560, 725)).save(os.path.join(ART, "tea_cup.webp"), quality=90)
    rest = tp.copy(); rest.paste((0, 0, 0, 0), (0, 0, 560, 725)); rest.crop((440, 150, 1024, 1024)).save(os.path.join(ART, "props_rest.webp"), quality=90)


if __name__ == "__main__":
    main()
