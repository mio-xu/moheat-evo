"""Install the regenerated art pack (project/generated_art/, 37 PNGs, see generated_art_manifest.json) into assets/.

  python3 scripts/import_generated_art.py        then: export.py → make_cover.py → render_mp4.py

- train interior (master / day / dusk / night): #00FF00 glass → transparent (soft edge + green spill removed);
  window_mask.png from the master; window_geometry.json re-measured (door porthole, lamps, clock) on the new car.
- scenery layers that scroll: copied as they are; the player mirror-tiles them (every other copy flipped), so the edges
  always meet without a seam (a cross-fade left ghosted trees / mountains).
- glass overlays, sprites and props: copied as they are (already transparent).
- fx_season_swirl (user-supplied Seedance art, already installed) is left untouched.
The old procedural generators (art_train.py / art_scenery.py) are no longer part of the rebuild: they would overwrite this art.
"""
import json, os, shutil
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC, DST = os.path.join(ROOT, "project", "generated_art"), os.path.join(ROOT, "assets")
INTERIOR = ("train_interior_master", "train_interior_day", "train_interior_dusk", "train_interior_night")
TILE = ("_far", "_mid", "_near", "tunnel_ice_wall", "tunnel_lava_wall", "spring_station")
SKIP = ("fx_season_swirl",)
OVERLAP = 180          # px of the seam cross-fade


def key_green(path):
    a = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    greenness = g - np.maximum(r, b)                                  # chroma distance toward pure green
    alpha = 1 - np.clip((greenness - 40) / 90, 0, 1)                  # ≥130 → fully transparent, ≤40 → opaque
    hard = alpha < .5
    hard = ndimage.binary_opening(hard, iterations=1, border_value=0)
    alpha = np.where(hard, np.minimum(alpha, .5), alpha)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(.8))).astype(np.float32) / 255
    a[..., 1] = np.minimum(g, np.maximum(r, b) + 6)                    # despill green fringes (incl. the lamps' glow)
    a[..., 1] = np.where(alpha < .98, np.minimum(a[..., 1], (r + b) / 2 + 10), a[..., 1])
    out = np.dstack([np.clip(a, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def seamless(im):
    a = np.asarray(im.convert("RGBA")).astype(np.float32)
    h, w = a.shape[:2]; o = OVERLAP
    ramp = np.linspace(0, 1, o)[None, :, None]
    body = a[:, : w - o].copy()
    body[:, :o] = a[:, :o] * ramp + a[:, w - o:] * (1 - ramp)        # left edge blends in the right edge → wraps cleanly
    out = Image.fromarray(np.clip(body, 0, 255).astype(np.uint8), "RGBA").resize((w, h), Image.LANCZOS)
    return out if im.mode == "RGBA" else out.convert("RGB")


def geometry(master_rgba):
    alpha = np.asarray(master_rgba.getchannel("A"))
    glass = alpha < 128
    g = json.load(open(os.path.join(DST, "train_interior", "window_geometry.json")))
    # door porthole: the glass blob near the centre of the end wall
    lab, n = ndimage.label(glass)
    cx = 768
    best = None
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 200: continue
        mx, my = xs.mean(), ys.mean()
        if abs(mx - cx) < 60 and 300 < my < 460 and np.ptp(xs) < 140: best = (xs, ys); break
    if best:
        xs, ys = best; ox, oy = xs.mean(), ys.mean(); rx, ry = np.ptp(xs) / 2 + 1, np.ptp(ys) / 2 + 1
        g["door_glass"] = [[round(ox + rx * np.cos(a), 1), round(oy + ry * np.sin(a), 1)] for a in np.linspace(0, 2 * np.pi, 28, endpoint=False)]
    g["lamps"] = [[768.0, 70.0, 36.0], [768.0, 230.0, 20.0]]           # the two pendant lamps painted on the new car's roof spine
    g["clock"] = {"cx": 768.0, "cy": 300.0, "r": 31.0}                   # the clock above the door
    g["source"] = "generated art pack (project/generated_art), re-measured by import_generated_art.py"
    return g


def main():
    manifest = json.load(open(os.path.join(ROOT, "project", "generated_art_manifest.json")))
    n = 0
    for item in manifest["assets"]:
        rel = item["path"]; name = os.path.basename(rel)[:-4]
        if name in SKIP: continue
        src, dst = os.path.join(SRC, rel), os.path.join(DST, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if name in INTERIOR:
            im = key_green(src); im.save(dst)
            if name == "train_interior_master":
                Image.fromarray(((np.asarray(im.getchannel("A")) < 128) * 255).astype(np.uint8), "L").save(os.path.join(DST, "train_interior", "window_mask.png"))
                geo = geometry(im)
                json.dump(geo, open(os.path.join(DST, "train_interior", "window_geometry.json"), "w"), indent=1)
        else:
            shutil.copyfile(src, dst)
        n += 1
    print(f"installed {n} assets from the generated pack into assets/ (season swirl kept)")


if __name__ == "__main__":
    main()
