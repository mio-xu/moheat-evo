"""Face patches from expression variants (the grandparents-call method, packaged for every demo — DEMO_DESIGN_GUIDE §6.2).

A pose is drawn once (the base); its expression variants (mouth open, eyes closed, …) are image-to-image edits of that base.
Each variant differs a little everywhere (hair strands, colour), so whole-frame swaps make the face jump. This takes only the part
that is meant to change: it finds where the variant differs most from the base (or uses a given centre), aligns the variant to the
base on that region alone (±48 px, ±5 % scale), and cuts a feathered ellipse. The page draws the base and fades the patches.

  python3 tools/art/face_patches.py <demo folder>              # reads <demo>/project/patches.json
  python3 tools/art/face_patches.py <demo folder> --preview    # also writes <demo>/assets/patches_preview.jpg (check before use)

project/patches.json:
  { "src": "assets/art", "dst": "media/art", "size": [1920, 1080], "var": "MOHEAT_PATCHES",
    "patches": [ { "name": "gaku_live_mouth", "base": "gaku_live", "frame": "gaku_live_talk" },
                 { "name": "gaku_live_eyes",  "base": "gaku_live", "frame": "gaku_live_blink", "centre": [960, 300] } ] }
  optional per patch: "kind": "mouth" | "eyes" (default from the name: eye / blink → eyes; eyes = the two strongest areas),
                      "near": [x, y] (search only ±260 px around it), "centre": [x, y] + "radius": [rx, ry] (skip the search), "tilt": deg, "pad": 1.3 (ellipse margin)
  Source images: <src>/<name>.png (any size, resized to "size"; bases may be RGBA — the patch keeps the base's alpha).
Writes <dst>/<patch name>.webp and <dst>/patches.js: window.<var> = { name: [x, y, w, h] } (top-left + size in "size" pixels).
Needs only Pillow + numpy (system python3).
"""
import argparse, json, math, os
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument("demo"); ap.add_argument("--preview", action="store_true")
a = ap.parse_args()
D = os.path.abspath(a.demo)
cfg = json.load(open(os.path.join(D, "project", "patches.json")))
SRC, DST = os.path.join(D, cfg.get("src", "assets/art")), os.path.join(D, cfg.get("dst", "media/art"))
W, H = cfg.get("size", [1920, 1080])
os.makedirs(DST, exist_ok=True)
_cache = {}


def load(n):
    if n not in _cache:
        _cache[n] = Image.open(os.path.join(SRC, n + ".png")).convert("RGBA").resize((W, H), Image.LANCZOS)
    return _cache[n]


def gray(im, k=1):
    g = im.convert("L")
    return np.asarray(g.resize((W // k, H // k), Image.BILINEAR) if k > 1 else g, np.float32)


def search(base, frame, box, scales, offs, k=1):
    """best (mean abs diff, scale, dx, dy): frame scaled by s and shifted so it matches base inside box."""
    B = gray(base, k); bx = [v // k for v in box]; ref = B[bx[1]:bx[3], bx[0]:bx[2]]
    best = None
    for s in scales:
        f = frame.convert("L").resize((round(W / k * s), round(H / k * s)), Image.BILINEAR)
        F = np.asarray(f, np.float32); pad = 80 // k
        G = np.full((F.shape[0] + 2 * pad, F.shape[1] + 2 * pad), 128, np.float32); G[pad:pad + F.shape[0], pad:pad + F.shape[1]] = F
        for dy, dx in offs:
            x0, y0 = bx[0] + dx // k + pad, bx[1] + dy // k + pad
            if x0 < 0 or y0 < 0 or x0 + ref.shape[1] > G.shape[1] or y0 + ref.shape[0] > G.shape[0]: continue
            d = float(np.mean(np.abs(G[y0:y0 + ref.shape[0], x0:x0 + ref.shape[1]] - ref)))
            if best is None or d < best[0]: best = (d, s, dx, dy)
    return best


def warp(frame, s, dx, dy):
    f = frame.resize((round(W * s), round(H * s)), Image.LANCZOS)
    c = Image.new("RGBA", (W, H), (0, 0, 0, 0)); c.paste(f, (-dx, -dy), f); return c


def align(base, frame, box):
    grid = lambda r, st, c=(0, 0): [(c[0] + y, c[1] + x) for y in range(-r, r + 1, st) for x in range(-r, r + 1, st)]
    _, s0, dx0, dy0 = search(base, frame, box, [.95 + i * .01 for i in range(11)], grid(48, 4), k=2)
    best = search(base, frame, box, [s0 - .005, s0, s0 + .005], grid(4, 1, (dy0, dx0)))
    return best


def align_global(base, frame):
    """whole-picture alignment, wide range: an edit can come back zoomed (Demo15: 0.945) or shifted."""
    box = (W // 8, H // 8, W * 7 // 8, H * 7 // 8)
    grid = lambda r, st, c=(0, 0): [(c[0] + y, c[1] + x) for y in range(-r, r + 1, st) for x in range(-r, r + 1, st)]
    _, s0, dx0, dy0 = search(base, frame, box, [.86 + i * .02 for i in range(15)], grid(120, 8), k=4)
    _, s1, dx1, dy1 = search(base, frame, box, [s0 - .01, s0 - .005, s0, s0 + .005, s0 + .01], grid(10, 2, (dy0, dx0)), k=2)
    return s1, dx1, dy1


def blobs(mask):
    """connected areas of a small boolean grid (4-neighbour flood fill) → list of index arrays."""
    seen = np.zeros_like(mask, bool); out = []
    for y0, x0 in zip(*np.where(mask)):
        if seen[y0, x0]: continue
        stack, pts = [(y0, x0)], []; seen[y0, x0] = True
        while stack:
            y, x = stack.pop(); pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < mask.shape[0] and 0 <= xx < mask.shape[1] and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; stack.append((yy, xx))
        out.append(np.array(pts))
    return out


def changed_regions(base, frame, kind="mouth", near=None):
    """where the variant was meant to change, after global alignment: the strongest separate area(s) of difference —
    one for a mouth, the two strongest close together for eyes (other people's faces / stray strands are left out).
    Returns [(cx, cy, rx, ry), …] in full-size pixels."""
    if near:   # align on the area around the hint (an edit may redraw / shift the whole head: align the face there, not the picture)
        r = 220; box = (max(0, near[0] - r), max(0, near[1] - r), min(W, near[0] + r), min(H, near[1] + r))
        grid = lambda rr, st, c=(0, 0): [(c[0] + y, c[1] + x) for y in range(-rr, rr + 1, st) for x in range(-rr, rr + 1, st)]
        _, s0, dx0, dy0 = search(base, frame, box, [.92 + i * .02 for i in range(9)], grid(72, 4), k=2)
        _, s, dx, dy = search(base, frame, box, [s0 - .01, s0 - .005, s0, s0 + .005, s0 + .01], grid(4, 1, (dy0, dx0)))
    else:
        s, dx, dy = align_global(base, frame)
    f = warp(frame, s, dx, dy)
    d = np.asarray(ImageChops.difference(base.convert("RGB"), f.convert("RGB")).convert("L"), np.float32)
    d[np.asarray(f.getchannel("A")) < 250] = 0; d[np.asarray(base.getchannel("A")) < 250] = 0
    d = np.where(d > 18, d, 0)                                          # drop colour drift / jpeg noise
    if near:   # and only near it
        mm = np.zeros_like(d); r = 200; mm[max(0, near[1] - r):near[1] + r, max(0, near[0] - r):near[0] + r] = 1; d *= mm
    k = 4; small = Image.fromarray(np.clip(d, 0, 255).astype(np.uint8)).resize((W // k, H // k), Image.BOX)
    dens = np.asarray(small.filter(ImageFilter.GaussianBlur(14 / k)), np.float32)
    if near:   # only look around a rough position (a zoomed edit can differ strongly elsewhere)
        m = np.zeros_like(dens); r = 260 // k; nx, ny = near[0] // k, near[1] // k
        m[max(0, ny - r):ny + r, max(0, nx - r):nx + r] = 1; dens = dens * m
    areas = sorted(blobs(dens > dens.max() * .35), key=lambda b: -dens[b[:, 0], b[:, 1]].sum())
    pick = areas[:1]
    if kind == "eyes" and len(areas) > 1:
        a0 = areas[0]; c0 = a0.mean(0)
        # the second eye: the strongest other area at about the same height and an eye's distance away (it may change less —
        # half hidden by the fringe — so a low share of the first one's change is enough)
        for a1 in areas[1:6]:
            c1 = a1.mean(0); dy, dx = abs(c0[0] - c1[0]) * k, abs(c0[1] - c1[1]) * k
            if dens[a1[:, 0], a1[:, 1]].sum() > .1 * dens[a0[:, 0], a0[:, 1]].sum() and dy < max(160, .8 * dx) and 60 < dx < 600:   # a tilted head: the eyes can sit at very different heights
                pick = [a0, a1]; break
    out = []
    for b in pick:
        ys, xs = b[:, 0], b[:, 1]
        out.append((int((xs.min() + xs.max()) / 2 * k), int((ys.min() + ys.max()) / 2 * k),
                    max(20, int((xs.max() - xs.min() + 2) * k / 2)), max(14, int((ys.max() - ys.min() + 2) * k / 2))))
    return out


def ellipse(cx, cy, rx, ry, deg, feather):
    m = Image.new("L", (W, H), 0); t = math.radians(deg)
    pts = [(cx + rx * math.cos(u) * math.cos(t) - ry * math.sin(u) * math.sin(t), cy + rx * math.cos(u) * math.sin(t) + ry * math.sin(u) * math.cos(t))
           for u in [i * 2 * math.pi / 96 for i in range(96)]]
    ImageDraw.Draw(m).polygon(pts, fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


meta, prev = {}, []
for p in cfg["patches"]:
    name, base, frame = p["name"], load(p["base"]), load(p["frame"])
    kind = p.get("kind", "eyes" if any(w in name for w in ("eye", "blink")) else "mouth")
    if "centre" in p and "radius" in p: regs = [(*p["centre"], *p["radius"])]
    else: regs = changed_regions(base, frame, kind, p.get("near"))
    pad = p.get("pad", 1.3); regs = [(cx, cy, rx * pad, ry * pad) for cx, cy, rx, ry in regs]
    x0 = min(cx - rx for cx, cy, rx, ry in regs); x1 = max(cx + rx for cx, cy, rx, ry in regs)
    y0 = min(cy - ry for cx, cy, rx, ry in regs); y1 = max(cy + ry for cx, cy, rx, ry in regs)
    mx, my = (x1 - x0) * .3 + 30, (y1 - y0) * .3 + 30
    box = (max(0, int(x0 - mx)), max(0, int(y0 - my)), min(W, int(x1 + mx)), min(H, int(y1 + my)))
    d, s, dx, dy = align(base, frame, box)
    f = warp(frame, s, dx, dy)
    m = Image.new("L", (W, H), 0)
    for cx, cy, rx, ry in regs:
        feather = max(5, round(min(rx, ry) * .3))
        m = ImageChops.lighter(m, ellipse(cx, cy, rx - feather * .6, ry - feather * .6, p.get("tilt", 0), feather))
    m = ImageChops.multiply(m, ImageChops.multiply(f.getchannel("A"), base.getchannel("A")))
    patch = f.copy(); patch.putalpha(m)
    bb = m.point(lambda v: 255 if v > 2 else 0).getbbox()
    patch.crop(bb).save(os.path.join(DST, name + ".webp"), quality=90, method=6)
    meta[name] = [bb[0], bb[1], bb[2] - bb[0], bb[3] - bb[1]]
    print(f"{name}: {kind} {[tuple(int(v) for v in r) for r in regs]} align diff {d:.1f} scale {s:.3f} dx {dx} dy {dy}")
    if a.preview:
        crop = (max(0, bb[0] - 80), max(0, bb[1] - 80), min(W, bb[2] + 80), min(H, bb[3] + 80))
        on = base.copy(); on.alpha_composite(patch)
        outline = on.copy(); ImageDraw.Draw(outline).rectangle(bb, outline=(255, 60, 60, 255), width=2)
        prev.append([im.crop(crop).convert("RGB") for im in (base, frame, outline)])
json.dump(meta, open(os.path.join(DST, "patches.json"), "w"), indent=1)
open(os.path.join(DST, "patches.js"), "w").write(f"window.{cfg.get('var', 'MOHEAT_PATCHES')} = " + json.dumps(meta) + ";\n")
if prev:   # rows: base | variant | base + patch (red box = patch)
    h = 300; rows = [[im.resize((round(im.width * h / im.height), h)) for im in r] for r in prev]
    sheet = Image.new("RGB", (max(sum(i.width for i in r) for r in rows), h * len(rows)), (20, 20, 20))
    for y, r in enumerate(rows):
        x = 0
        for im in r: sheet.paste(im, (x, y * h)); x += im.width
    sheet.save(os.path.join(D, "assets", "patches_preview.jpg"), quality=85); print("preview: assets/patches_preview.jpg")
