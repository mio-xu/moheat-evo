#!/usr/bin/env python3
"""Mouth sets from LivePortrait: every mouth level of a pose is warped from that pose's OWN picture (DEMO_DESIGN_GUIDE §6 mouth step).

Two separately drawn images (closed / open) never have the same mouth corners, so the old patch swap jumps. Here closed + every open
level come out of one render pipeline and are cut as ONE fixed block (same rectangle, same feather): the page always shows a block of
the set, so a redrawn mouth is never compared with the original line.

  ~/ml/LivePortrait/.venv/bin/python tools/art/lp_mouths.py <demo> [pose …] [--probe] [--force] [--sheet]

Poses: those named on the command line, else every pose with "mouth": "lp" in project/stage.json. Per pose (all optional):
  "lp": { "view": {"box", "rotate", "scale"} (what LivePortrait is shown: crop / turn / shrink the face first when it finds no face),
          "lips": [.1, .2, .34] (LivePortrait opening per level; lower = safer on anime faces), "minh": .26 (smallest height of the widest
          opening, fraction of the mouth width: lower for realistic / adult faces, Demo24 Gaku .16), "light": 0..1 (interior blended
          toward a shaded skin tone: pastel styles, Demo20 .4), "pad": 1.5 (block size around the moving part),
          "centre": [x, y] + "radius": [rx, ry] (fixed block, source px), "src": other picture to warp (must be the same size),
          "warp": false (no LivePortrait: the opening grows on the DRAWN closed line, "lift" .12 / "drop" .22 of the mouth width — strong
          profiles, fingers over the mouth), "hide": [[[x, y], …]] (source px polygons in front of the mouth: the opening is clipped),
          "drawn_open": true (drawn with the teeth showing: the drawn grin is the starting shape), "teeth": false | {…} (below) }
A pose drawn open with a "quiet" (closed) variant: the quiet patch is pasted first, so the set is warped from the closed face.
Writes <demo>/assets/lp_mouths/<pose>_lv<k>.png (k = 0 closed … n widest, RGBA, source px, full block) + lp_mouths.json; then
python3 tools/art/build_stage.py <demo> takes them for poses with "mouth": "lp". --probe = only say which poses have a detectable face.
--sheet = <pose>_sheet.jpg at 2×: old patch | LivePortrait block set.
"""
import hashlib, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
args = [a for a in sys.argv[1:] if not a.startswith("--")]; flags = {a for a in sys.argv[1:] if a.startswith("--")}
D = os.path.abspath(args[0]); ONLY = args[1:]
sys.argv = sys.argv[:1]      # lp_pose rewrites argv at import
sys.path.insert(0, os.path.join(HERE, "..", "animate"))
import cv2, numpy as np
from PIL import Image, ImageDraw
import lp_pose                # chdir → ~/ml/LivePortrait (paths above are absolute)

LIPS = [.1, .2, .34]; PAD = 1.5; MINH = .26
LP_DEEP, LP_TONGUE = [82, 38, 46], [168, 92, 98]   # mouth interior, muted (a saturated red read as lipstick on male faces, Demo12 Ren)
cfg = json.load(open(os.path.join(D, "project", "stage.json")))
SRC = os.path.join(D, cfg.get("src", "assets/art")); OUT = os.path.join(D, "assets", "lp_mouths"); os.makedirs(OUT, exist_ok=True)
poses = {k: v for k, v in cfg["poses"].items() if (k in ONLY if ONLY else v.get("mouth") == "lp")}
metaf = os.path.join(OUT, "lp_mouths.json"); meta = json.load(open(metaf)) if os.path.exists(metaf) else {}
t = open(os.path.join(D, "media", "layers.js")).read(); LAYERS = json.loads(t[t.index("{"):t.rindex("}") + 1])["views"]


def char_info(pose):
    for v in LAYERS.values():
        if f"char_{pose}." in v["char"]["src"]: return v
    return None


def source_for(name, p):
    """the picture to warp: the pose's source, or (drawn open + quiet variant) the source with its closed-mouth patch pasted in"""
    path = os.path.join(SRC, p.get("lp", {}).get("src", p["src"]) + ".png"); kept = os.path.join(OUT, f"_{name}_closed.png")
    if os.path.exists(kept): return kept     # built before: with "mouth": "lp" the quiet patch is no longer in layers.js
    v = char_info(name); q = next((x for x in (v or {}).get("patches", []) if x["kind"] == "mouth_quiet"), None)
    if not q: return path
    im = Image.open(path).convert("RGBA"); x0, y0 = v["char"]["box"][:2]; f = v["char"]["w"] / (v["char"]["box"][2] - v["char"]["box"][0])
    pt = Image.open(os.path.join(D, "media", q["src"].split("?")[0])).convert("RGBA"); x, y, w, h = q["rect"]
    pt = pt.resize((round(w / f), round(h / f)), Image.LANCZOS); im.alpha_composite(pt, (round(x / f + x0), round(y / f + y0)))
    tmp = os.path.join(OUT, f"_{name}_closed.png"); im.convert("RGB").save(tmp); return tmp


def smooth1(v, sig):
    return cv2.GaussianBlur(np.asarray(v, np.float32).reshape(-1, 1), (0, 0), sigmaX=1, sigmaY=max(.5, sig), borderType=cv2.BORDER_REPLICATE).ravel()


def opening(Sn, S0, B, a, minh=None):
    """the widest level's opening as a clean lens: axis (PCA of the opening), per-position top / bottom edges, the drawn closed line.
    The opening = where the render changed most (palette-free: warm photo teeth on a pale face are invisible to a colour test, Demo17 whisper).
    LivePortrait draws photo teeth / a noisy interior there; only its OUTLINE is used. Returns None if nothing opened."""
    ch = cv2.GaussianBlur(np.abs(Sn - S0).max(2), (0, 0), 1.5)
    sv = cv2.GaussianBlur(Sn, (0, 0), 1); val = sv.max(2) / 255; sat = (sv.max(2) - sv.min(2)) / np.maximum(sv.max(2), 1)
    teeth = (((sat < .2) & (val > .55)) | (val < .5)) & (ch > 12)        # the render's teeth / dark interior belong to the opening too (Demo18 taiko)
    h = (((ch > max(16, ch[a > 100].max() * .35)) | teeth) & (a > 100)).astype(np.uint8)
    h = cv2.morphologyEx(h, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    cy_, cx_ = (np.array(a.shape) - 1) / 2; yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    h &= (((xx - cx_) / (cx_ * .7)) ** 2 + ((yy - cy_) / (cy_ * .62)) ** 2 < 1).astype(np.uint8)   # never the nostril / hair / jaw inside the block
    n, lab, st, _ = cv2.connectedComponentsWithStats(h, 8)
    if n < 2 or st[1:, cv2.CC_STAT_AREA].max() < 24: return None
    big = 1 + np.where(st[1:, cv2.CC_STAT_AREA] >= .15 * st[1:, cv2.CC_STAT_AREA].max())[0]   # the opening may come in pieces (dark corner + teeth, Demo18 taiko)
    ys, xs = np.where(np.isin(lab, big))
    c = np.array([xs.mean(), ys.mean()]); u, _, _ = np.linalg.svd(np.cov(np.stack([xs - c[0], ys - c[1]])))
    ax = u[:, 0] * (1 if u[0, 0] >= 0 else -1); nr = np.array([-ax[1], ax[0]])
    du = (xs - c[0]) * ax[0] + (ys - c[1]) * ax[1]; dv = (xs - c[0]) * nr[0] + (ys - c[1]) * nr[1]
    u0, u1 = du.min(), du.max(); bins = np.arange(0, int(u1 - u0) + 1); top, bot = np.full(len(bins), np.nan), np.full(len(bins), np.nan)
    for i in bins:
        m = np.abs(du - (u0 + i)) < 1.5
        if m.any(): top[i], bot[i] = np.percentile(dv[m], 6), np.percentile(dv[m], 94)
    ok = ~np.isnan(top); top = np.interp(bins, bins[ok], top[ok]); bot = np.interp(bins, bins[ok], bot[ok])
    sig = max(2, len(bins) * .16); top, bot = smooth1(top, sig), smooth1(bot, sig)
    # the closed line, along the same axis: the darkest row of the drawing in each position
    gb = cv2.GaussianBlur(B.mean(2), (0, 0), 1); line = []
    for i in bins:
        vs = np.arange(-int(max(a.shape) * .25), int(max(a.shape) * .25)); xq = c[0] + ax[0] * (u0 + i) + nr[0] * vs; yq = c[1] + ax[1] * (u0 + i) + nr[1] * vs
        vals = cv2.remap(gb, xq.astype(np.float32).reshape(-1, 1), yq.astype(np.float32).reshape(-1, 1), cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).ravel()
        line.append(float(vs[int(np.argmin(vals))]))
    line = smooth1(np.clip(line, top.min() - 2, bot.max() + 2), sig)
    # readable at any size (user: Jin "doesn't move" — too subtle): the widest opening is at least MINH of the mouth's width, mostly
    # downwards (the jaw drops); LivePortrait opens some anime faces only a sliver (Demo18 taiko)
    n_ = len(bins); mh = MINH if minh is None else minh; top = np.minimum(top, line - mh * .3 * n_); bot = np.maximum(bot, line + mh * .7 * n_)
    return dict(c=c, ax=ax, nr=nr, u0=u0, top=top, bot=bot, line=line)


def drawn_lens(B, a, wm, lift=.12, drop=.22, dark=45):
    """no opening in the render (side faces): build the lens on the DRAWN closed line itself; its ends are the drawn corners"""
    g = cv2.GaussianBlur(B.mean(2), (0, 0), .8); cy_, cx_ = (np.array(a.shape) - 1) / 2; yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    inner = ((xx - cx_) / (cx_ * .7)) ** 2 + ((yy - cy_) / (cy_ * .62)) ** 2 < 1
    m = ((g < np.median(g[inner]) - dark) & inner).astype(np.uint8)   # "dark": lower for a faint / thin drawn line (Demo20 hands)
    n, lab, st, _ = cv2.connectedComponentsWithStats(cv2.dilate(m, np.ones((5, 5), np.uint8)), 8)
    if n < 2: return None
    k = 1 + int(np.argmax(np.hypot(st[1:, cv2.CC_STAT_WIDTH], st[1:, cv2.CC_STAT_HEIGHT])))   # the longest dark stroke = the mouth line (not a fang / nostril blob, Demo43 hinata_ear)
    ys, xs = np.where((lab == k) & (m > 0))
    c = np.array([xs.mean(), ys.mean()]); u, _, _ = np.linalg.svd(np.cov(np.stack([xs - c[0], ys - c[1]])))
    ax = u[:, 0] * (1 if u[0, 0] >= 0 else -1); nr = np.array([-ax[1], ax[0]])
    du = (xs - c[0]) * ax[0] + (ys - c[1]) * ax[1]; dv = (xs - c[0]) * nr[0] + (ys - c[1]) * nr[1]
    u0, u1 = du.min(), du.max(); bins = np.arange(0, int(u1 - u0) + 1); line = np.full(len(bins), np.nan)
    for i in bins:
        q = np.abs(du - (u0 + i)) < 1.5
        if q.any(): line[i] = dv[q].mean()
    ok = ~np.isnan(line); line = smooth1(np.interp(bins, bins[ok], line[ok]), max(2, len(bins) * .07))
    H = (u1 - u0); return dict(c=c, ax=ax, nr=nr, u0=u0, top=line - H * lift, bot=line + H * drop, line=line)


def lens_edges(L, f):
    """top / bottom edge of the opening at fraction f of the widest one (lens coordinates) + the lens → picture mapping"""
    n = len(L["top"]); e = np.sin(np.linspace(0, np.pi, n)) ** .55; e2 = np.sin(np.linspace(0, np.pi, n)) ** .85; b = L["line"]
    b0, b1 = L.get("top0", b), L.get("bot0", b)   # a mouth drawn open (a toothy grin): the drawn opening is the starting shape
    top = b0 + (L["top"] - b0) * f * e; bot = b1 + (L["bot"] - b1) * f * e2   # rounder lower edge (the jaw), not a flat slab
    uu = L["u0"] + np.arange(n); P = lambda v: L["c"] + np.outer(uu, L["ax"]) + np.outer(v, L["nr"])
    return top, bot, P


def poly_mask(poly, shape, S_=4):
    m = np.zeros((shape[0] * S_, shape[1] * S_), np.uint8); cv2.fillPoly(m, [np.round(poly * S_).astype(np.int32)], 255)
    return cv2.resize(m, (shape[1], shape[0]), interpolation=cv2.INTER_AREA).astype(np.float32) / 255


def drawn_opening(B, a, L):
    """"drawn_open": the pose is drawn with the teeth showing (Demo18 wave / race grin). Finds the drawn teeth + dark gap inside the
    lips along the lens axis → top0 / bot0 (the lens starts as the drawn grin, so no drawn tooth is left half-covered) and makes the
    widest opening enclose it."""
    S = cv2.GaussianBlur(B, (0, 0), .8); val = S.max(2) / 255; sat = (S.max(2) - S.min(2)) / np.maximum(S.max(2), 1)
    cy_, cx_ = (np.array(a.shape) - 1) / 2; yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    inner = ((xx - cx_) / (cx_ * .75)) ** 2 + ((yy - cy_) / (cy_ * .65)) ** 2 < 1
    m = ((((sat < .22) & (val > .72)) | (val < .32)) & inner).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
    if n < 2: return L
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); ys, xs = np.where(lab == k)
    du = (xs - L["c"][0]) * L["ax"][0] + (ys - L["c"][1]) * L["ax"][1] - L["u0"]; dv = (xs - L["c"][0]) * L["nr"][0] + (ys - L["c"][1]) * L["nr"][1]
    nb = len(L["line"]); t0, b0 = L["line"].copy(), L["line"].copy()
    for i in range(nb):
        q = np.abs(du - i) < 1.5
        if q.any(): t0[i] = min(t0[i], dv[q].min() - 1); b0[i] = max(b0[i], dv[q].max() + 1)
    sig = max(2, nb * .09); t0, b0 = smooth1(t0, sig), smooth1(b0, sig)
    return {**L, "top0": t0, "bot0": b0, "top": np.minimum(L["top"], t0 - 1), "bot": np.maximum(L["bot"], b0 + 2)}


def lens_mask(L, f, shape):
    """the opening at fraction f of the widest one: edges pulled towards the drawn closed line; ends taper, so the corners stay on the drawn line"""
    top, bot, P = lens_edges(L, f)
    return poly_mask(np.concatenate([P(top), P(bot)[::-1]]), shape)


def taper(n, lo, hi):
    """0 at the mouth corners → 1 in the middle (sin profile between lo and hi): teeth / tongue never reach the corners"""
    return np.clip((np.sin(np.linspace(0, np.pi, n)) - lo) / (hi - lo), 0, 1) ** .7


def teeth_masks(L, f, shape, T, tongue=0.):
    """anime teeth (user 2026-11-08: a wide open mouth with no teeth looked scary, "but don't make it realistic"): ONE flat upper band
    hanging from the opening's top edge (same thickness T, same left / right ends at every level, so it stays put while talking; never
    above the top edge = never over the lip line) + optionally a tongue mound on the bottom edge. Both clipped to the opening."""
    top, bot, P = lens_edges(L, f); n = len(top); h = np.maximum(bot - top, 0)
    tb = top + np.minimum(T * taper(n, .35, .62), h * .4)   # never more than ~half the opening: the dark gap stays readable
    tm = poly_mask(np.concatenate([P(top - 1.5), P(tb)[::-1]]), shape)   # starts 1.5 px above the edge, the opening clips it (no gap under the line)
    gm = None
    if tongue > 0:
        gt = bot - np.minimum(h * tongue * taper(n, .55, .85), h * .42)
        gm = poly_mask(np.concatenate([P(gt), P(bot + 1.5)[::-1]]), shape)
    return tm, gm


def refine(B, S0, Sk, a, L, f, light=0., teeth=None, tongue_f=0.):
    """LivePortrait's 512 px render is soft and fills the opening with photo teeth. Keep its GEOMETRY, restore the drawing: where the
    render did not change, the base's own pixels (crisp lines, the corners as drawn); leftover teeth inpainted; the opening a clean flat anime lens."""
    change = cv2.GaussianBlur(np.abs(Sk - S0).max(2), (0, 0), 1.2)
    w = np.clip(1 - change / 26, 0, 1)[..., None]; w = w * w * (3 - 2 * w)
    out = Sk + w * (B - S0)
    out = out + (1 - w) * (out - cv2.GaussianBlur(out, (0, 0), 1.2)) * .9   # the moved lips come from a 512 px render: re-sharpen them
    if L is None: return out
    m = lens_mask(L, f, B.shape[:2]); keep = L.get("keep", 1.)   # "hide": fingers / props in front of the mouth clip the opening
    S = cv2.GaussianBlur(Sk, (0, 0), 1); val = S.max(2) / 255; sat = (S.max(2) - S.min(2)) / np.maximum(S.max(2), 1)
    rest = (((sat < .18) & (val > .55)) | (val < .55)) & (change > 14) & (m < .5) & (a > 30)
    if rest.any():
        out = cv2.inpaint(np.clip(out, 0, 255).astype(np.uint8), cv2.dilate(rest.astype(np.uint8), np.ones((3, 3), np.uint8)), 4, cv2.INPAINT_TELEA).astype(np.float32)
    ys = np.where(m.max(1) > .5)[0]
    if not len(ys): return out
    t = np.clip((np.arange(m.shape[0]) - ys[0]) / max(1, ys[-1] - ys[0]), 0, 1)[:, None, None]
    deep, tongue = np.array(LP_DEEP, np.float32), np.array(LP_TONGUE, np.float32)
    ring = (a > 20) & (a < 120); skin = np.median(B[ring] if ring.sum() > 30 else B.reshape(-1, 3), 0)
    tint = np.clip(skin / np.array([244, 206, 190], np.float32), .45, 1.15)   # the scene's light on the skin (blue bar light, Demo19 flame; night)
    fill = (deep + (tongue - deep) * np.clip((t - .5) / .5, 0, 1) * (.3 if teeth else 1)) * tint   # with teeth: the tongue is its own shape
    fill = fill + (skin * np.array([.86, .62, .66], np.float32) - fill) * light   # "light": a softer interior for pastel styles (Demo20)
    skinside = (a > 150) & (B[..., 1] <= B[..., 0] + 4)   # the drawing's own line colour, never the chroma background at a profile's edge (Demo25 pray: green rim)
    line = np.percentile(B[skinside] if skinside.sum() > 50 else B.reshape(-1, 3), 2, axis=0); upper = np.clip(1.15 - t * 1.0, .35, 1)   # the upper edge is drawn darker, as anime mouths are
    edge = (np.clip(cv2.GaussianBlur(cv2.dilate(m, np.ones((3, 3), np.uint8)), (0, 0), .7) - m, 0, 1) * keep)[..., None]
    m = m * keep
    out = out + (line - out) * edge * upper * .85
    out = out + (fill - out) * m[..., None]
    if teeth:   # colours from this character's own skin under this scene's light: a low-saturation, lighter version of it
        lum = lambda c: float(c @ np.array([.3, .59, .11], np.float32)); g = lum(skin)
        tc = g + (skin - g) * teeth.get("sat", .45); tc = tc * min(246 / max(tc.max(), 1), max(1.0, g * teeth.get("bright", 1.07) / max(lum(tc), 1)))
        tm, gm = teeth_masks(L, f, B.shape[:2], teeth["T"], tongue_f)
        if gm is not None:   # a hint of tongue at the bottom of the widest opening only
            tg = np.array(LP_TONGUE, np.float32) * tint; tg = tg + (skin * np.array([.92, .7, .72], np.float32) - tg) * light
            out = out + (tg - out) * (gm * m)[..., None] * teeth.get("tongue_a", .65)
        ys2 = np.where(tm.max(1) > .5)[0]
        sh = np.ones(tm.shape, np.float32)
        if len(ys2):   # a soft shadow under the upper lip: the top of the band is a little darker (no tooth lines)
            r = np.clip((np.arange(tm.shape[0]) - ys2[0]) / max(1, ys2[-1] - ys2[0] + 1), 0, 1)[:, None]; sh = sh * (.8 + .2 * np.clip(r * 2.0, 0, 1))
        tcol = tc[None, None, :] * sh[..., None]
        tm = cv2.GaussianBlur(tm, (0, 0), .6)   # soft lower edge, no tooth lines
        out = out + (tcol - out) * (tm * m)[..., None] * teeth.get("alpha", .9)
    return out


def to_src(r512, M, size):   # the 512 px face render back to the source picture
    return cv2.warpAffine(r512, M[:2, :3].astype(np.float32), size, flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


share = None
for name, p in poses.items():
    lp = p.get("lp", {}); path = source_for(name, p)
    # "view": {"box": [x0, y0, x1, y1], "rotate": deg, "scale": s} — LivePortrait sees this crop of the picture, turned upright / made
    # smaller with a margin (its face detector misses tilted or very large close-up faces: Demo43 hinata_ear); results are mapped back
    vw = lp.get("view"); A = None; lp_path = path
    if vw:
        src_im = cv2.imread(path); bx0, by0, bx1, by1 = vw.get("box", [0, 0, src_im.shape[1], src_im.shape[0]]); sc = vw.get("scale", 1.)
        vwW, vwH = round((bx1 - bx0) * sc), round((by1 - by0) * sc)
        A = cv2.getRotationMatrix2D(((bx0 + bx1) / 2, (by0 + by1) / 2), vw.get("rotate", 0), sc)
        A[:, 2] += [vwW / 2 - (bx0 + bx1) / 2, vwH / 2 - (by0 + by1) / 2]
        lp_path = os.path.join(OUT, f"_{name}_view.png"); cv2.imwrite(lp_path, cv2.warpAffine(src_im, A, (vwW, vwH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE))
    H, W = cv2.imread(path).shape[:2]; size = (W, H); lips = lp.get("lips", LIPS)
    if lp.get("warp", True):
        try:
            pup = lp_pose.Puppet(lp_path, share=share)
        except SystemExit as e:
            print(f"{name}: NO FACE ({e})"); meta.pop(name, None); continue
        share = share or pup
        if "--probe" in flags: print(f"{name}: face ok, lip0 {pup.lip0:.2f}"); continue
        M = pup.M
        if A is not None:   # 512 px render → view → source picture
            Ai = cv2.invertAffineTransform(A); M = np.vstack([Ai, [0, 0, 1]]) @ np.vstack([M[:2, :3], [0, 0, 1]])
            pup.lmk = (np.c_[pup.lmk[:, :2], np.ones(len(pup.lmk))] @ Ai.T)
        r0 = pup.frame(raw=True); rs = [pup.frame(lip=l, raw=True) for l in lips]
        S0 = to_src(r0, M, size).astype(np.float32); SS = [to_src(r, M, size).astype(np.float32) for r in rs]
    else:   # "warp": false — LivePortrait cannot read this face (strong profile, fingers over the mouth): the opening is built on the
        # drawn closed line only (drawn_lens), same block / feather / levels / teeth; needs "centre" + "radius"
        if not lp.get("centre"): print(f"{name}: \"warp\": false needs \"centre\" + \"radius\""); continue
        if "--probe" in flags: print(f"{name}: no warp (drawn line)"); continue
        S0 = np.asarray(Image.open(path).convert("RGB"), np.float32); SS = [S0] * len(lips); pup = type("NoLP", (), {"lip0": 0.})()
    # the block: where the widest opening moved anything (biggest connected blob), unless given
    if lp.get("centre"): cx, cy = lp["centre"]; rx, ry = lp["radius"]
    else:   # around the lips (LivePortrait landmarks), never the whole moving area: the jaw moves too (a second chin line, Demo25 pray)
        P = lambda i: pup.lmk[i]
        c1, c2, u_, d_ = P(48), P(66), P(90), P(102); wm = np.hypot(*(c1 - c2)); cx, cy = (c1 + c2) / 2
        cy += wm * .06; rx = wm * .5 * lp.get("pad", PAD) * .8 + 6; ry = wm * .38 * lp.get("pad", PAD) * .8 + 6
    feather = max(5, round(min(rx, ry) * .28)); rx_, ry_ = rx + feather * 2, ry + feather * 2
    x0, y0, x1, y1 = max(0, int(cx - rx_)), max(0, int(cy - ry_)), min(W, int(cx + rx_) + 1), min(H, int(cy + ry_) + 1)
    w, h = x1 - x0, y1 - y0
    mask = Image.new("L", (w * 2, h * 2), 0)
    ImageDraw.Draw(mask).ellipse([(cx - rx - x0) * 2, (cy - ry - y0) * 2, (cx + rx - x0) * 2, (cy + ry - y0) * 2], fill=255)
    a = cv2.GaussianBlur(np.asarray(mask.resize((w, h), Image.LANCZOS), np.float32), (0, 0), feather)
    a = np.clip(a, 0, 255).astype(np.uint8)
    border = max(a[0].max(), a[-1].max(), a[:, 0].max(), a[:, -1].max())
    if border > 4: a = (np.clip((a.astype(np.float32) - border) / (255 - border), 0, 1) * 255).astype(np.uint8)
    B = np.asarray(Image.open(path).convert("RGB"), np.float32)[y0:y1, x0:x1]; C0 = S0[y0:y1, x0:x1]
    L = opening(SS[-1][y0:y1, x0:x1], C0, B, a, lp.get("minh")) if lp.get("warp", True) else None; kind = "render"
    if L is None: L = drawn_lens(B, a, wm if not lp.get("centre") else rx, lp.get("lift", .12), lp.get("drop", .22), lp.get("dark", 45)); kind = "drawn line"
    if L is not None and lp.get("hide"):   # occluders (source px polygons) → the opening never paints over them
        hm = np.zeros(a.shape, np.uint8)
        for poly in lp["hide"]: cv2.fillPoly(hm, [np.round(np.array(poly, np.float32) - [x0, y0]).astype(np.int32)], 255)
        L["keep"] = 1 - cv2.GaussianBlur(hm.astype(np.float32) / 255, (0, 0), .8)
    if L is None: print(f"{name}: WARN no opening found (render kept as is)"); kind = "none"
    elif lp.get("drawn_open"): L = drawn_opening(B, a, L); kind += " + drawn grin"
    # teeth (default; "teeth": false per pose or --no-teeth): from level 2 up, one band thickness for the whole set (stays put);
    # the tongue hint on the widest level only. "teeth": {"band": .06 (thickness, fraction of the mouth width), "alpha": .9,
    # "sat": .45, "bright": 1.07, "tongue": .5, "tongue_a": .65} — realistic / adult faces lower alpha + band (subtle)
    tcfg = lp.get("teeth", {}); tcfg = None if (tcfg is False or "--no-teeth" in flags or L is None) else dict(tcfg)
    if tcfg is not None:
        t1, b1, _ = lens_edges(L, 1.); mid = len(t1) // 2; tcfg["T"] = min(len(t1) * tcfg.get("band", .06), float(b1[mid] - t1[mid]) * .34)
        if "top0" in L: tcfg["T"] = max(tcfg["T"], float(L["bot0"][mid] - L["top0"][mid]) * .6)   # drawn grin: the band keeps the drawn teeth's height
    for k, S in enumerate([C0] + [q[y0:y1, x0:x1] for q in SS]):
        tk = tcfg if (tcfg and k >= (1 if lp.get("drawn_open") else 2)) else None   # drawn with teeth: from the first level
        tg = tcfg.get("tongue", .5) if (tcfg and k == len(lips)) else 0.
        rgb = np.clip(refine(B, C0, S, a, L, lips[k - 1] / lips[-1], lp.get("light", 0.), tk, tg) if k else B, 0, 255).astype(np.uint8)   # lv0 = the base's own pixels: the block is invisible in silence
        Image.fromarray(np.dstack([rgb, a])).save(os.path.join(OUT, f"{name}_lv{k}.png"))
    meta[name] = {"rect": [x0, y0, w, h], "levels": len(lips), "lips": lips, "size": [W, H], "source": os.path.relpath(path, D),
                  "teeth": tcfg is not None, "warp": bool(lp.get("warp", True)),   # check_patches.py NO-TEETH
                  "of": hashlib.md5(open(os.path.join(SRC, p["src"] + ".png"), "rb").read()).hexdigest()[:10]}   # build_stage: stale if the pose changed
    print(f"{name}: lip0 {pup.lip0:.2f}, block {meta[name]['rect']}, lips {lips}, opening from {kind}")
    if "--sheet" in flags:
        base = Image.open(path).convert("RGB")
        px = max(w, h) // 3; crop = (max(0, x0 - px), max(0, y0 - px), min(W, x1 + px), min(H, y1 + px))
        def scene(patch=None, at=None):
            im = base.copy()
            if patch: im.paste(patch.convert("RGB"), at, patch.getchannel("A"))
            c = im.crop(crop); return c.resize((c.width * 2, c.height * 2), Image.LANCZOS)
        row1 = [("base", scene())]
        v = char_info(name)
        if v:
            old = next((x for x in v.get("patches", []) if x["kind"] == "mouth"), None)
            if old:
                f = v["char"]["w"] / (v["char"]["box"][2] - v["char"]["box"][0]); bx, by = v["char"]["box"][:2]; rx_o, ry_o, wo, ho = old["rect"]
                pt = Image.open(os.path.join(D, "media", old["src"].split("?")[0])).convert("RGBA").resize((round(wo / f), round(ho / f)), Image.LANCZOS)
                row1.append(("OLD open", scene(pt, (round(rx_o / f + bx), round(ry_o / f + by)))))
        raw = Image.fromarray(np.dstack([np.clip(C0, 0, 255).astype(np.uint8), a]))   # the alternative: closed = LivePortrait's own closed render
        row1.append(("closed = raw LP render (soft)", scene(raw, (x0, y0))))
        row2 = [(f"LP lv{k}" if k else "LP closed = base pixels in the block", scene(Image.open(os.path.join(OUT, f"{name}_lv{k}.png")), (x0, y0))) for k in range(len(lips) + 1)]
        tw, th = row2[0][1].size; rows = [row1, row2]
        sheet = Image.new("RGB", ((tw + 8) * max(len(r) for r in rows), (th + 22) * len(rows)), (0, 0, 0)); dr = ImageDraw.Draw(sheet)
        for j, r in enumerate(rows):
            for i, (lab, c) in enumerate(r):
                sheet.paste(c, (i * (tw + 8), j * (th + 22) + 20)); dr.text((i * (tw + 8) + 4, j * (th + 22) + 4), f"{name}: {lab}", fill=(255, 220, 0))
        sheet.save(os.path.join(OUT, f"{name}_sheet.jpg"), quality=90)
if "--probe" not in flags: json.dump(meta, open(metaf, "w"), indent=1)
