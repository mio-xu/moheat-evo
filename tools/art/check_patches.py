#!/usr/bin/env python3
"""100 % check of every face patch (user: "我很在意细节" — the close-up mouth did not line up; 2026-11-08 "嘴的部分都要重点检查").

  python3 tools/art/check_patches.py <demo folder> [pose …]

For each patch in media/layers.js: the character layer (char_<pose>.webp) cropped around the patch at full size —
| base | base + patch (opaque) | difference ×4 | — so a double lip line, a shifted jaw or a seam at the patch edge is visible.
Writes <demo>/assets/patch_check/<pose>_<kind>.png (+ mouths.jpg: every mouth closed / open at 2×) and flags (exit code 1):
  SEAM     mean difference along the patch's feathered rim (the drawing does not line up at the edge)
  OUTER    the outer part of the patch changes (jaw / cheek line, hair or blush moved by the redraw → a second jaw line, hair
           that twitches while talking; Demo18 booth 2026-11-08)
  OUTSIDE  patch alpha where the character layer is transparent (background / beyond the jaw; shared/layers.js clips it, but it
           means the patch was cut from a moved drawing)
  BORDER   patch alpha not 0 at its rectangle's edge (a visible patch rectangle)
  BOUNDS   patch rectangle outside the character image (stale rect after the pose was rebuilt / extended)
  NO-MOUTH a view with eyes patches but no mouth patch (check the story: does he / she talk there?)
  OLD-MOUTH a pose that talks with an old single talk patch ("mouth" / "mouth_quiet") instead of a mouth block set ("mouth_lv",
           tools/art/lp_mouths.py; user 2026-11-08 "some mouths still haven't been changed" — every pose uses the set)
  NO-TEETH a mouth block set built without the anime teeth (lp_mouths.py default; user 2026-11-08: a wide open mouth with no teeth
           looked scary). Both FAIL unless <demo>/project/qa.json "mouth_exceptions": {"<pose>": "reason"} lists the pose.
Runtime lip-sync (opens only while talking, per view, no flicker): node tools/art/check_mouth.js <demo>.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageChops, ImageDraw

D = os.path.abspath(sys.argv[1]); only = set(sys.argv[2:])
t = open(os.path.join(D, "media", "layers.js")).read(); data = json.loads(t[t.index("{"):t.rindex("}") + 1])
out = os.path.join(D, "assets", "patch_check"); os.makedirs(out, exist_ok=True)
LIM = {"mouth": dict(seam=4.0, outer=6.0), "mouth_lv": dict(seam=4.0, outer=6.0), "mouth_quiet": dict(seam=4.0, outer=6.0), "eyes": dict(seam=8.0, outer=40.0)}
flags, seen, mouths = [], set(), []
qf = os.path.join(D, "project", "qa.json"); EXC = (json.load(open(qf, encoding="utf-8")) if os.path.exists(qf) else {}).get("mouth_exceptions", {})
lf = os.path.join(D, "assets", "lp_mouths", "lp_mouths.json"); LPM = json.load(open(lf)) if os.path.exists(lf) else None   # assets/ is local only
for stem, v in [(st, f) for st, v_ in data["views"].items() for f in [v_] + v_.get("more", [])]:   # every figure of every view (several in one: "more")
    pose = v["char"]["src"].split("char_")[1].split(".")[0]
    if only and pose not in only: continue
    kinds = [p["kind"] for p in v.get("patches", [])]
    if not {"mouth", "mouth_quiet", "mouth_lv"} & set(kinds):
        flags.append(f"NO-MOUTH {stem}: no mouth patch ({'+'.join(kinds) or 'no patches'}) — fine only if the face is hidden or nobody talks there")
    if pose in seen: continue
    seen.add(pose)
    if {"mouth", "mouth_quiet"} & set(kinds) and "mouth_lv" not in kinds and pose not in EXC:
        flags.append(f"OLD-MOUTH {pose}: old single talk patch — make it a block set (\"mouth\": \"lp\", tools/art/lp_mouths.py; "
                     f"\"warp\": false / \"view\" / \"hide\" for hard faces) or list it in project/qa.json mouth_exceptions with the reason")
    if "mouth_lv" in kinds and LPM is not None and pose not in EXC and not LPM.get(pose, {}).get("teeth"):
        flags.append(f"NO-TEETH {pose}: mouth set built without teeth — rerun lp_mouths.py {pose} (teeth are the default) + build_stage --mouths-only")
    try: ch = Image.open(os.path.join(D, "media", v["char"]["src"].split("?")[0])).convert("RGBA")
    except Exception as e: flags.append(f"READ {pose}: {e} (being rebuilt?)"); continue
    ca = np.asarray(ch.getchannel("A"), np.float32) / 255
    for p in v.get("patches", []):
        x, y, w, h = p["rect"]; k = p["kind"]; lim = LIM.get(k, LIM["mouth"]); tag = f"{pose}/{k}" + (str(p["level"]) if "level" in p else "")
        if x < 0 or y < 0 or x + w > ch.width or y + h > ch.height:
            flags.append(f"BOUNDS {tag}: rect {p['rect']} outside the {ch.width}×{ch.height} character"); continue
        pad = max(w, h) // 2
        box = (max(0, x - pad), max(0, y - pad), min(ch.width, x + w + pad), min(ch.height, y + h + pad))
        try: pt = Image.open(os.path.join(D, "media", p["src"].split("?")[0])).convert("RGBA")
        except Exception as e: flags.append(f"READ {tag}: {e}"); continue
        if pt.size != (w, h): pt = pt.resize((w, h))
        on = ch.copy(); on.alpha_composite(pt, (x, y))
        a, b = ch.crop(box).convert("RGB"), on.crop(box).convert("RGB")
        d = ImageChops.difference(a, b).point(lambda q: min(255, q * 4))
        m = np.asarray(pt.getchannel("A"), np.float32) / 255
        diff = np.asarray(ImageChops.difference(ch.crop((x, y, x + w, y + h)).convert("L"), on.crop((x, y, x + w, y + h)).convert("L")), np.float32)
        inside = ca[y:y + h, x:x + w] > .5
        rim = (m > .05) & (m < .6) & inside
        seam = float(diff[rim].mean()) if rim.any() else 0
        yy, xx = np.mgrid[0:h, 0:w]; r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2))
        ring = (m > .2) & (r > .62) & inside                       # outer band of the patch: should be (almost) the base drawing
        outer = float(diff[ring].mean()) if ring.any() else 0
        outside = float((m * (ca[y:y + h, x:x + w] < .5)).sum() / max(1, m.sum()))
        border = float(max(m[0].max(), m[-1].max(), m[:, 0].max(), m[:, -1].max()))
        if seam > lim["seam"]: flags.append(f"SEAM {tag}: rim diff {seam:.1f} > {lim['seam']}")
        if outer > lim["outer"]: flags.append(f"OUTER {tag}: outer-ring diff {outer:.1f} > {lim['outer']} (jaw / cheek / hair redrawn)")
        if outside > .01: flags.append(f"OUTSIDE {tag}: {outside * 100:.1f} % of the patch over transparent pixels")
        if border > .04: flags.append(f"BORDER {tag}: alpha {border:.2f} at the rectangle edge")
        sheet = Image.new("RGB", (a.width * 3 + 20, a.height), (0, 0, 0))
        for i, im in enumerate((a, b, d)): sheet.paste(im, (i * (a.width + 10), 0))
        sheet.save(os.path.join(out, f"{pose}_{k}{p.get('level', '')}.png"))
        print(f"{pose:10s} {k:11s} seam {seam:5.1f}  outer {outer:5.1f}  outside {outside * 100:4.1f} %  border {border:.2f}  assets/patch_check/{pose}_{k}.png")
        if k.startswith("mouth"):   # 2× close-up of the mouth on a dark plate: closed | open
            mb = (max(0, x - w // 4), max(0, y - h // 4), min(ch.width, x + w + w // 4), min(ch.height, y + h + h // 4))
            pair = []
            for im in (ch, on):
                bg = Image.new("RGBA", ch.size, (24, 28, 48, 255)); bg.alpha_composite(im); c = bg.crop(mb).convert("RGB")
                pair.append(c.resize((c.width * 2, c.height * 2), Image.LANCZOS))
            mouths.append((tag, pair))
if mouths:
    H = max(p[0].height for _, p in mouths); rows = []
    for tag, (c0, c1) in mouths:
        row = Image.new("RGB", (c0.width + c1.width + 10, H + 22), (0, 0, 0)); row.paste(c0, (0, 22)); row.paste(c1, (c0.width + 10, 22))
        ImageDraw.Draw(row).text((4, 4), f"{tag}: closed | open (2x)", fill=(255, 220, 0)); rows.append(row)
    W = max(r.width for r in rows); sheet = Image.new("RGB", (W, sum(r.height + 6 for r in rows)), (0, 0, 0)); yy = 0
    for r in rows: sheet.paste(r, (0, yy)); yy += r.height + 6
    sheet.save(os.path.join(out, "mouths.jpg"), quality=90); print(f"mouth sheet: assets/patch_check/mouths.jpg")
print("\n".join("  ✗ " + f for f in flags) if flags else "  ✓ patches OK")
sys.exit(1 if any(not f.startswith("NO-MOUTH") for f in flags) else 0)
