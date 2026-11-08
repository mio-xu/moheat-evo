#!/usr/bin/env python3
"""Automatic checks of the 14-point asset standard (USER_PREFERENCES 素材制作标准, DEMO_DESIGN_GUIDE §6 G3 / G4) that the older tools
did not cover. check_demo.py runs it (G4 rows edge-margin / fringe / blink / far-motion); standalone:

  python3 tools/art/check_art.py <demo folder> [--verbose]      # exit 1 on FAIL

  edge-margin  a char layer's cut edge (body touching the picture edge) sits within 3 % of the frame edge: parallax (0.55), breathing
               and the 1.02 zoom can show it (guide: "截断处至少要在画外 3 %"); the cut inside the frame is check_cut_body's FAIL.
  fringe       colour fringe at the cut-out edge: rim pixels closer to the backdrop colour (green #00B140 / magenta #FF00FF / grey)
               than the character's own pixels just inside (§11.1 抠图残色 / 灰边, Demo31). Backdrop = corner of the raw pose in
               assets/ when present, else stage.json "matte".
  blink        per eyes patch: both eyes change (one-eye blink = FAIL), and the iris is gone under the closed lid (the patch is opaque
               over the iris and the iris pixels really change — "闭眼不露瞳孔"; a feathered / ghosted patch shows the iris through).
  looks        same hair colour in every pose of a character; same outfit colour only within one "look" (stage.json pose "look")
  far-motion   mouth opening / blink, measured as changed pixels on a 1920×1080 frame for each view: < 4 px tall = too small to read on a
               far shot → draw a bigger opening / lid for that pose (preference: 远景加大动作).
"""
import json, os, sys
import numpy as np
from PIL import Image

FRAME_H = 1080
MARGIN_OK = 0.015          # a top / side cut edge must sit ≥ 1.5 % outside the frame (the bottom is anchored there on purpose)
KEYS = {'green': (0, 177, 64), 'magenta': (255, 0, 255), 'grey': (200, 200, 200), 'gray': (200, 200, 200), 'midgrey': (112, 112, 112)}


def load_layers(D):
    t = open(os.path.join(D, 'media', 'layers.js'), encoding='utf-8').read()
    return json.loads(t[t.index('{'):t.rindex('}') + 1])


def img(D, src):
    return np.asarray(Image.open(os.path.join(D, 'media', src.split('?')[0])).convert('RGBA')).astype(np.float32)


def stage(D):
    try: return json.load(open(os.path.join(D, 'project', 'stage.json'), encoding='utf-8'))
    except Exception: return {}


def backdrop(D, S, pose):
    """RGB of the plain backdrop the pose was drawn on (raw image corners), else stage.json matte, else None."""
    P = (S.get('poses') or {}).get(pose) or {}
    src = P.get('src')
    if src:
        for ext in ('.png', '.jpg', '.webp'):
            p = os.path.join(D, S.get('src', 'assets/art'), src + ext)
            if os.path.exists(p):
                a = np.asarray(Image.open(p).convert('RGB'))
                c = np.concatenate([a[:12, :12].reshape(-1, 3), a[:12, -12:].reshape(-1, 3), a[-12:, :12].reshape(-1, 3), a[-12:, -12:].reshape(-1, 3)])
                med = np.median(c, 0)
                if np.abs(c - med).mean() < 18: return tuple(float(x) for x in med)   # a plain backdrop, not a scene
                break
    m = P.get('matte') or S.get('matte')
    return KEYS.get(m) if isinstance(m, str) else None


def shift_or(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def fringe(a, key):
    """share of rim pixels (opaque, ≤ 2 px from transparency) that look like the backdrop, minus the same share 4–8 px inside."""
    al = a[..., 3]; rgb = a[..., :3]
    if (al < 30).mean() < 0.02: return None                       # no cut-out
    clear = al < 30
    near = shift_or(clear, 2); mid = shift_or(clear, 8) & ~shift_or(clear, 4)
    rim, inner = near & (al > 60), mid & (al > 200)
    if rim.sum() < 200 or inner.sum() < 200: return None
    k = np.array(key, np.float32)
    if max(key) - min(key) > 80:                                  # chromatic key: spill = the key's hue direction
        if key[1] > key[0]: like = (rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])) > 35          # green spill
        else: like = (np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]) > 55                         # magenta spill
    else:
        like = (np.abs(rgb - k).max(-1) < 28) & ((rgb.max(-1) - rgb.min(-1)) < 18)                       # grey halo
    return float(like[rim].mean() - like[inner].mean()), float(like[rim].mean())


def cut_outside(al, side, c):
    """where the longest straight cut of a layer lands in the 16:9 frame; True when it is ≥ MARGIN_OK outside the frame there."""
    o, t = al[10:-10, 10:-10] > 200, al[10:-10, 10:-10] < 30
    e = {'right': o[:, :-3] & t[:, 3:], 'left': t[:, :-3] & o[:, 3:], 'top': t[:-3] & o[3:], 'bottom': o[:-3] & t[3:]}[side]
    H, W = al.shape; hf = c['height']; wf = hf * (c['w'] / c['h']) * (9 / 16)
    if side in ('right', 'left'):
        x = (int(np.argmax(e.sum(0))) + 10 + (2 if side == 'right' else 1)) / W; fx = c['x'] - wf / 2 + x * wf
        return fx >= 1 + MARGIN_OK if side == 'right' else fx <= -MARGIN_OK
    y = (int(np.argmax(e.sum(1))) + 11) / H; fy = c['y'] - hf + y * hf
    return fy >= 1 + MARGIN_OK if side == 'bottom' else fy <= -MARGIN_OK


def regions(diff, mask):
    """two eye boxes from a changed-pixel map: split at the widest gap of the column profile."""
    cols = (diff * mask).sum(0); idx = np.where(cols > cols.max() * 0.08)[0]
    if len(idx) < 4: return []
    gaps = np.diff(idx)
    if gaps.max() > 3:
        g = int(np.argmax(gaps)); return [(idx[0], idx[g] + 1), (idx[g + 1], idx[-1] + 1)]
    return [(idx[0], idx[-1] + 1)]


def check(D, verbose=False):
    L = load_layers(D); S = stage(D); out = looks(D)   # (level, check, message)
    cache, done_fringe, done_patch = {}, set(), {}
    views = L.get('views', {})
    for stem, v in views.items():
        c = v.get('char')
        if not c: continue
        src = c['src'].split('?')[0]; pose = os.path.basename(src)[5:].rsplit('.', 1)[0] if os.path.basename(src).startswith('char_') else src
        if src not in cache:
            try: cache[src] = img(D, c['src'])
            except Exception as e: out.append(('WARN', 'fringe', f'{src}: {e}')); continue
        a = cache[src]; al = a[..., 3] > 128
        # edge-margin: cut edges between the frame edge and 3 % outside
        hf = c['height']; wf = hf * (c['w'] / c['h']) * (9 / 16)
        pos = {'bottom': c['y'] - 1, 'top': -(c['y'] - hf), 'left': -(c['x'] - wf / 2), 'right': (c['x'] + wf / 2) - 1}
        band = {'bottom': al[-3:], 'top': al[:3], 'left': al[:, :3].T, 'right': al[:, -3:].T}
        for side, b in band.items():
            fill = b.any(0).mean()
            # outside by less than 1.5 % (inside the frame = check_cut_body's FAIL); the bottom is anchored at 1.02 by design
            if side != 'bottom' and fill > 0.04 and 0.005 <= pos[side] < MARGIN_OK:
                out.append(('WARN', 'edge-margin', f'{stem}: {src} {side} edge ({fill:.0%} body) only {pos[side]:.1%} outside the frame — keep ≥ {MARGIN_OK:.1%} (parallax / breathing can show it)'))
        if src not in done_fringe:   # flat head / straight cut INSIDE the picture (hair or shoulder cut along a ruler line: 平头)
            try:
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import check_cut_body
                for side, f in check_cut_body.straight_cuts(a[10:-10, 10:-10, 3]):   # border rows = the picture edge (check_cut_body)
                    if all(cut_outside(a[..., 3], side, w['char']) for w in views.values() if (w.get('char') or {}).get('src', '').split('?')[0] == src):
                        continue   # the ruler line lies ≥ 1.5 % outside the frame in every view that shows this layer (Demo12 call, moved right)
                    out.append(('FAIL' if side == 'top' else 'WARN', 'edge-margin', f'{src}: straight {side} cut {f:.0%} long inside the picture (flat head / ruler-cut body) → tools/art/complete_cutout.py or extend_pose.py'))
            except Exception: pass
        # fringe (once per char layer)
        if src not in done_fringe:
            done_fringe.add(src)
            key = backdrop(D, S, pose)
            if key is not None:
                f = fringe(a, key)
                if f:
                    d, raw = f
                    lvl = 'FAIL' if d > 0.25 else 'WARN' if d > 0.06 else None
                    if verbose: print(f'  fringe {src}: rim {raw:.1%} backdrop-like (+{d:.1%} vs inside), key {tuple(int(x) for x in key)}')
                    if lvl: out.append((lvl, 'fringe', f'{src}: {raw:.0%} of the cut-out rim has the backdrop colour {tuple(int(x) for x in key)} (+{d:.0%} vs the pixels inside) → tools/art/clean_cutout.py / matte "ai"'))
        # patches
        scale = FRAME_H * c['height'] / c['h']              # char px → 1080p frame px
        patches = v.get('patches', [])
        mouths = [p for p in patches if p['kind'] in ('mouth', 'mouth_lv')]
        if mouths:
            p = max(mouths, key=lambda p: p.get('level', 9))
            key = ('m', p['src'])
            if key not in done_patch:
                done_patch[key] = patch_change(D, a, p)
            ch = done_patch[key]
            if ch is not None:
                h_px = ch[0] * scale
                if verbose: print(f'  mouth {stem}: opening {ch[0]} px tall in the art → {h_px:.1f} px at 1080p')
                if h_px < 4: out.append(('WARN', 'far-motion', f'{stem}: the mouth opening is {h_px:.1f} px tall on a 1080p frame — too small to read; draw a bigger opening for this far shot'))
        for p in patches:
            if p['kind'] != 'eyes': continue
            key = ('e', p['src'])
            if key not in done_patch:
                done_patch[key] = patch_change(D, a, p, eyes=True)
                ch = done_patch[key]
                if ch is not None:
                    _, sides, iris = ch
                    if verbose: print(f'  eyes {stem}: changed mass left / right {sides[0]:.0f} / {sides[1]:.0f}; iris left (pixels kept, opacity) {iris.get("left")}, right {iris.get("right")}')
                    lo, hi = min(sides), max(sides)
                    if hi > 0 and lo / hi < 0.15:
                        out.append(('FAIL' if (p['rect'][2] / max(p['rect'][3], 1)) > 1.6 else 'WARN', 'blink',
                                    f'{stem}: {p["src"].split("?")[0]} changes only one eye ({lo / hi:.0%} on the other side) — one-eye blink; both eyes must close (masked edit over both)'))
                    for side, (kept, alpha) in iris.items():
                        if kept > 0.45 or (alpha < 0.5 and kept > 0.2):
                            out.append(('FAIL', 'blink', f'{stem}: {p["src"].split("?")[0]} {side} eye: {kept:.0%} of the open iris only half covered, patch {alpha:.0%} opaque there — iris through the closed lid ("no iris visible" masked edit)'))
                        elif kept > 0.28:
                            out.append(('WARN', 'blink', f'{stem}: {p["src"].split("?")[0]} {side} eye: {kept:.0%} of the open iris only half covered under the closed lid — look at 2×'))
            ch = done_patch[key]
            if ch is not None:
                h_px = ch[0] * scale
                if h_px < 3: out.append(('WARN', 'far-motion', f'{stem}: the blink changes {h_px:.1f} px on a 1080p frame — too small to read; bigger lids for this far shot'))
    return out


def looks(D):
    """Same person across ALL poses (hair colour), same outfit only within one look (user 2026-11-08: 换装由剧情交代，每套造型登记为一个
    look). stage.json poses may say "look": "<id>" (docs/characters/<id>.md looks[]) and "character": "<id>" (several people in a demo)."""
    S = stage(D); out = []; groups = {}
    for pose, P in (S.get('poses') or {}).items():
        f = os.path.join(D, 'media', 'art', f'char_{pose}.webp')
        if not os.path.exists(f): continue
        a = np.asarray(Image.open(f).convert('RGBA')).astype(np.float32)
        rows = np.where((a[..., 3] > 200).sum(1) > a.shape[1] * 0.02)[0]
        if len(rows) < 20: continue
        y0, y1 = rows[0], rows[-1]; hgt = y1 - y0
        top = a[y0:y0 + max(4, int(hgt * 0.12))]; bot = a[y1 - max(4, int(hgt * 0.2)):y1]
        med = lambda b: np.median(b[..., :3][b[..., 3] > 200], 0) if (b[..., 3] > 200).sum() > 50 else None
        who = P.get('character') or str(P.get('src', pose)).split('_')[0]
        groups.setdefault(who, []).append((pose, P.get('look', 'default'), med(top), med(bot)))
    for who, g in groups.items():
        hair = [x for x in g if x[2] is not None]
        if len(hair) > 1:
            ref = np.median([x[2] for x in hair], 0)
            for pose, lk, h, _ in hair:
                d = float(np.abs(h - ref).max())
                if d > 80: out.append(('WARN', 'looks', f'{who}/{pose}: hair colour {tuple(int(v) for v in h)} differs from the other poses {tuple(int(v) for v in ref)} (Δ{d:.0f}) — same person in every pose (poses_preview.jpg)'))
        by = {}
        for pose, lk, _, o in g:
            if o is not None: by.setdefault(lk, []).append((pose, o))
        for lk, xs in by.items():
            if len(xs) < 2: continue
            ref = np.median([o for _, o in xs], 0)
            for pose, o in xs:
                d = float(np.abs(o - ref).max())
                if d > 90: out.append(('WARN', 'looks', f'{who}/{pose}: outfit colour {tuple(int(v) for v in o)} differs inside look "{lk}" (Δ{d:.0f}) — a new outfit needs its own "look" in stage.json + the character card, motivated by the story'))
    return out


def patch_change(D, a, p, eyes=False):
    """height (art px) of the changed area of a patch over its char layer; for eyes also the eye boxes and the iris test."""
    x, y, w, h = p['rect']
    if x < 0 or y < 0 or y + h > a.shape[0] or x + w > a.shape[1]: return None
    try: pt = img(D, p['src'])
    except Exception: return None
    if pt.shape[:2] != (h, w): pt = np.asarray(Image.fromarray(pt.astype(np.uint8)).resize((w, h))).astype(np.float32)
    base = a[y:y + h, x:x + w, :3]; pa = pt[..., 3:4] / 255
    comp = base * (1 - pa) + pt[..., :3] * pa
    diff = np.abs(comp - base).max(-1)
    m = diff > 30
    rows = np.where(m.sum(1) > max(2, w * 0.01))[0]
    height = int(rows[-1] - rows[0] + 1) if len(rows) else 0
    if not eyes: return (height,)
    # split at the quietest column of the middle half (between the eyes); both sides must change
    prof = np.convolve(m.sum(0).astype(np.float32), np.ones(9) / 9, 'same')
    q0, q1 = w // 4, 3 * w // 4
    cut = q0 + int(np.argmin(prof[q0:q1])) if q1 > q0 else w // 2
    sides = (float(m[:, :cut].sum()), float(m[:, cut:].sum()))
    iris = {}
    for side, (x0, x1) in (('left', (0, cut)), ('right', (cut, w))):
        zone = m[:, x0:x1]
        if zone.sum() < 30: continue
        ys, xs = np.where(zone); y0, y1, xa, xb = ys.min(), ys.max() + 1, xs.min() + x0, xs.max() + 1 + x0
        bl, cl = base[y0:y1, xa:xb].mean(-1), comp[y0:y1, xa:xb].mean(-1)
        skin = np.percentile(cl, 70)                                  # the closed lid is mostly skin
        r = max(2, int((y1 - y0) * 0.08))
        # the iris / pupil disc of the OPEN eye: dark, thick (thin lash lines vanish under the opening)
        thr_b = skin - 0.45 * (skin - np.percentile(bl, 8))
        disc = opening(bl < thr_b, r)
        if disc.sum() < 20: continue
        # ghost = the disc only half covered: lighter than the open iris but not yet skin (an unchanged pixel is hair over the eye,
        # a fully changed one is lid / skin). A semi-transparent or "ghosted" redraw leaves many half-way pixels.
        ratio = (cl - bl) / max(1.0, skin - np.percentile(bl[disc], 50))
        kept = ((ratio > 0.12) & (ratio < 0.6) & disc).sum() / disc.sum()
        iris[side] = (float(kept), float(pa[y0:y1, xa:xb, 0][disc].mean()))
    return height, sides, iris


def erode(m, r):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o &= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def opening(m, r):
    """remove thin lines (lashes, lid creases), keep blobs at least 2r+1 px thick."""
    return shift_or(erode(m, r), r)


if __name__ == '__main__':
    D = os.path.abspath(sys.argv[1]); vb = '--verbose' in sys.argv
    res = check(D, vb)
    for lvl, k, msg in res: print(f'{lvl:5} {k:12} {msg}')
    print(f'{sum(1 for r in res if r[0] == "FAIL")} FAIL, {sum(1 for r in res if r[0] == "WARN")} WARN')
    sys.exit(1 if any(r[0] == 'FAIL' for r in res) else 0)
