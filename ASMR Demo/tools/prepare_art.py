"""Prepare the designer art (art/chatgpt/*.png from ChatGPT) for the player → media/art/*.webp + media/art/faces.json

  python3 tools/prepare_art.py

* Bust / ear variants are aligned to their base image (scale search + FFT phase correlation), then only the FACE
  region of each variant is composited onto the base. Blink, lip-sync and expressions therefore change the face only,
  while hair, body and hands stay perfectly still (no jitter between frames).
* The face region is found automatically from where the blink / mouth variants differ from the base.
* Everything is written as WebP (≈10× smaller than the PNGs). The originals in art/chatgpt/ are never modified.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(sys.argv[0] if __name__ == "__main__" else __file__)))
ART, OUT = os.path.join(ROOT, "art", "chatgpt"), os.path.join(ROOT, "media", "art")
GROUPS = {   # base → variants whose face is composited onto the base;  face detection uses the `probe` variants
    "K_bust": dict(base="K_bust_base", probe=["K_bust_blink", "K_bust_mouth_open", "K_bust_mouth_half"]),
    "H_bust": dict(base="H_bust_base", probe=["H_bust_blink", "H_bust_mouth_open", "H_bust_mouth_half"]),
    "K_ear": dict(base="K_ear", probe=["K_ear_blow"]),
    "H_ear": dict(base="H_ear", probe=["H_ear_blow"]),
}


def gray(im, size=None):
    if size: im = im.resize(size, Image.BILINEAR)
    a = np.asarray(im.convert("RGBA")).astype(np.float64) / 255.0
    g = a[..., :3].mean(-1) * a[..., 3]
    gy, gx = np.gradient(g)
    return np.hypot(gx, gy)


def phase_shift(A, B):
    """shift d such that B moved by d best matches A, and the correlation peak."""
    win = np.outer(np.hanning(A.shape[0]), np.hanning(A.shape[1]))
    FA, FB = np.fft.fft2(A * win), np.fft.fft2(B * win)
    R = FA * np.conj(FB); R /= np.abs(R) + 1e-9
    r = np.real(np.fft.ifft2(R))
    dy, dx = np.unravel_index(np.argmax(r), r.shape)
    if dy > A.shape[0] // 2: dy -= A.shape[0]
    if dx > A.shape[1] // 2: dx -= A.shape[1]
    return (dx, dy), r.max()


def affine(im, s, tx, ty):
    W, H = im.size; cx, cy = W / 2, H / 2
    a = 1 / s
    return im.transform(im.size, Image.AFFINE, (a, 0, cx - (cx + tx) * a, 0, a, cy - (cy + ty) * a), resample=Image.BICUBIC)


def align(base, var):
    W, H = base.size; q = 4
    A = gray(base, (W // q, H // q))
    best = None
    for s in np.arange(0.92, 1.0801, 0.01):
        V = gray(affine(var, s, 0, 0), (W // q, H // q))
        (dx, dy), peak = phase_shift(A, V)
        if not best or peak > best[0]: best = (peak, s, dx * q, dy * q)
    _, s, tx, ty = best
    (dx, dy), _ = phase_shift(gray(base), gray(affine(var, s, tx, ty)))   # full-resolution refinement
    return s, tx + dx, ty + dy


def face_mask(base, aligned_probes):
    b = np.asarray(base.convert("RGBA")).astype(np.float64) / 255.0
    diff = np.zeros(b.shape[:2])
    for v in aligned_probes:
        a = np.asarray(v.convert("RGBA")).astype(np.float64) / 255.0
        diff = np.maximum(diff, np.abs(a[..., :3] * a[..., 3:] - b[..., :3] * b[..., 3:]).mean(-1))
    d = Image.fromarray((np.clip(diff * 4, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(8))
    m = np.asarray(d) > 110                               # eyes / mouth change a lot; regeneration noise on hair edges is faint
    H_, W_ = m.shape                                      # faces sit in the central upper part of the frame
    m[: int(H_ * .12)] = False; m[int(H_ * .62):] = False; m[:, : int(W_ * .22)] = False; m[:, int(W_ * .78):] = False
    ys, xs = np.nonzero(m)
    # robust box: ignore stray pixels
    x0, x1 = np.percentile(xs, [2, 98]); y0, y1 = np.percentile(ys, [2, 98])
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2 + 8, (x1 - x0) / 2 * 1.3 + 36, (y1 - y0) / 2 * 1.5 + 44
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
    return mask.filter(ImageFilter.GaussianBlur(14)), dict(cx=round(cx), cy=round(cy), rx=round(rx), ry=round(ry))


def save(im, name):
    im.save(os.path.join(OUT, name + ".webp"), "WEBP", quality=88, method=6)


def main():
    os.makedirs(OUT, exist_ok=True)
    files = {f[:-4] for f in os.listdir(ART) if f.lower().endswith(".png")}
    faces, done = {}, set()
    for key, g in GROUPS.items():
        if g["base"] not in files: continue
        base = Image.open(os.path.join(ART, g["base"] + ".png")).convert("RGBA")
        prefix = g["base"].rsplit("_base", 1)[0] if g["base"].endswith("_base") else g["base"]
        variants = sorted(f for f in files if f.startswith(prefix + "_") and f != g["base"])
        aligned = {}
        for v in variants:
            im = Image.open(os.path.join(ART, v + ".png")).convert("RGBA")
            s, tx, ty = align(base, im)
            aligned[v] = affine(im, s, tx, ty)
            print(f"  {v:22s} scale {s:.2f}  shift ({tx:+d}, {ty:+d})")
        mask, face = face_mask(base, [aligned[p] for p in g["probe"] if p in aligned])
        faces[key] = face
        print(f"{key}: face centre ({face['cx']}, {face['cy']}), radii {face['rx']}×{face['ry']}")
        save(base, g["base"]); done.add(g["base"])
        for v, im in aligned.items():
            save(Image.composite(im, base, mask), v); done.add(v)
    for f in sorted(files - done):                         # poses, background: just convert
        save(Image.open(os.path.join(ART, f + ".png")), f)
    json.dump(faces, open(os.path.join(OUT, "faces.json"), "w"), indent=1)
    total = sum(os.path.getsize(os.path.join(OUT, f)) for f in os.listdir(OUT))
    print(f"{len(os.listdir(OUT)) - 1} images → media/art ({total / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
