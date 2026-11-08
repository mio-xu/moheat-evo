"""Build a layered demo stage from plain-background poses + one background plate (DEMO_DESIGN_GUIDE §6.2) — Pillow + numpy only.

  python3 tools/art/build_stage.py <demo folder> [--preview]

Reads <demo>/project/stage.json:
  { "src": "assets/art", "skipVideo": "media/video/[vt]_",
    "bgs":   { "camp": { "src": "bg_camp", "fire": [0.75, 0.72] } },               fire in the plate (fraction); omit → found automatically
    "poses": { "sit": { "src": "gaku_ref", "talk": "gaku_ref_talk", "blink": "gaku_ref_blink", "near_mouth": [x, y], "near_eyes": [x, y] } },
    "views": { "live": { "still": "gaku_live", "pose": "sit", "bg": "camp", "fire": [0.9, 0.74], "x": 0.42, "y": 1.06, "height": 1.1 } } }
  view: still = the file stem the page draws (media/art/<still>.jpg is written as the flat fallback), fire = where the page expects the
  fire (or null), x / y = the character's bottom centre (frame fraction), height = the character's height as a fraction of the frame.
Does:
  1. cuts every pose out of its plain background (flood from the border on the background colour, soft edge, grey fringe unmixed)
  2. face patches from the talk / blink variants (tools/art/face_patches.py logic, run on the full-size sources)
  3. writes media/art/bg_<bg>.webp, char_<pose>.webp, <pose>_mouth.webp, <pose>_eyes.webp, the flat stills <still>.jpg and
     media/layers.js (data for demos/shared/layers.js)
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

ap = argparse.ArgumentParser(); ap.add_argument("demo"); ap.add_argument("--preview", action="store_true")
a = ap.parse_args()
D = os.path.abspath(a.demo); HERE = os.path.dirname(os.path.abspath(__file__))
cfg = json.load(open(os.path.join(D, "project", "stage.json")))
SRC = os.path.join(D, cfg.get("src", "assets/art")); ART = os.path.join(D, "media", "art"); os.makedirs(ART, exist_ok=True)
src = lambda n: os.path.join(SRC, n + ".png")
MAXDIM = 1700   # character textures are uploaded every frame: keep them modest


def cutout(path):
    """plain-background pose → RGBA, cropped. Background colour = median of the border; background = connected to the border."""
    im = np.asarray(Image.open(path).convert("RGB"), np.float32); H, W, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]]); bgc = np.median(border, 0)
    diff = np.abs(im - bgc).max(2)
    # connected-to-border background on a small grid (fast), then a soft edge at full size
    k = 4; small = (diff[::k, ::k] < 26)
    seen = np.zeros_like(small); stack = [(y, x) for y in range(small.shape[0]) for x in (0, small.shape[1] - 1) if small[y, x]]
    stack += [(y, x) for x in range(small.shape[1]) for y in (0, small.shape[0] - 1) if small[y, x]]
    for y, x in stack: seen[y, x] = True
    while stack:
        y, x = stack.pop()
        for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= yy < small.shape[0] and 0 <= xx < small.shape[1] and small[yy, xx] and not seen[yy, xx]:
                seen[yy, xx] = True; stack.append((yy, xx))
    bgm = np.asarray(Image.fromarray(seen.astype(np.uint8) * 255).resize((W, H), Image.NEAREST), np.float32) / 255
    bgm = np.asarray(Image.fromarray((bgm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)), np.float32) / 255   # reach the edge
    soft = np.clip((diff - 8) / 34, 0, 1)                         # how unlike the background each pixel is
    alpha = np.where(bgm > .5, soft, 1.0)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.7)), np.float32) / 255
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
bgs = {}
for name, b in cfg["bgs"].items():
    im = Image.open(src(b["src"])).convert("RGB")
    im.save(os.path.join(ART, f"bg_{name}.webp"), quality=84, method=6)
    fire = b.get("fire") or find_fire(src(b["src"]))
    bgs[name] = {"src": f"art/bg_{name}.webp", "fire": fire, "im": im}
    print(f"bg {name}: fire at {fire}")

# face patches: run face_patches.py on the full-size sources through a temporary config
poses, pcfg = {}, {"src": SRC, "dst": os.path.join(D, "assets", "patches"), "size": None, "patches": []}
for name, p in cfg["poses"].items():
    cut, box, size = cutout(src(p["src"]))
    f = min(1, MAXDIM / max(cut.size)); cut = cut.resize((round(cut.width * f), round(cut.height * f)), Image.LANCZOS)
    cut.save(os.path.join(ART, f"char_{name}.webp"), quality=88, method=6)
    poses[name] = {"src": f"art/char_{name}.webp", "w": cut.width, "h": cut.height, "box": box, "f": f, "cut": cut, "patches": []}
    pcfg["size"] = list(size)
    for kind, key in (("mouth", "talk"), ("eyes", "blink")):
        if p.get(key) and os.path.exists(src(p[key])):
            e = {"name": f"{name}_{kind}", "base": p["src"], "frame": p[key], "kind": kind}
            if p.get(f"near_{kind}"): e["near"] = p[f"near_{kind}"]
            pcfg["patches"].append(e)
    print(f"pose {name}: cut {cut.size} from box {box}")
if pcfg["patches"]:
    tmp = os.path.join(D, "assets", "patches_cfg"); os.makedirs(os.path.join(tmp, "project"), exist_ok=True); os.makedirs(os.path.join(tmp, "assets"), exist_ok=True)
    json.dump(pcfg, open(os.path.join(tmp, "project", "patches.json"), "w"))
    subprocess.run([sys.executable, os.path.join(HERE, "face_patches.py"), tmp] + (["--preview"] if a.preview else []), check=True)
    meta = json.load(open(os.path.join(pcfg["dst"], "patches.json")))
    for e in pcfg["patches"]:
        pn = e["name"]; pose = poses[pn.rsplit("_", 1)[0]]; x, y, w, h = meta[pn]; bx, by = pose["box"][:2]; f = pose["f"]
        im = Image.open(os.path.join(pcfg["dst"], pn + ".webp"))
        im = im.resize((max(1, round(w * f)), max(1, round(h * f))), Image.LANCZOS); im.save(os.path.join(ART, pn + ".webp"), quality=90, method=6)
        pose["patches"].append({"src": f"art/{pn}.webp", "rect": [round((x - bx) * f), round((y - by) * f), im.width, im.height], "kind": e["kind"],
                                "im": im})

# views: data for shared/layers.js + the flat fallback still (same placement maths as the page)
FW, FH = 1920, 1080
for vname, v in cfg["views"].items():
    b, p = bgs[v["bg"]], poses[v["pose"]]
    f, bf = v.get("fire"), b["fire"]; z = v.get("zoom", 1)
    if f:
        for k in (0, 1): z = max(z, f[k] / bf[k], (1 - f[k]) / (1 - bf[k]))
        ox, oy = f[0] - bf[0] * z, f[1] - bf[1] * z
    else: ox = oy = (1 - z) / 2
    flat = b["im"].resize((round(FW * z), round(FH * z)), Image.LANCZOS).crop((round(-ox * FW), round(-oy * FH), round(-ox * FW) + FW, round(-oy * FH) + FH)).convert("RGBA")
    ch = p["cut"].copy()
    for pt in p["patches"]:
        pass   # the flat still is the neutral face (mouth closed, eyes open)
    hpx = v["height"] * FH; wpx = hpx * p["w"] / p["h"]
    ch = ch.resize((round(wpx), round(hpx)), Image.LANCZOS)
    flat.alpha_composite(ch, (round(v["x"] * FW - wpx / 2), round(v["y"] * FH - hpx))) if v["x"] * FW - wpx / 2 >= 0 and v["y"] * FH - hpx >= 0 else \
        flat.paste(ch, (round(v["x"] * FW - wpx / 2), round(v["y"] * FH - hpx)), ch)
    flat.convert("RGB").save(os.path.join(ART, v["still"] + ".jpg"), quality=88)
    data["views"][v["still"]] = {"view": vname, "fire": f,
                                "bg": {"src": b["src"], "fire": bf, **({"zoom": v["zoom"]} if v.get("zoom") else {})},
                                "char": {"src": p["src"], "w": p["w"], "h": p["h"], "x": v["x"], "y": v["y"], "height": v["height"]},
                                "patches": [{k: pt[k] for k in ("src", "rect", "kind")} for pt in p["patches"]]}
    print(f"view {vname}: bg zoom {z:.2f}, still media/art/{v['still']}.jpg")
open(os.path.join(D, "media", "layers.js"), "w").write(
    "// Layer data for ../../shared/layers.js — written by tools/art/build_stage.py from project/stage.json (do not edit by hand).\n"
    "window.MOHEAT_LAYERS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n")
print("wrote media/layers.js")
