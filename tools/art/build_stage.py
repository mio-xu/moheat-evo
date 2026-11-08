"""Build a layered demo stage from plain-background poses + one background plate (DEMO_DESIGN_GUIDE §6.2) — Pillow + numpy only.

  python3 tools/art/build_stage.py <demo folder> [--preview]

Reads <demo>/project/stage.json:
  { "src": "assets/art", "skipVideo": "media/video/[vt]_",
    "bgs":   { "camp": { "src": "bg_camp", "fire": [0.75, 0.72] } },               fire in the plate (fraction); omit → found automatically
    "poses": { "sit": { "src": "gaku_ref", "talk": "gaku_ref_talk", "blink": "gaku_ref_blink", "near_mouth": [x, y], "near_eyes": [x, y],
                        "centre_mouth": [x, y], "radius_mouth": [rx, ry] (skip the search when it is pulled away by a hand / prop), "regions_eyes": [[cx, cy, rx, ry], …] (fixed ellipses),
                        "erase": [[x0, y0, x1, y1]], "keep": [[x0, y0, x1, y1]] } },             "mouth": "lp" = the mouth is a LivePortrait set (tools/art/lp_mouths.py, run first; talk / quiet are then not used); erase = source boxes cleared (e.g. a fire drawn in the pose); keep = source boxes never keyed (grey steam, smoke); "matte": "ai" = outline from the isnet-anime model (~/ml/layers venv) for light / pastel figures ; "matte": "green" / "magenta" = chroma key for poses on #00B140 / #FF00FF (green-haired figures)
    "views": { "live": { "still": "gaku_live", "pose": "sit", "bg": "camp", "fire": [0.9, 0.74], "x": 0.42, "y": 1.06, "height": 1.1 } } }
  view: still = the file the page draws (stem, or stem.ext; media/art/<still> is written as the flat fallback), alias = other view names
  that draw the same still (e.g. a mirrored side), fire = where the page expects the
  fire (or null), x / y = the character's bottom centre (frame fraction), height = the character's height as a fraction of the frame
  (leave all three out = the figure stays where it is in its own source picture, for poses drawn with a still's framing).
Does:
  1. cuts every pose out of its plain background (flood from the border on the background colour, soft edge, grey fringe unmixed)
  2. face patches from the talk / blink variants (tools/art/face_patches.py logic, run on the full-size sources)
  3. writes media/art/bg_<bg>.webp, char_<pose>.webp, <pose>_mouth.webp, <pose>_eyes.webp, the flat stills <still>.jpg and
     media/layers.js (data for demos/shared/layers.js)
"""
import argparse, hashlib, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument("demo"); ap.add_argument("--preview", action="store_true")
a = ap.parse_args()
D = os.path.abspath(a.demo); HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(D, "project", "stage.json")))
SRC = os.path.join(D, cfg.get("src", "assets/art")); ART = os.path.join(D, "media", "art"); os.makedirs(ART, exist_ok=True)
src = lambda n: os.path.join(SRC, n + ".png")


def out(path):   # never write THROUGH a symlink (a placeholder link to the original demo would overwrite the original's file)
    if os.path.islink(path): os.remove(path)
    return path
MAXDIM = 1700   # character textures are uploaded every frame: keep them modest


def chroma_green(path, erase=(), keep=(), magenta=False):
    """"matte": "green" — a pose on chroma green (#00B140; guide §6: light figures with dark lineart, Demo40). Alpha from how much greener
    than red / blue a pixel is (so the gaps between hair strands key out too), green spill removed, edges unmixed.
    "matte": "magenta" — the same on chroma magenta (#FF00FF) for green-haired figures (Demo37 Mint): key = min(r, b) − g."""
    im = np.asarray(Image.open(path).convert("RGB"), np.float32); H, W, _ = im.shape
    r, g, b = im[..., 0], im[..., 1], im[..., 2]; key = (np.minimum(r, b) - g) if magenta else (g - np.maximum(r, b))
    border = np.concatenate([key[0], key[-1], key[:, 0], key[:, -1]]); full = float(np.median(border))   # the screen's own "greenness"
    alpha = np.clip(1 - (key - 12) / max(20.0, full * .75 - 12), 0, 1)
    for x0, y0, x1, y1 in keep: alpha[y0:y1, x0:x1] = 1
    for x0, y0, x1, y1 in erase: alpha[y0:y1, x0:x1] = 0
    bgc = np.median(np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]), 0)
    a3 = np.maximum(alpha, .05)[..., None]
    fg = np.clip((im - (1 - a3) * bgc) / a3, 0, 255)
    if magenta:   # despill: no pixel more magenta than its green allows (red and blue both pulled toward the green + their own balance)
        lim = fg[..., 1] + 6 + np.abs(fg[..., 0] - fg[..., 2]); m_ = np.minimum(fg[..., 0], fg[..., 2]) > lim
        fg[..., 0] = np.where(m_, np.minimum(fg[..., 0], lim + np.maximum(0, fg[..., 0] - fg[..., 2])), fg[..., 0])
        fg[..., 2] = np.where(m_, np.minimum(fg[..., 2], lim + np.maximum(0, fg[..., 2] - fg[..., 0])), fg[..., 2])
    else: fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]) + 6)   # despill: no pixel greener than its red / blue
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.5)), np.float32) / 255
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > .02); pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad), min(H, ys.max() + pad))
    return Image.fromarray(rgba).crop(box), box, (W, H)


def cutout(path, erase=(), keep=(), ai=False):
    """plain-background pose → RGBA, cropped. Background colour = median of the border; background = connected to the border."""
    im = np.asarray(Image.open(path).convert("RGB"), np.float32); H, W, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    # the plain background = the most common pure-grey colour on the border (any brightness: light, mid or dark grey —
    # a brightness filter once made a dark #404040 plate fall back to the lilac hair on the border, Demo22 Shion)
    grey = border[(border.max(1) - border.min(1)) < 12]
    if len(grey) > 50:
        q = (grey // 8).astype(int); keys, cnt = np.unique(q, axis=0, return_counts=True); top = keys[cnt.argmax()]
        bgc = np.median(grey[(q == top).all(1)], 0)
    else:
        bgc = np.median(border, 0)
    diff = np.abs(im - bgc).max(2)
    # background = grown from the border over smooth, background-like pixels; the lineart (a sharp edge) stops it, so light clothes
    # close to the background colour stay solid (Demo20 Hinata's cream cardigan). Plus large enclosed patches of the plain colour (chair gaps).
    g = np.asarray(Image.fromarray(im.astype(np.uint8)).convert("L"), np.float32)
    grad = np.maximum(np.abs(np.diff(g, axis=0, append=g[-1:])), np.abs(np.diff(g, axis=1, append=g[:, -1:])))
    k = 2; Hs, Ws = H // k, W // k
    gk = grad[:Hs * k, :Ws * k].reshape(Hs, k, Ws, k).max((1, 3))           # max-pool: a thin line still blocks
    dk = diff[:Hs * k, :Ws * k].reshape(Hs, k, Ws, k).max((1, 3))
    bgsat = float(bgc.max() - bgc.min())   # the plain bg may be a slightly warm grey (Demo20 #cec7c4, colourfulness 10): compare with IT, not with 0
    satk = (im.max(2) - im.min(2))[:Hs * k, :Ws * k].reshape(Hs, k, Ws, k).mean((1, 3))   # colourfulness: the plain bg is a pure grey
    cand = (dk < 40) & (gk < 9)
    seen = np.zeros_like(cand); pocket = np.zeros_like(cand); lab = np.zeros(cand.shape, np.int32); n = 0
    for y0, x0 in zip(*np.where(cand)):
        if lab[y0, x0]: continue
        n += 1; stack = [(y0, x0)]; lab[y0, x0] = n; pts = []; edge = False
        while stack:
            y, x = stack.pop(); pts.append((y, x))
            if y in (0, Hs - 1) or x in (0, Ws - 1): edge = True
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < Hs and 0 <= xx < Ws and cand[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; stack.append((yy, xx))
        ys_, xs_ = zip(*pts)
        if edge or (len(pts) > 120 and dk[list(ys_), list(xs_)].mean() < 10):   # enclosed gaps only if really the plain bg colour
            seen[list(ys_), list(xs_)] = True
        elif len(pts) >= 6 and dk[list(ys_), list(xs_)].mean() < 12 and abs(satk[list(ys_), list(xs_)].mean() - bgsat) < 7:   # a small pocket of the plain (pure grey) background between hair and body — not lavender / silver hair shadow
            pocket[list(ys_), list(xs_)] = True
    for x0, y0, x1, y1 in keep: seen[y0 // k:y1 // k + 1, x0 // k:x1 // k + 1] = False   # grey things that belong to the figure (steam)
    bgm = np.zeros((H, W), np.float32)
    bgm[:Hs * k, :Ws * k] = np.repeat(np.repeat(seen, k, 0), k, 1)
    # anti-aliased edge: only a thin band on the background side takes its alpha from how unlike the background it is
    big = lambda a, f: np.asarray(Image.fromarray((a * 255).astype(np.uint8)).filter(f), np.float32) / 255
    band = (big(bgm, ImageFilter.MinFilter(5)) < .5) & (bgm > .5)
    soft = np.clip((diff - 8) / 34, 0, 1)
    alpha = np.where(bgm > .5, 0.0, 1.0); alpha[band] = soft[band]
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)), np.float32) / 255
    if ai:   # light / pastel figures on a light background: the anime matting model draws the outline, holes inside are filled
        import tempfile
        tmp = tempfile.mktemp(suffix=".png")
        subprocess.run([os.path.expanduser("~/ml/layers/bin/python"), "-c",
                        "import sys; from rembg import remove, new_session; from PIL import Image; "
                        "remove(Image.open(sys.argv[1]).convert('RGB'), session=new_session('isnet-anime'), only_mask=True).save(sys.argv[2])",
                        path, tmp], check=True, capture_output=True)
        m = np.asarray(Image.open(tmp).convert("L"), np.float32) / 255; os.remove(tmp)
        out = np.zeros((Hs, Ws), bool); low = m[:Hs * k, :Ws * k].reshape(Hs, k, Ws, k).max((1, 3)) < .5
        stack = [(y, x) for y in range(Hs) for x in (0, Ws - 1) if low[y, x]] + [(y, x) for x in range(Ws) for y in (0, Hs - 1) if low[y, x]]
        for y, x in stack: out[y, x] = True
        while stack:
            y, x = stack.pop()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < Hs and 0 <= xx < Ws and low[yy, xx] and not out[yy, xx]: out[yy, xx] = True; stack.append((yy, xx))
        outside = np.zeros((H, W), bool); outside[:Hs * k, :Ws * k] = np.repeat(np.repeat(out, k, 0), k, 1)
        soft_out = np.clip((diff - 18) / 30, 0, 1)   # outside the outline the model sometimes paints a faint shadow / glow on the plain bg: treat near-bg as bg
        alpha = np.where(outside, np.minimum(m, soft_out), 1.0)      # outside the outline: the model's soft edge, but never more than the colour says (no dark / grey halo round hair); inside: solid
        pk = np.zeros((H, W), bool); pk[:Hs * k, :Ws * k] = np.repeat(np.repeat(pocket, k, 0), k, 1)
        alpha[pk] = np.minimum(alpha[pk], soft[pk])   # …but pockets of the plain background inside it are cut out (user: grey left between hair and body)
        # near the outline (hair strands, the hair / shoulder junction) and where the model itself is unsure, pixels of the plain
        # background colour are background too — the clothes' grey shading deep inside the figure is left alone
        small_out = Image.fromarray(outside[::4, ::4].astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(31))   # ±60 px
        near = np.asarray(small_out.resize((W, H), Image.NEAREST), bool) | (m < .98)
        neutral = np.abs((im.max(2) - im.min(2)) - bgsat) < 8   # as colourful as the plain background (pure or warm grey); silver / lavender hair shading is not
        bgish = near & (diff < 12) & neutral
        alpha[bgish] = np.minimum(alpha[bgish], soft[bgish])
    for x0, y0, x1, y1 in erase: alpha[y0:y1, x0:x1] = 0   # things drawn that belong to another layer (a fire, a table)
    # unmix the grey fringe: C = a·F + (1−a)·BG  →  F = (C − (1−a)·BG) / a
    a3 = np.maximum(alpha, .05)[..., None]
    fg = np.clip((im - (1 - a3) * bgc) / a3, 0, 255)
    rgba = np.dstack([fg, alpha * 255]).astype(np.uint8)
    ys, xs = np.where(alpha > .02); pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad), min(H, ys.max() + pad))
    return Image.fromarray(rgba).crop(box), box, (W, H)


def find_fire(path):
    im = np.asarray(Image.open(path).convert("RGB").resize((480, 270)), np.float32)
    warm = np.clip(im[..., 0] - im[..., 2], 0, None) * (im.sum(2) > 450)
    w = warm ** 2; ys, xs = np.mgrid[0:270, 0:480]
    return [round(float((xs * w).sum() / w.sum()) / 480, 3), round(float((ys * w).sum() / w.sum()) / 270, 3)]


data = {"views": {}}
if cfg.get("skipVideo"): data["skipVideo"] = cfg["skipVideo"]
if cfg.get("hooks"): data["hooks"] = cfg["hooks"]   # where the base demo keeps its state (view, mouth) — see shared/layers.js
bgs = {}
for name, b in cfg["bgs"].items():
    im = Image.open(src(b["src"])).convert("RGB")
    im.save(out(os.path.join(ART, f"bg_{name}.webp")), quality=84, method=6)
    fire = b.get("fire") or find_fire(src(b["src"]))
    bgs[name] = {"src": f"art/bg_{name}.webp", "fire": fire, "im": im}
    print(f"bg {name}: fire at {fire}")

# face patches: run face_patches.py on the full-size sources through a temporary config
poses, pcfg = {}, {"src": SRC, "dst": os.path.join(D, "assets", "patches"), "size": None, "patches": []}
for name, p in cfg["poses"].items():
    cut, box, size = (chroma_green(src(p["src"]), p.get("erase", ()), p.get("keep", ()), p.get("matte") == "magenta") if p.get("matte") in ("green", "magenta") else
                      cutout(src(p["src"]), p.get("erase", ()), p.get("keep", ()), p.get("matte") == "ai"))
    f = min(1, MAXDIM / max(cut.size)); cut = cut.resize((round(cut.width * f), round(cut.height * f)), Image.LANCZOS)
    cut.save(out(os.path.join(ART, f"char_{name}.webp")), quality=88, method=6)
    poses[name] = {"src": f"art/char_{name}.webp", "w": cut.width, "h": cut.height, "box": box, "f": f, "cut": cut, "patches": []}
    pcfg["size"] = list(size)
    # "quiet": a CLOSED-mouth variant of a pose drawn mid-word / mid-laugh → patch kind mouth_quiet (shared/layers.js shows it while
    # nobody talks; keys near_mouth_quiet / centre_mouth_quiet + radius_mouth_quiet / regions_mouth_quiet like the others)
    for kind, key in (("mouth", "talk"), ("eyes", "blink"), ("mouth_quiet", "quiet")):
        if p.get("mouth") == "lp" and kind != "eyes": continue   # the mouth set comes from tools/art/lp_mouths.py (below)
        if p.get(key) and os.path.exists(src(p[key])):
            e = {"name": f"{name}_{kind}", "base": p["src"], "frame": p[key], "kind": kind, "_size": list(size), "_pose": name}
            if p.get(f"near_{kind}"): e["near"] = p[f"near_{kind}"]
            if p.get(f"centre_{kind}"): e["centre"], e["radius"] = p[f"centre_{kind}"], p[f"radius_{kind}"]   # fixed ellipse, no search
            if p.get(f"regions_{kind}"): e["regions"] = p[f"regions_{kind}"]   # fixed ellipses (both eyes), e.g. the masks of a masked edit
            pcfg["patches"].append(e)
    print(f"pose {name}: cut {cut.size} from box {box}")
# all poses side by side (user: close-ups and wide shots must match — face, art style, clothes): check this sheet every build
_sheet = [Image.open(src(p["src"])).convert("RGB").resize((640, 360)) for p in cfg["poses"].values()]
_cols = 4; _poses = Image.new("RGB", (_cols * 640, ((len(_sheet) + _cols - 1) // _cols) * 360), (30, 30, 30))
for _i, _t in enumerate(_sheet): _poses.paste(_t, ((_i % _cols) * 640, (_i // _cols) * 360))
os.makedirs(os.path.join(D, "assets"), exist_ok=True); _poses.save(os.path.join(D, "assets", "poses_preview.jpg"), quality=82)
print("poses side by side: assets/poses_preview.jpg (check face / style / clothes / props match across close-ups and wide shots)")
if pcfg["patches"]:
    tmp = os.path.join(D, "assets", "patches_cfg"); os.makedirs(os.path.join(tmp, "project"), exist_ok=True); os.makedirs(os.path.join(tmp, "assets"), exist_ok=True)
    # face_patches works in ONE picture size per run: poses of another size (extended by tools/art/extend_pose.py, wider) get their
    # own run — squeezing them into the last pose's size put Demo24's blanket / left mouth + eye patches in the wrong place
    groups, meta = {}, {}
    for e in pcfg["patches"]: groups.setdefault(tuple(e["_size"]), []).append({k: v for k, v in e.items() if k not in ("_size", "_pose")})
    for sz, es in groups.items():
        json.dump({**pcfg, "size": list(sz), "patches": es}, open(os.path.join(tmp, "project", "patches.json"), "w"))
        subprocess.run([sys.executable, os.path.join(HERE, "face_patches.py"), tmp] + (["--preview"] if a.preview else []), check=True)
        meta.update(json.load(open(os.path.join(pcfg["dst"], "patches.json"))))
    for e in pcfg["patches"]:
        pn = e["name"]; pose = poses[e["_pose"]]; x, y, w, h = meta[pn]; bx, by = pose["box"][:2]; f = pose["f"]
        im = Image.open(os.path.join(pcfg["dst"], pn + ".webp"))
        im = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS).convert("RGBA")
        # only where the character layer is solid: a patch at the face outline (a profile) must not carry the plain background
        # (green / grey) of its variant into the picture (Demo40 pray mouth)
        rx, ry = round((x - bx) * f), round((y - by) * f)
        ca = pose["cut"].getchannel("A").crop((rx, ry, rx + im.width, ry + im.height))
        im.putalpha(Image.fromarray(np.minimum(np.asarray(im.getchannel("A")), np.asarray(ca)).astype(np.uint8)))
        if cfg["poses"][e["_pose"]].get("matte") == "green":   # same despill as the character layer (magenta: clipped by alpha only)
            a = np.asarray(im).copy(); a[..., 1] = np.minimum(a[..., 1], np.maximum(a[..., 0], a[..., 2]).astype(int) + 6).astype(np.uint8); im = Image.fromarray(a)
        im.save(out(os.path.join(ART, pn + ".webp")), quality=90, method=6)
        pose["patches"].append({"src": f"art/{pn}.webp", "rect": [round((x - bx) * f), round((y - by) * f), im.width, im.height], "kind": e["kind"],
                                "im": im})

# "mouth": "lp" — a mouth SET from tools/art/lp_mouths.py: closed (= the pose's own pixels) + open levels warped by LivePortrait from
# that same picture, all one fixed block, so the corners never jump (DEMO_DESIGN_GUIDE §6 mouth step). kind "mouth_lv" + level 0..n.
LPD = os.path.join(D, "assets", "lp_mouths"); lpm = json.load(open(os.path.join(LPD, "lp_mouths.json"))) if os.path.exists(os.path.join(LPD, "lp_mouths.json")) else {}
for name, p in cfg["poses"].items():
    if p.get("mouth") != "lp": continue
    m = lpm.get(name); run = f"~/ml/LivePortrait/.venv/bin/python tools/art/lp_mouths.py {sys.argv[1]} {name} --sheet"
    if not m: sys.exit(f"pose {name}: \"mouth\": \"lp\" but no assets/lp_mouths/{name}_lv*.png — run {run}")
    if m.get("of") and m["of"] != hashlib.md5(open(src(p["src"]), "rb").read()).hexdigest()[:10]:
        sys.exit(f"pose {name}: {p['src']}.png changed after its mouth set was made — run {run}")
    pose = poses[name]; x, y, w, h = m["rect"]; bx, by = pose["box"][:2]; f = pose["f"]; rx, ry = round((x - bx) * f), round((y - by) * f)
    for k in range(m["levels"] + 1):
        im = Image.open(os.path.join(LPD, f"{name}_lv{k}.png")).convert("RGBA").resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS)
        ca = pose["cut"].getchannel("A").crop((rx, ry, rx + im.width, ry + im.height))   # only where the character layer is solid
        im.putalpha(Image.fromarray(np.minimum(np.asarray(im.getchannel("A")), np.asarray(ca)).astype(np.uint8)))
        if p.get("matte") == "green":
            q = np.asarray(im).copy(); q[..., 1] = np.minimum(q[..., 1], np.maximum(q[..., 0], q[..., 2]).astype(int) + 6).astype(np.uint8); im = Image.fromarray(q)
        pn = f"{name}_mouth{k}"; im.save(out(os.path.join(ART, pn + ".webp")), quality=92, method=6)
        pose["patches"].append({"src": f"art/{pn}.webp", "rect": [rx, ry, im.width, im.height], "kind": "mouth_lv", "level": k, "im": im})
    print(f"pose {name}: LivePortrait mouth set, {m['levels']} open levels")

# views: data for shared/layers.js + the flat fallback still (same placement maths as the page)
FW, FH = 1920, 1080
for vname, v in cfg["views"].items():
    b, p = bgs[v["bg"]], poses[v["pose"]]
    if "height" not in v:   # no placement given: where the figure is in its own source frame (poses drawn with a still's framing, Demo40)
        (x0, y0, x1, y1), (sw, sh) = p["box"], pcfg["size"]
        v = {**v, "x": round((x0 + x1) / 2 / sw, 4), "y": round(y1 / sh, 4), "height": round((y1 - y0) / sh, 4)}
    f, bf = v.get("fire"), b["fire"]; z = v.get("zoom", 1)
    if f:
        for k in (0, 1): z = max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]))
        ox, oy = f[0] - bf[0] * z, f[1] - bf[1] * z
    else: ox = oy = (1 - z) / 2
    flat = b["im"].resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert("RGBA")
    ch = p["cut"].copy()
    hpx = v["height"] * FH; wpx = hpx * p["w"] / p["h"]
    ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.alpha_composite(ch, (round(v["x"] * FW - wpx / 2), round(v["y"] * FH - hpx))) if v["x"] * FW - wpx / 2 >= 0 and v["y"] * FH - hpx >= 0 else \
        flat.paste(ch, (round(v["x"] * FW - wpx / 2), round(v["y"] * FH - hpx)), ch)
    stem, ext = os.path.splitext(v["still"]); ext = ext or ".jpg"   # the page decides the still's file name (Demo20 loads .webp)
    flat.convert("RGB").save(out(os.path.join(ART, stem + ext)), quality=88)
    data["views"][stem] = {"view": vname, **({"alias": v["alias"]} if v.get("alias") else {}), "fire": f,
                                "bg": {"src": b["src"], "fire": bf, **({"zoom": v["zoom"]} if v.get("zoom") else {})},
                                "char": {"src": p["src"], "w": p["w"], "h": p["h"], "x": v["x"], "y": v["y"], "height": v["height"], "box": [int(b) for b in p["box"]]},   # box = source px (tools/art/extend_pose.py)
                                "patches": [{k: pt[k] for k in ("src", "rect", "kind", "level") if k in pt} for pt in p["patches"]]}
    print(f"view {vname}: bg zoom {z:.2f}, still media/art/{stem}{ext}")
import hashlib
def _v(rel):   # "art/x.webp" → "art/x.webp?v=<content hash>"
    f = os.path.join(D, "media", rel.split("?")[0])
    return rel.split("?")[0] + "?v=" + hashlib.md5(open(f, "rb").read()).hexdigest()[:8] if os.path.exists(f) else rel
for _vw in data["views"].values():
    _vw["bg"]["src"] = _v(_vw["bg"]["src"]); _vw["char"]["src"] = _v(_vw["char"]["src"])
    if _vw["bg"].get("depth"): _vw["bg"]["depth"] = _v(_vw["bg"]["depth"])
    for _pt in _vw["patches"]: _pt["src"] = _v(_pt["src"])
open(out(os.path.join(D, "media", "layers.js")), "w").write(
    "// Layer data for ../../shared/layers.js — written by tools/art/build_stage.py from project/stage.json (do not edit by hand).\n"
    "window.MOHEAT_LAYERS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
print("wrote media/layers.js")
