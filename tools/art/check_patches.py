#!/usr/bin/env python3
"""100 % check of every face patch (user: "我很在意细节" — the close-up mouth did not line up).

  python3 tools/art/check_patches.py <demo folder> [pose …]

For each patch in media/layers.js: the character layer (char_<pose>.webp) cropped around the patch at full size —
| base | base + patch (opaque) | difference ×4 | — so a double lip line, a shifted jaw or a seam at the patch edge is visible.
Writes <demo>/assets/patch_check/<pose>_<kind>.png and prints the mean edge difference (high = a seam / misalignment).
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageChops, ImageFilter
D = os.path.abspath(sys.argv[1]); only = set(sys.argv[2:])
t = open(os.path.join(D, "media", "layers.js")).read(); data = json.loads(t[t.index("{"):t.rindex("}") + 1])
out = os.path.join(D, "assets", "patch_check"); os.makedirs(out, exist_ok=True)
for stem, v in data["views"].items():
    pose = v["char"]["src"].split("char_")[1].split(".")[0]
    if only and pose not in only: continue
    ch = Image.open(os.path.join(D, "media", v["char"]["src"].split("?")[0])).convert("RGBA")
    for p in v["patches"]:
        x, y, w, h = p["rect"]; pad = max(w, h) // 2
        box = (max(0, x - pad), max(0, y - pad), min(ch.width, x + w + pad), min(ch.height, y + h + pad))
        pt = Image.open(os.path.join(D, "media", p["src"].split("?")[0])).convert("RGBA")
        on = ch.copy(); on.alpha_composite(pt, (x, y))
        a, b = ch.crop(box).convert("RGB"), on.crop(box).convert("RGB")
        d = ImageChops.difference(a, b).point(lambda q: min(255, q * 4))
        # seam score: difference along the patch's feathered rim (should be ~0 if the drawing lines up)
        m = np.asarray(pt.getchannel("A"), np.float32) / 255
        rim = (m > .05) & (m < .6)
        diff = np.asarray(ImageChops.difference(ch.crop((x, y, x + w, y + h)).convert("L"), on.crop((x, y, x + w, y + h)).convert("L")), np.float32)
        score = float(diff[rim].mean()) if rim.any() else 0
        sheet = Image.new("RGB", (a.width * 3 + 20, a.height), (0, 0, 0))
        for i, im in enumerate((a, b, d)): sheet.paste(im, (i * (a.width + 10), 0))
        sheet.save(os.path.join(out, f"{pose}_{p['kind']}.png"))
        print(f"{pose:10s} {p['kind']:6s} rim diff {score:5.1f}  {os.path.relpath(os.path.join(out, f'{pose}_{p[chr(107)+chr(105)+chr(110)+chr(100)]}.png'), D)}")
