#!/usr/bin/env python3
"""Pre-align drawn variants to their base pose when an edit came back re-framed (OpenAI edits can move the figure 100–400 px or
zoom it; tools/art/face_patches.py only searches ±120 px). Wide coarse search (scale 0.80–1.20, ±480 px) on the figure's area,
then fine; the aligned variant overwrites the file (the original is kept as <name>.orig.png). Plain-background poses only.

  python3 tools/art/align_variant.py <demo>/assets/art/<base>.png <variant>.png [<variant>.png …]
"""
import os, shutil, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


def gray(im, k):
    g = im.convert("L"); return np.asarray(g.resize((g.width // k, g.height // k), Image.BILINEAR), np.float32)


def figure_box(base):
    """bounding box of what differs from the plain background colour (sampled at the corners)."""
    a = np.asarray(base.convert("RGB"), np.float32); bg = np.median(np.concatenate([a[:20, :20].reshape(-1, 3), a[:20, -20:].reshape(-1, 3)]), 0)
    m = np.abs(a - bg).sum(2) > 40; ys, xs = np.where(m)
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def search(base, frame, box, scales, offs, k, fill):
    B = gray(base, k); x0, y0, x1, y1 = [v // k for v in box]; ref = B[y0:y1, x0:x1]; best = None
    for s in scales:
        F = gray(frame.resize((round(frame.width * s), round(frame.height * s)), Image.BILINEAR), 1)
        F = F[::k, ::k] if k > 1 else F
        pad = 600 // k; G = np.full((F.shape[0] + 2 * pad, F.shape[1] + 2 * pad), fill, np.float32); G[pad:pad + F.shape[0], pad:pad + F.shape[1]] = F
        for dy, dx in offs:
            yy, xx = y0 + dy // k + pad, x0 + dx // k + pad
            if yy < 0 or xx < 0 or yy + ref.shape[0] > G.shape[0] or xx + ref.shape[1] > G.shape[1]: continue
            d = float(np.mean(np.abs(G[yy:yy + ref.shape[0], xx:xx + ref.shape[1]] - ref)))
            if best is None or d < best[0]: best = (d, s, dx, dy)
    return best


def main():
    base_p, variants = sys.argv[1], sys.argv[2:]
    base = Image.open(base_p).convert("RGB"); W, H = base.size; box = figure_box(base)
    fill = float(np.median(gray(base, 1)[:20, :20]))
    grid = lambda r, st, c=(0, 0): [(c[0] + y, c[1] + x) for y in range(-r, r + 1, st) for x in range(-r, r + 1, st)]
    for vp in variants:
        src = vp.replace(".png", ".orig.png")
        if not os.path.exists(src): shutil.copy(vp, src)
        fr = Image.open(src).convert("RGB")
        _, s0, dx0, dy0 = search(base, fr, box, [.80 + i * .025 for i in range(17)], grid(480, 16), 8, fill)
        _, s1, dx1, dy1 = search(base, fr, box, [s0 + i * .005 for i in range(-5, 6)], grid(24, 4, (dy0, dx0)), 4, fill)
        d, s, dx, dy = search(base, fr, box, [s1 - .002, s1, s1 + .002], grid(4, 1, (dy1, dx1)), 2, fill)
        f = fr.resize((round(W * s), round(H * s)), Image.LANCZOS)
        out = Image.new("RGB", (W, H), tuple(int(v) for v in np.asarray(base)[5, 5])); out.paste(f, (-dx, -dy))
        out.save(vp); print(f"{os.path.basename(vp)}: scale {s:.3f} dx {dx} dy {dy} diff {d:.1f}")


if __name__ == "__main__":
    main()
