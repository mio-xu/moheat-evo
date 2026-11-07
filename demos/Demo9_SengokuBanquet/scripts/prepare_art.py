"""Demo 9 art prep → project/art_src/*.png (read-only symlinks) → media/art/*.webp + faces.json.

  python3 scripts/prepare_art.py

Reuses Demo 1's aligner / face compositor (Demo1_SnowFoxfire/tools/prepare_art.py) adapted for Demo 9's realistic Ukiyo-e
adult proportions (head sits in the upper third of the 1024×1536 bust frame) and strips any stray semi-transparent
corner pixels from ChatGPT variant exports using each group's clean base alpha mask.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from demo1 import load
P = load("prepare_art")

ART_SRC = os.path.join(ROOT, "project", "art_src")
OUT = os.path.join(ROOT, "media", "art")

GROUPS = {
    "N_bust": dict(base="N_bust_base", probe=["N_bust_blink", "N_bust_mouth_open", "N_bust_mouth_half", "N_bust_laugh"],
                   box=(0.24, 0.62, 0.11, 0.32)),
    "I_bust": dict(base="I_bust_base", probe=["I_bust_blink", "I_bust_mouth_open", "I_bust_mouth_half", "I_bust_chuckle"],
                   box=(0.30, 0.68, 0.14, 0.33)),
    "N_ear":  dict(base="N_ear",       probe=["N_ear_laugh"],
                   box=(0.32, 0.78, 0.18, 0.46)),
    "I_ear":  dict(base="I_ear",       probe=["I_ear_smile"],
                   box=(0.22, 0.68, 0.18, 0.48)),
}
SKIP = {"N_Character", "I_Character"}


def link_sources():
    os.makedirs(ART_SRC, exist_ok=True)
    for sub in ("characters", "stage", "effects"):
        d = os.path.join(ROOT, "assets", sub)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith(".png"):
                continue
            dst = os.path.join(ART_SRC, f)
            rel = os.path.relpath(os.path.join(d, f), ART_SRC)
            if os.path.lexists(dst):
                os.remove(dst)
            os.symlink(rel, dst)


def face_mask_box(base, aligned_probes, box):
    b = np.asarray(base.convert("RGBA")).astype(np.float64) / 255.0
    diff = np.zeros(b.shape[:2])
    for v in aligned_probes:
        a = np.asarray(v.convert("RGBA")).astype(np.float64) / 255.0
        diff = np.maximum(diff, np.abs(a[..., :3] * a[..., 3:] - b[..., :3] * b[..., 3:]).mean(-1))
    d = Image.fromarray((np.clip(diff * 4, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))
    m = np.asarray(d) > 95
    H_, W_ = m.shape
    x_lo, x_hi, y_lo, y_hi = box
    m[: int(H_ * y_lo)] = False
    m[int(H_ * y_hi):] = False
    m[:, : int(W_ * x_lo)] = False
    m[:, int(W_ * x_hi):] = False
    ys, xs = np.nonzero(m)
    x0, x1 = np.percentile(xs, [2, 98])
    y0, y1 = np.percentile(ys, [2, 98])
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + 4
    rx, ry = (x1 - x0) / 2 * 1.28 + 28, (y1 - y0) / 2 * 1.38 + 32
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(14)), dict(cx=round(cx), cy=round(cy), rx=round(rx), ry=round(ry))


def main():
    link_sources()
    os.makedirs(OUT, exist_ok=True)
    P.OUT = OUT
    files = {f[:-4] for f in os.listdir(ART_SRC) if f.lower().endswith(".png")} - SKIP
    faces, done = {}, set()
    for key, g in GROUPS.items():
        if g["base"] not in files:
            continue
        base = Image.open(os.path.join(ART_SRC, g["base"] + ".png")).convert("RGBA")
        base_a = np.asarray(base)[..., 3]
        prefix = g["base"].rsplit("_base", 1)[0] if g["base"].endswith("_base") else g["base"]
        variants = sorted(f for f in files if f.startswith(prefix + "_") and f != g["base"])
        aligned = {}
        for v in variants:
            im = Image.open(os.path.join(ART_SRC, v + ".png")).convert("RGBA")
            arr = np.asarray(im).copy()
            arr[..., 3] = np.minimum(arr[..., 3], base_a)
            im_clean = Image.fromarray(arr)
            s, tx, ty = P.align(base, im_clean)
            aligned[v] = P.affine(im_clean, s, tx, ty)
            print(f"  {v:22s} scale {s:.2f}  shift ({tx:+d}, {ty:+d})")
        mask, face = face_mask_box(base, [aligned[p] for p in g["probe"] if p in aligned], g["box"])
        faces[key] = face
        print(f"{key}: face centre ({face['cx']}, {face['cy']}), radii {face['rx']}×{face['ry']}")
        P.save(base, g["base"])
        done.add(g["base"])
        for v, im in aligned.items():
            P.save(Image.composite(im, base, mask), v)
            done.add(v)
    for f in sorted(files - done):
        P.save(Image.open(os.path.join(ART_SRC, f + ".png")), f)
    json.dump(faces, open(os.path.join(OUT, "faces.json"), "w"), indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(os.listdir(OUT)) - 1} images → media/art ({total / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
