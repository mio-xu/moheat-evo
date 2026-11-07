"""Window scenery (far / mid / near, seamless horizontally), ice & lava tunnel walls, spring station,
glass overlays and FX sprites → assets/<season>/*.png

  python3 scripts/art_scenery.py [name ...]      (no names = everything)
"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artlib import *

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, "assets")
W, H = 1536, 1024
LINE = "#6f5a6e"


# ------------------------------------------------------------------ shared drawing pieces
def ridge(base, comps, close_to=H, n=193):
    """periodic ridge line y(x) (integer k → seamless) closed down to close_to"""
    xs = np.linspace(0, W, n)
    ys = base + sum(a * np.sin(2 * np.pi * k * xs / W + ph) for k, a, ph in comps)
    pts = list(zip(xs, ys))
    return poly([(0, close_to)] + pts + [(W, close_to)]), pts


def cloud(x, y, s, fill="url(#cloud)", shade="#dfe3f6", stroke="#c8cbe6", hi=.7):
    r = [(-.9, .05, .45), (-.45, -.25, .58), (.1, -.42, .7), (.65, -.2, .55), (1.0, .08, .4)]
    out = ""
    for dx, dy, rr in r: out += C(x + dx * s, y + dy * s, rr * s, stroke)
    out += P(poly([(x - 1.25 * s, y + .3 * s), (x + 1.35 * s, y + .3 * s), (x + 1.35 * s, y + .12 * s), (x - 1.25 * s, y + .12 * s)]), stroke)
    for dx, dy, rr in r: out += C(x + dx * s, y + dy * s, rr * s - 3, fill)
    out += E(x + .05 * s, y + .2 * s, 1.25 * s, .16 * s, shade)
    for dx, dy, rr in r[1:4]: out += C(x + dx * s - rr * s * .25, y + dy * s - rr * s * .3, rr * s * .35, "#ffffff", op=hi)
    return out


def clouds(seed, n, y0, y1, s0, s1, **kw):
    r = rng(seed); out = ""
    xs = (np.arange(n) + r.uniform(0, .6, n)) * W / n
    for x in xs:
        s = r.uniform(s0, s1); y = r.uniform(y0, y1)
        out += wrap_x(x, 1.5 * s, W, lambda xx: cloud(xx, y, s, **kw))
    return out


def snowfall(seed, n, y0=0, y1=H, r0=2, r1=6, op=.9):
    r = rng(seed); out = ""
    for _ in range(n):
        out += C(r.uniform(0, W), r.uniform(y0, y1), r.uniform(r0, r1), "#ffffff", op=round(r.uniform(.5, op), 2))
    return out


def mountain(x, base, h, w, col, shade, cap=True, capcol="#ffffff", capshade="#d7e4f7"):
    pts = [(x - w, base), (x - w * .45, base - h * .55), (x - w * .12, base - h * .93), (x, base - h),
           (x + w * .18, base - h * .9), (x + w * .5, base - h * .5), (x + w, base)]
    out = P(smooth(pts, True, .35), col, LINE, 2.5, op=None)
    out += P(smooth([(x, base - h), (x + w * .18, base - h * .9), (x + w * .5, base - h * .5), (x + w, base), (x + w * .1, base)], True, .35), shade, op=.55)
    if cap:
        c = h * .32
        cp = [(x - w * .2, base - h * .78), (x - w * .1, base - h * .93), (x, base - h), (x + w * .18, base - h * .9),
              (x + w * .26, base - h * .76), (x + w * .14, base - h * .68), (x + w * .05, base - h * .76), (x - w * .06, base - h * .66)]
        out += P(smooth(cp, True, .3), capcol, LINE, 2)
        out += P(smooth([(x, base - h), (x + w * .18, base - h * .9), (x + w * .26, base - h * .76), (x + w * .14, base - h * .68), (x + w * .05, base - h * .78)], True, .3), capshade, op=.8)
    return out


def pine(x, base, h, snow=True, col="#4f8f8c", shade="#3f7774"):
    out = P(poly([(x - h * .05, base), (x + h * .05, base), (x + h * .04, base - h * .2), (x - h * .04, base - h * .2)]), "#9a6b55", LINE, 2)
    tiers = 4
    for i in range(tiers):
        tb = base - h * (.15 + i * .2); tw = h * (.42 - i * .085); th = h * .38
        pts = [(x - tw, tb), (x - tw * .55, tb - th * .45), (x, tb - th), (x + tw * .55, tb - th * .45), (x + tw, tb),
               (x + tw * .5, tb - th * .08), (x, tb + th * .02), (x - tw * .5, tb - th * .08)]
        out += P(smooth(pts, True, .25), col, LINE, 2.5)
        out += P(smooth([(x, tb - th), (x + tw * .55, tb - th * .45), (x + tw, tb), (x + tw * .5, tb - th * .08), (x + tw * .1, tb)], True, .25), shade, op=.6)
        if snow:
            sp = [(x - tw * .8, tb - th * .12), (x - tw * .45, tb - th * .5), (x, tb - th - 2), (x + tw * .45, tb - th * .5),
                  (x + tw * .8, tb - th * .12), (x + tw * .55, tb - th * .2), (x + tw * .3, tb - th * .32), (x, tb - th * .4),
                  (x - tw * .3, tb - th * .3), (x - tw * .6, tb - th * .2)]
            out += P(smooth(sp, True, .3), "#fbfdff", LINE, 2)
            out += P(smooth([(x + tw * .1, tb - th * .7), (x + tw * .45, tb - th * .5), (x + tw * .8, tb - th * .12), (x + tw * .55, tb - th * .2), (x + tw * .25, tb - th * .34)], True, .3), "#d9e6f8", op=.85)
            for k in (-.4, .1, .5):                             # icicles
                ix, iy = x + tw * k, tb - th * .2 + abs(k) * th * .1
                out += P(poly([(ix - 3, iy), (ix + 3, iy), (ix, iy + h * .04)]), "#c9ecff", "#9ccbe8", 1.2)
    return out


def bush(x, y, r, col, shade, hi=None, stroke=LINE):
    pts = []
    for i in range(14):
        a = np.pi + i / 13 * np.pi
        rr = r * (1 + .12 * np.sin(i * 2.3))
        pts.append((x + rr * 1.3 * np.cos(a), y + rr * .9 * np.sin(a)))
    out = P(smooth(pts, True, .45) , col, stroke, 2.5)
    out += P(smooth([(x + r * .1, y - r * .85), (x + r * .8, y - r * .55), (x + r * 1.3, y), (x + r * .3, y)], True, .4), shade, op=.55)
    if hi: out += E(x - r * .45, y - r * .55, r * .35, r * .18, hi, rot=-20, op=.75)
    return out


def snow_mound(x, y, r):
    return bush(x, y, r, "#fbfdff", "#d6e3f6", "#ffffff", "#a9bbd8")


def flower(x, y, r, col, center="#ffe27a"):
    out = ""
    for i in range(5):
        a = i * 2 * np.pi / 5 - np.pi / 2
        out += C(x + r * .62 * np.cos(a), y + r * .62 * np.sin(a), r * .5, col, LINE, 1.2)
    return out + C(x, y, r * .35, center, LINE, 1)


def grass_tuft(x, y, h, col, n=5):
    out = ""
    for i in range(n):
        dx = (i - n / 2) * h * .12
        tip = (x + dx * 2.2 + (i - n / 2) * h * .08, y - h * (.7 + .3 * np.sin(i * 1.7) ** 2))
        out += P(smooth([(x + dx - h * .05, y), (x + dx * 1.5, y - h * .4), tip, (x + dx * 1.3 + h * .04, y - h * .35), (x + dx + h * .05, y)], True, .3), col, LINE, 1.6)
    return out


def leaf(x, y, L, ang, col, vein="#e8ffd8", stroke=LINE, wid=.36):
    a = np.radians(ang); ux, uy = np.cos(a), np.sin(a); px, py = -uy, ux
    pts = [(x, y), (x + ux * L * .3 + px * L * wid, y + uy * L * .3 + py * L * wid), (x + ux * L * .75 + px * L * wid * .7, y + uy * L * .75 + py * L * wid * .7),
           (x + ux * L, y + uy * L), (x + ux * L * .75 - px * L * wid * .7, y + uy * L * .75 - py * L * wid * .7), (x + ux * L * .3 - px * L * wid, y + uy * L * .3 - py * L * wid)]
    out = P(smooth(pts, True, .45), col, stroke, 2.2)
    out += P(poly([(x, y), (x + ux * L * .92, y + uy * L * .92)], False), stroke=vein, sw=max(1.5, L * .025), op=.8)
    for t in (.3, .5, .7):
        bx, by = x + ux * L * t, y + uy * L * t
        for sg in (1, -1):
            out += P(poly([(bx, by), (bx + (ux * .25 + px * sg * .3) * L * .35, by + (uy * .25 + py * sg * .3) * L * .35)], False), stroke=vein, sw=max(1, L * .012), op=.6)
    return out


def palm(x, base, h, lean=.15):
    out = ""
    top = (x + h * lean, base - h)
    segs = 9
    for i in range(segs):
        t0, t1 = i / segs, (i + 1) / segs
        q = lambda t: (x + h * lean * t ** 1.6, base - h * t)
        (x0, y0), (x1, y1) = q(t0), q(t1)
        w0, w1 = h * .055 * (1 - t0 * .4), h * .055 * (1 - t1 * .4)
        out += P(poly([(x0 - w0, y0), (x0 + w0, y0), (x1 + w1 * 1.1, y1 + 3), (x1 - w1 * 1.1, y1 + 3)]), "#c99a6c" if i % 2 else "#b88a5e", LINE, 2)
    for ang, L in ((-170, h * .55), (-140, h * .6), (-105, h * .45), (-70, h * .5), (-35, h * .6), (-5, h * .55), (155, h * .4), (25, h * .42)):
        out += frond(top[0], top[1], L, ang)
    for dx in (-10, 8, 0):
        out += C(top[0] + dx, top[1] + 14, h * .035, "#8a6a3e", LINE, 1.5)
    return out


def frond(x, y, L, ang):
    a = np.radians(ang)
    pts = []
    for t in np.linspace(0, 1, 9):
        droop = t * t * L * .35
        pts.append((x + np.cos(a) * L * t, y + np.sin(a) * L * t + droop))
    out = P(smooth(pts, False), stroke=LINE, sw=9) + P(smooth(pts, False), stroke="#5fae6c", sw=6)
    for i in range(1, len(pts)):
        px_, py_ = pts[i]; dx, dy = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]
        n = np.hypot(dx, dy) + 1e-6; nx, ny = -dy / n, dx / n
        ln = L * .17 * (1 - abs(i / len(pts) - .45))
        for sg in (1, -1):
            tip = (px_ + nx * ln * sg + dx * .6, py_ + ny * ln * sg + abs(ny) * ln * .5 + dy * .6)
            out += P(smooth([(px_ - dx * .3, py_ - dy * .3), ((px_ + tip[0]) / 2 + nx * 4 * sg, (py_ + tip[1]) / 2 + ny * 4 * sg), tip, (px_ + dx * .3, py_ + dy * .3)], True, .4), "#6fc07a" if sg > 0 else "#57a868", LINE, 1.6)
    return out


def round_tree(x, base, h, cols, trunk="#9a6b55", seed=0):
    r = rng(seed); out = ""
    out += P(poly([(x - h * .05, base), (x + h * .05, base), (x + h * .03, base - h * .55), (x - h * .03, base - h * .55)]), trunk, LINE, 2)
    cx, cy = x, base - h * .7
    blobs = [(r.uniform(-.3, .3) * h, r.uniform(-.25, .15) * h, r.uniform(.17, .27) * h) for _ in range(7)]
    for dx, dy, rr in blobs: out += C(cx + dx, cy + dy, rr + 2.5, LINE)
    for dx, dy, rr in blobs: out += C(cx + dx, cy + dy, rr, cols[0])
    for dx, dy, rr in blobs[:4]: out += C(cx + dx + rr * .25, cy + dy + rr * .25, rr * .7, cols[1], op=.5)
    for dx, dy, rr in blobs[3:]: out += C(cx + dx - rr * .3, cy + dy - rr * .35, rr * .3, cols[2], op=.45)
    return out


def sakura_tree(x, base, h, seed=0):
    return round_tree(x, base, h, ("#ffc6d6", "#f39bb5", "#fff0f4"), "#8f6457", seed) + \
        "".join(C(x + rr * h * .4, base - h * .7 + rr2 * h * .3, 4, "#ffffff", op=.8) for rr, rr2 in rng(seed + 9).uniform(-1, 1, (10, 2)))


def petals(seed, n, y0, y1, s0=7, s1=13, cols=("#ffc6d6", "#ffb0c6", "#ffe3ea")):
    r = rng(seed); out = ""
    for _ in range(n):
        x, y, s = r.uniform(0, W), r.uniform(y0, y1), r.uniform(s0, s1)
        out += E(x, y, s, s * .55, cols[r.integers(len(cols))], rot=r.uniform(0, 180), stroke="#e58aa4", sw=1)
    return out


def sparkles(seed, n, y0, y1, col="#ffffff", r0=2, r1=5):
    r = rng(seed); out = ""
    for _ in range(n):
        x, y, s = r.uniform(0, W), r.uniform(y0, y1), r.uniform(r0, r1)
        out += P(poly([(x - s * 2, y), (x, y - s * .4), (x + s * 2, y), (x, y + s * .4)]), col, op=.85)
        out += P(poly([(x, y - s * 2), (x + s * .4, y), (x, y + s * 2), (x - s * .4, y)]), col, op=.85)
    return out


def common_defs():
    return "".join([
        lin("cloud", [(0, "#ffffff"), (1, "#f3f0ff")]),
        blur("b2", 2), blur("b6", 6), blur("b14", 14), blur("b30", 30), blur("b60", 60),
    ])


# ------------------------------------------------------------------ WINTER
def winter_far():
    d = common_defs() + lin("sky", [(0, "#a9c8f0"), (.55, "#d6e6fb"), (1, "#f3f0fb")])
    b = f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
    b += clouds(1, 4, 120, 260, 70, 110, shade="#dde5f6")
    for x, h, w, col in ((0, 330, 330, "#a8bde3"), (380, 270, 290, "#b4c8ea"), (760, 360, 360, "#a3b7df"), (1150, 290, 300, "#b0c4e8")):
        b += wrap_x(x, w, W, lambda xx, h=h, w=w, col=col: mountain(xx, 640, h, w, col, "#8ea4d2", True, "#ffffff", "#dbe6f7"))
    d1, _ = ridge(610, [(2, 16, 0), (5, 9, 1.2), (9, 4, .3)])
    b += P(d1, "#e8f0fb", "#b9c9e6", 2.5)
    d2, _ = ridge(680, [(3, 12, 2), (7, 6, .8)])
    b += P(d2, "#f6f9ff", "#c6d3ec", 2.5)
    for i, x in enumerate(np.linspace(0, W, 26, endpoint=False)):
        b += wrap_x(x + 20 * np.sin(i), 40, W, lambda xx, i=i: pine(xx, 660 + 18 * np.sin(i * 1.3), 70 + 12 * np.cos(i), True, "#8fb4be", "#7aa0ad"))
    b += snowfall(4, 160, 0, H, 1.5, 4.5)
    return svg(W, H, b, d)


def winter_mid():
    d = common_defs() + lin("snowg", [(0, "#ffffff"), (1, "#e2ecfa")])
    dd, _ = ridge(720, [(2, 22, 0), (4, 12, 1.3), (7, 6, .4)])
    b = P(dd, "url(#snowg)", "#b9c9e6", 3)
    r = rng(11)
    xs = np.sort(np.linspace(0, W, 13, endpoint=False) + r.uniform(-30, 30, 13))
    for i, x in enumerate(xs):
        h = r.uniform(260, 380)
        b += wrap_x(x, h * .45, W, lambda xx, h=h, i=i: pine(xx, 740 + 14 * np.sin(i), h))
    dd2, _ = ridge(830, [(3, 14, .5), (5, 8, 2.1)])
    b += P(dd2, "url(#snowg)", "#b9c9e6", 3)
    for x in np.linspace(40, W, 9, endpoint=False):
        b += wrap_x(x, 60, W, lambda xx: snow_mound(xx, 860, 46))
    return svg(W, H, b, d)


def winter_near():
    r = rng(21); b = ""
    for x in np.linspace(0, W, 7, endpoint=False) + 60:
        rr = r.uniform(70, 110)
        b += wrap_x(x, rr * 1.4, W, lambda xx, rr=rr: snow_mound(xx, 1040, rr))
    for x in np.linspace(110, W, 6, endpoint=False):
        b += wrap_x(x, 60, W, lambda xx: bush(xx, 985, 42, "#5f9c96", "#4a817e", "#9fd1c6") + snow_cap(xx, 950, 48))
    b += f'<rect x="0" y="1000" width="{W}" height="24" fill="#fbfdff"/>'
    return svg(W, H, b, common_defs())


def snow_cap(x, y, r):
    return P(smooth([(x - r, y + 8), (x - r * .5, y - r * .25), (x, y - r * .35), (x + r * .5, y - r * .2), (x + r, y + 8), (x + r * .3, y), (x - r * .3, y + 4)], True, .4), "#fbfdff", LINE, 2)


# ------------------------------------------------------------------ SUMMER
def summer_far():
    d = common_defs() + lin("sky", [(0, "#5fb4f2"), (.6, "#a9dcfb"), (1, "#dff4ff")]) + lin("sea", [(0, "#4fb8d8"), (1, "#7fd6e6")])
    b = f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
    # big summer cumulonimbus
    for x, y, s in ((250, 360, 150), (900, 330, 190), (1350, 380, 120)):
        b += wrap_x(x, 2.4 * s, W, lambda xx, y=y, s=s: cloud(xx, y, s, shade="#e5eefb") + cloud(xx + s * .3, y - s * .7, s * .75, shade="#eef3fd") + cloud(xx - s * .2, y - s * 1.25, s * .5, shade="#f2f5fd"))
    b += clouds(2, 4, 110, 200, 35, 55, shade="#e9f0fc")
    b += f'<rect x="0" y="585" width="{W}" height="{H - 585}" fill="url(#sea)"/>'
    b += f'<rect x="0" y="583" width="{W}" height="5" fill="#ffffff" opacity=".7"/>'
    r = rng(5)
    for _ in range(70):
        x, y = r.uniform(0, W), r.uniform(600, H)
        L = r.uniform(20, 60) * (y - 560) / 300
        b += P(poly([(x - L, y), (x + L, y)], False), stroke="#e6fbff", sw=2 + (y - 600) / 150, op=.7)
    b += sparkles(6, 60, 595, 900, "#ffffff", 2, 6)
    # a little island
    b += wrap_x(1180, 160, W, lambda xx: P(smooth([(xx - 150, 588), (xx - 70, 552), (xx, 540), (xx + 80, 556), (xx + 150, 588)], True, .4), "#7cc58a", LINE, 2))
    return svg(W, H, b, d)


def summer_mid():
    d = common_defs() + lin("sand", [(0, "#ffe8b8"), (1, "#f8d39a")]) + lin("wave", [(0, "#bff0f5"), (1, "#7fd6e6", 0)])
    dd, pts = ridge(760, [(3, 10, 0), (6, 5, 1.2)])
    foam, _ = ridge(745, [(3, 10, 0), (6, 5, 1.2), (14, 4, .7)])
    b = P(foam, "#ffffff", "#9fd8e8", 2.5) + P(dd, "url(#sand)", "#d9a96f", 2.5)
    r = rng(8)
    for _ in range(40):
        b += E(r.uniform(0, W), r.uniform(800, 1000), r.uniform(3, 7), r.uniform(1.5, 3), "#e8bf80", op=.8)
    for x, h, ln in ((150, 430, .12), (520, 360, -.18), (640, 470, .2), (1080, 400, -.1), (1380, 450, .16)):
        b += wrap_x(x, h * .7, W, lambda xx, h=h, ln=ln: palm(xx, 900, h, ln))
    for x in (330, 900, 1250):
        b += wrap_x(x, 40, W, lambda xx: shell(xx, 950))
    return svg(W, H, b, d)


def shell(x, y):
    pts = [(x - 22, y), (x - 14, y - 20), (x, y - 26), (x + 14, y - 20), (x + 22, y)]
    out = P(smooth(pts + [(x, y + 6)], True, .4), "#ffd0d8", LINE, 2)
    for k in (-12, 0, 12): out += P(poly([(x, y + 2), (x + k, y - 20)], False), stroke="#f2a7b5", sw=2)
    return out


def summer_near():
    b = ""
    r = rng(31)
    for x in np.linspace(0, W, 16, endpoint=False):
        b += wrap_x(x, 90, W, lambda xx: grass_tuft(xx, 1030, r.uniform(90, 170), "#79c27e", 6))
    for x in np.linspace(40, W, 11, endpoint=False):
        b += wrap_x(x, 30, W, lambda xx: flower(xx, 930 + r.uniform(-30, 40), 18, ["#ff9fb5", "#ffd36e", "#ffffff"][int(r.integers(3))]))
    b += f'<rect x="0" y="1010" width="{W}" height="14" fill="#6fb375"/>'
    return svg(W, H, b, common_defs())


# ------------------------------------------------------------------ RAINFOREST
def rainforest_far(storm=False):
    if storm:
        d = common_defs() + lin("sky", [(0, "#4b5277"), (.6, "#6f7a9c"), (1, "#8f9bb5")])
        hills = ("#4f7a6e", "#5d8a78", "#6c9a82"); hl = "#34504a"
    else:
        d = common_defs() + lin("sky", [(0, "#7fc8f0"), (.6, "#bfe8f7"), (1, "#f0fbe8")]) + lin("beam", [(0, "#fff6c8", .75), (1, "#fff6c8", 0)])
        hills = ("#7fbf8c", "#68b07c", "#57a06e"); hl = LINE
    b = f'<rect width="{W}" height="{H}" fill="url(#sky)"/>'
    if storm:
        b += clouds(3, 5, 80, 300, 110, 170, fill="#59607f", shade="#474d6a", stroke="#3c4260", hi=.08)
        b += clouds(13, 6, 220, 360, 70, 110, fill="#6b7393", shade="#585f80", stroke="#4a5070", hi=.1)
        b += lightning_path(1050, 260, 300, 1.0, "#fff3a6") + lightning_path(300, 300, 220, .7, "#fff3a6")
    else:
        b += clouds(3, 5, 100, 260, 60, 100, shade="#e6f0f4")
        for x0 in (200, 640, 1100):
            b += P(poly([(x0, 180), (x0 + 120, 180), (x0 + 420, 900), (x0 + 120, 900)]), "url(#beam)", op=.55)
    for i, (base, amp, col) in enumerate(((560, 40, hills[0]), (640, 34, hills[1]), (720, 28, hills[2]))):
        dd, pts = ridge(base, [(2 + i, amp, i), (5 + i, amp * .45, 1.5 * i), (11, amp * .2, .5)])
        b += P(dd, col, hl, 2.5)
        for k in range(0, len(pts) - 1, 4):            # bumpy canopy texture on each hill
            x, y = pts[k]
            b += C(x, y + 6, 18 + 6 * np.sin(k), col)
            b += C(x - 5, y + 2, 7, "#ffffff", op=.12 if storm else .25)
    if storm:
        r = rng(9)
        for _ in range(420):
            x, y = r.uniform(0, W), r.uniform(0, H); L = r.uniform(25, 60)
            b += P(poly([(x, y), (x - L * .22, y + L)], False), stroke="#dfe7ff", sw=1.6, op=.5)
        b += f'<rect width="{W}" height="{H}" fill="#2a3150" opacity=".18"/>'
    return svg(W, H, b, d)


def lightning_path(x, y, L, s, col):
    pts = [(x, y), (x - 40 * s, y + L * .35), (x + 10 * s, y + L * .38), (x - 30 * s, y + L * .75), (x + 20 * s, y + L * .7), (x - 10 * s, y + L)]
    glow = P(poly(pts, False), stroke=col, sw=18 * s, op=.4, extra='filter="url(#b14)"')
    return glow + P(poly(pts, False), stroke="#ffffff", sw=6 * s) + P(poly(pts, False), stroke=col, sw=3 * s)


def rainforest_mid():
    b = ""
    r = rng(17)
    dd, _ = ridge(800, [(3, 18, 0), (6, 9, 1)])
    b += P(dd, "#4f9a64", LINE, 2.5)
    for x in np.linspace(0, W, 10, endpoint=False) + 50:
        h = r.uniform(380, 520)
        b += wrap_x(x, h * .45, W, lambda xx, h=h, s=int(x): round_tree(xx, 830, h, ("#5fae6c", "#478f57", "#a6dc9a"), "#8a6450", s))
    for x in np.linspace(80, W, 8, endpoint=False):
        b += wrap_x(x, 160, W, lambda xx: "".join(leaf(xx, 900, r.uniform(110, 170), a, "#69b874") for a in (-150, -110, -70, -30)))
    for x in np.linspace(200, W, 5, endpoint=False):
        b += wrap_x(x, 20, W, lambda xx: flower(xx, 820 + r.uniform(-60, 30), 14, "#ff8fa8", "#fff4a8"))
    return svg(W, H, b, common_defs())


def rainforest_near():
    b = ""; r = rng(19)
    for x in np.linspace(0, W, 9, endpoint=False) + 40:
        L = r.uniform(170, 260)
        b += wrap_x(x, L * 1.1, W, lambda xx, L=L: "".join(leaf(xx, 1060, L * (1 - abs(a + 90) / 160), a, c, wid=.42)
                                                       for a, c in ((-165, "#3f8f55"), (-130, "#4fa462"), (-95, "#5bb46d"), (-55, "#4fa462"), (-18, "#3f8f55"))))
    b += f'<rect x="0" y="1012" width="{W}" height="12" fill="#3f8f55"/>'
    return svg(W, H, b, common_defs())


# ------------------------------------------------------------------ SPRING
def spring_far():
    d = common_defs() + lin("sky", [(0, "#9fd2f4"), (.6, "#d9eefb"), (1, "#fff1e6")]) + rad("sun", [(0, "#fffbe8"), (.4, "#fff3c8", .8), (1, "#fff3c8", 0)])
    b = f'<rect width="{W}" height="{H}" fill="url(#sky)"/>' + C(1100, 230, 260, "url(#sun)")
    b += clouds(4, 5, 120, 280, 50, 85, shade="#f2e9f2")
    for i, (base, amp, col) in enumerate(((600, 30, "#b9e0a8"), (670, 26, "#a6d696"), (740, 22, "#93cb86"))):
        dd, pts = ridge(base, [(2 + i, amp, 1 + i), (4 + i, amp * .5, .3 * i)])
        b += P(dd, col, "#7aa877", 2.5)
        if i < 2:
            rr = rng(40 + i)
            for x in rr.uniform(0, W, 8):
                y = np.interp(x, [p[0] for p in pts], [p[1] for p in pts])
                b += wrap_x(x, 30, W, lambda xx, y=y: C(xx, y - 6, 16, "#ffd3df", "#e9a3b7", 1.5) + C(xx + 12, y - 2, 11, "#ffe3ea", "#e9a3b7", 1.5))
    return svg(W, H, b, d)


def spring_mid():
    b = ""
    dd, _ = ridge(800, [(3, 14, .4), (5, 7, 2)])
    b += P(dd, "#9bd28c", "#6fa86e", 2.5)
    r = rng(23)
    for x in np.linspace(0, W, 7, endpoint=False) + 80:
        h = r.uniform(360, 470)
        b += wrap_x(x, h * .45, W, lambda xx, h=h, s=int(x): sakura_tree(xx, 830, h, s))
    b += petals(24, 70, 450, 950)
    for x in np.linspace(30, W, 18, endpoint=False):
        b += wrap_x(x, 20, W, lambda xx: flower(xx, 860 + r.uniform(-20, 60), 10, ["#ffffff", "#ffe27a", "#ffb3c7"][int(r.integers(3))]))
    return svg(W, H, b, common_defs())


def spring_near():
    b = ""; r = rng(29)
    for x in np.linspace(0, W, 8, endpoint=False) + 40:
        b += wrap_x(x, 130, W, lambda xx: bush(xx, 1040, 95, "#86c97d", "#6aae68", "#bfe6a8"))
    for x in np.linspace(10, W, 22, endpoint=False):
        b += wrap_x(x, 30, W, lambda xx: flower(xx, 960 + r.uniform(-40, 50), r.uniform(14, 22), ["#ff9fb5", "#ffffff", "#ffd36e", "#c9b3f5"][int(r.integers(4))]))
    b += petals(30, 40, 860, 1020, 9, 15)
    return svg(W, H, b, common_defs())


def spring_station():
    d = common_defs() + lin("sky", [(0, "#a6d6f5"), (.6, "#def1fb"), (1, "#fff3e6")]) + lin("plat", [(0, "#e7c39a"), (1, "#d3a77b")])
    b = f'<rect width="{W}" height="{H}" fill="url(#sky)"/>' + clouds(5, 4, 120, 260, 50, 80, shade="#f2e9f2")
    dd, _ = ridge(560, [(2, 24, 1), (4, 10, .2)]); b += P(dd, "#b9e0a8", "#7aa877", 2.5)
    # station hut
    b += P(poly([(820, 640), (1260, 640), (1260, 380), (820, 380)]), "#fff3e2", LINE, 3)
    b += P(poly([(780, 400), (1300, 400), (1220, 300), (860, 300)]), "#f39bb5", LINE, 3)
    b += P(poly([(780, 400), (1300, 400), (1300, 418), (780, 418)]), "#d9879b", LINE, 2)
    for x in (880, 1120):
        b += P(poly([(x, 450), (x + 90, 450), (x + 90, 560), (x, 560)]), "#bfe6f7", LINE, 3)
        b += P(poly([(x + 45, 450), (x + 45, 560)], False), stroke=LINE, sw=3) + P(poly([(x, 505), (x + 90, 505)], False), stroke=LINE, sw=3)
    b += P(poly([(1000, 470), (1080, 470), (1080, 640), (1000, 640)]), "#c88b5d", LINE, 3) + C(1068, 560, 5, "#f2c86b")
    b += C(1040, 340, 26, "#fffdf6", LINE, 3) + P(poly([(1040, 340), (1040, 322), (1040, 340), (1053, 346)], False), stroke=LINE, sw=3)
    # blank station sign
    b += P(poly([(250, 760), (262, 760), (262, 560), (250, 560)]), "#9a6b55", LINE, 2) + P(poly([(520, 760), (532, 760), (532, 560), (520, 560)]), "#9a6b55", LINE, 2)
    b += P(smooth([(220, 520), (560, 520), (565, 600), (215, 600)], True, .1), "#fffaf3", LINE, 4)
    b += P(poly([(240, 535), (540, 535), (540, 585), (240, 585)]), stroke="#9fd3c7", sw=3)
    # cherry trees
    b += sakura_tree(120, 760, 520, 3) + sakura_tree(1430, 760, 560, 4)
    # platform
    b += P(poly([(0, 700), (W, 700), (W, 840), (0, 840)]), "url(#plat)", LINE, 3)
    for x in np.arange(0, W, 96): b += P(poly([(x, 700), (x - 20, 840)], False), stroke="#c49a70", sw=2, op=.6)
    b += P(poly([(0, 828), (W, 828), (W, 846), (0, 846)]), "#ffe08a", LINE, 2)
    b += P(poly([(0, 846), (W, 846), (W, H), (0, H)]), "#b7a2a8")
    b += P(poly([(0, 846), (W, 846)], False), stroke=LINE, sw=3)
    # flower beds + lamp post + bench
    for x0 in (330, 640, 1350):
        b += P(smooth([(x0 - 80, 720), (x0 + 80, 720), (x0 + 72, 760), (x0 - 72, 760)], True, .1), "#c88b5d", LINE, 2)
        for k in range(7):
            b += flower(x0 - 66 + k * 22, 705 + 6 * np.sin(k * 2), 13, ["#ff9fb5", "#ffd36e", "#ffffff", "#c9b3f5"][k % 4])
    b += P(poly([(720, 760), (730, 760), (730, 470), (720, 470)]), "#6f6a8a", LINE, 2) + C(725, 455, 26, "#fff4c9", LINE, 3) + P(poly([(700, 432), (750, 432), (740, 420), (710, 420)]), "#6f6a8a", LINE, 2)
    b += P(poly([(1300, 700), (1500, 700), (1500, 720), (1300, 720)]), "#9fd3c7", LINE, 3) + P(poly([(1300, 670), (1500, 670), (1500, 690), (1300, 690)]), "#9fd3c7", LINE, 3)
    b += petals(31, 60, 250, 820)
    return svg(W, H, b, d)


# ------------------------------------------------------------------ ICE / FIRE TUNNEL
def tunnel_ice_wall():
    d = common_defs() + lin("ice", [(0, "#3f6fc4"), (.5, "#6fb5ec"), (1, "#3f6fc4")]) + rad("glo", [(0, "#d6f6ff", .9), (1, "#d6f6ff", 0)])
    b = f'<rect width="{W}" height="{H}" fill="url(#ice)"/>'
    r = rng(51)
    for _ in range(26):                                                   # faceted crystals
        x, y, s = r.uniform(0, W), r.uniform(150, 900), r.uniform(60, 150)
        b += wrap_x(x, s, W, lambda xx, y=y, s=s: crystal(xx, y, s, r.uniform(-30, 30)))
    for x in np.linspace(0, W, 30, endpoint=False):                       # icicles top
        L = r.uniform(60, 200)
        b += wrap_x(x, 20, W, lambda xx, L=L: P(poly([(xx - 16, 0), (xx + 16, 0), (xx + 2, L), (xx - 2, L)]), "#dff6ff", "#9fd0f0", 2) + P(poly([(xx - 4, 0), (xx + 4, 0), (xx, L * .8)]), "#ffffff", op=.7))
    for x in np.linspace(0, W, 6, endpoint=False):
        b += wrap_x(x, 200, W, lambda xx: C(xx + 80, r.uniform(300, 700), 190, "url(#glo)", op=.5))
    dd, _ = ridge(940, [(4, 20, 0), (7, 10, 1)])
    b += P(dd, "#e8f8ff", "#9fd0f0", 3)
    b += sparkles(52, 80, 0, H, "#ffffff", 2, 7)
    return svg(W, H, b, d)


def crystal(x, y, s, rot):
    pts = [(0, -1), (.38, -.45), (.32, .7), (0, 1), (-.32, .7), (-.38, -.45)]
    a = np.radians(rot); ca, sa = np.cos(a), np.sin(a)
    T = lambda p: (x + (p[0] * ca - p[1] * sa) * s, y + (p[0] * sa + p[1] * ca) * s)
    out = P(poly([T(p) for p in pts]), "#a8e2fb", "#4a7fc9", 2.5, op=.9)
    out += P(poly([T(p) for p in [(0, -1), (.38, -.45), (.32, .7), (0, 1)]]), "#7fc4ef", op=.75)
    out += P(poly([T(p) for p in [(0, -1), (-.38, -.45), (-.1, -.3)]]), "#ffffff", op=.7)
    return out


def tunnel_lava_wall():
    d = common_defs() + lin("rock", [(0, "#6d3a52"), (.5, "#8c4a58"), (1, "#5e3248")]) + rad("glo", [(0, "#ffd27a", .8), (1, "#ff8a4a", 0)])
    b = f'<rect width="{W}" height="{H}" fill="url(#rock)"/>'
    r = rng(61)
    for _ in range(30):                                                    # rounded rocks
        x, y, s = r.uniform(0, W), r.uniform(80, 980), r.uniform(50, 120)
        b += wrap_x(x, s * 1.3, W, lambda xx, y=y, s=s: bush(xx, y, s * .8, "#9a5662", "#7a4252", "#c27a7e", "#4d2638").replace('d="M', 'd="M', 1))
    for k in range(5):                                                     # glowing lava rivers (periodic)
        y0 = 120 + k * 200
        xs = np.linspace(0, W, 49)
        ys = y0 + 40 * np.sin(2 * np.pi * (2 + k % 2) * xs / W + k) + 18 * np.sin(2 * np.pi * 5 * xs / W + 2 * k)
        pts = list(zip(xs, ys))
        b += P(smooth(pts, False), stroke="#ff7a3a", sw=46, op=.6, extra='filter="url(#b14)"')
        b += P(smooth(pts, False), stroke="#ff9a4a", sw=22) + P(smooth(pts, False), stroke="#ffe08a", sw=9)
    for x in np.linspace(0, W, 7, endpoint=False):
        b += wrap_x(x, 200, W, lambda xx: C(xx + 90, r.uniform(250, 800), 170, "url(#glo)", op=.55))
    for x in np.linspace(40, W, 12, endpoint=False):                        # little flame tongues at the bottom
        b += wrap_x(x, 60, W, lambda xx: flame(xx, 1024, r.uniform(90, 160)))
    for _ in range(25):
        x, y = r.uniform(0, W), r.uniform(0, H)
        b += C(x, y, r.uniform(4, 10), "#ffd27a", op=.8)
    return svg(W, H, b, d)


def flame(x, y, h, cols=("#ff8a4a", "#ffc24a", "#fff3b0")):
    out = ""
    for i, (c, s) in enumerate(zip(cols, (1, .68, .38))):
        hh, ww = h * s, h * .38 * s
        pts = [(x - ww, y), (x - ww * .9, y - hh * .45), (x - ww * .2, y - hh * .75), (x, y - hh), (x + ww * .35, y - hh * .62), (x + ww * .95, y - hh * .4), (x + ww, y)]
        out += P(smooth(pts, True, .45), c, "#c24a3a" if i == 0 else None, 2.5)
    return out


# ------------------------------------------------------------------ GLASS OVERLAYS
def dendrite(x, y, ang, L, depth, r, sw):
    a = np.radians(ang)
    x2, y2 = x + np.cos(a) * L, y + np.sin(a) * L
    out = P(poly([(x, y), (x2, y2)], False), stroke="#ffffff", sw=f(sw), op=.85)
    if depth > 0:
        for t in (.35, .65):
            bx, by = x + np.cos(a) * L * t, y + np.sin(a) * L * t
            for sg in (1, -1):
                out += dendrite(bx, by, ang + sg * 60, L * .42 * r.uniform(.8, 1.1), depth - 1, r, sw * .7)
        out += dendrite(x2, y2, ang + r.uniform(-25, 25), L * .55, depth - 1, r, sw * .8)
    return out


def frost(corners_only=False):
    d = rad("vig", [(0, "#ffffff", 0), (.55, "#ffffff", 0), (.85, "#eef8ff", .55), (1, "#ffffff", .9)], .5, .5, .72) + blur("b3", 3)
    b = "" if corners_only else f'<rect width="{W}" height="{H}" fill="url(#vig)"/>'
    r = rng(71)
    seeds = []
    if corners_only:
        for cx, cy, base in ((0, 0, 45), (W, 0, 135), (0, H, -45), (W, H, -135)):
            for k in range(5): seeds.append((cx, cy, base + r.uniform(-35, 35), r.uniform(160, 300)))
    else:
        for i in range(34):
            side = i % 4; t = r.uniform(0, 1)
            x, y, ang = [(t * W, 0, 90), (W, t * H, 180), (t * W, H, -90), (0, t * H, 0)][side]
            seeds.append((x, y, ang + r.uniform(-40, 40), r.uniform(110, 250)))
    br = ""
    for x, y, ang, L in seeds: br += dendrite(x, y, ang, L, 3, r, 5)
    b += f'<g filter="url(#b3)" opacity=".7">{br}</g><g opacity=".9">{br}</g>'
    if corners_only:
        for cx, cy in ((0, 0), (W, 0), (0, H), (W, H)):
            b += C(cx, cy, 230, "#ffffff", op=.35, extra='filter="url(#b60)"')
    b += sparkles(72, 40 if not corners_only else 12, 0, H, "#ffffff", 2, 5) if not corners_only else ""
    return svg(W, H, b, d + common_defs())


def raindrops():
    r = rng(81); b = ""
    for _ in range(46):                                    # trails
        x, y0 = r.uniform(0, W), r.uniform(-50, 700); L = r.uniform(150, 420)
        pts = [(x + 6 * np.sin(k * 1.3 + x), y0 + L * k / 6) for k in range(7)]
        b += P(smooth(pts, False), stroke="#ffffff", sw=r.uniform(3, 6), op=.35)
        b += drop(pts[-1][0], pts[-1][1], r.uniform(9, 15))
    for _ in range(170):
        b += drop(r.uniform(0, W), r.uniform(0, H), r.uniform(3, 11))
    return svg(W, H, b, common_defs())


def drop(x, y, s):
    return (E(x, y, s * .8, s, "#eaf6ff", op=.35) + E(x, y, s * .8, s, "none", stroke="#ffffff", sw=1.6, op=.6) +
            E(x - s * .25, y - s * .35, s * .22, s * .3, "#ffffff", op=.9) + E(x + s * .2, y + s * .5, s * .45, s * .2, "#6f8fb0", op=.25))


def heat_haze():
    d = rad("g", [(0, "#fff1b8", .75), (.5, "#ffd98a", .3), (1, "#ffd98a", 0)]) + rad("g2", [(0, "#fff6d8", .55), (1, "#fff6d8", 0)])
    b = C(1250, 120, 700, "url(#g)")
    r = rng(91)
    for _ in range(14):
        x, y, s = r.uniform(200, W), r.uniform(0, H), r.uniform(30, 110)
        b += hexagon(x, y, s, "url(#g2)") + hexagon(x, y, s, "none", "#fff6d8", .4)
    for k in range(6):
        b += P(poly([(1250, 120), (1250 + 1600 * np.cos(np.radians(110 + k * 14)), 120 + 1600 * np.sin(np.radians(110 + k * 14))),
                     (1250 + 1600 * np.cos(np.radians(114 + k * 14)), 120 + 1600 * np.sin(np.radians(114 + k * 14)))]), "#fff3c8", op=.12)
    return svg(W, H, b, d + common_defs())


def hexagon(x, y, s, fill, stroke=None, op=None):
    pts = [(x + s * np.cos(np.radians(60 * i)), y + s * np.sin(np.radians(60 * i))) for i in range(6)]
    return P(poly(pts), fill, stroke, 2, op)


def fog():
    r = rng(101); b = ""
    for _ in range(40):
        x, y = r.uniform(-100, W + 100), r.uniform(0, H) ** 1.0
        s = r.uniform(120, 260) * (1.4 if y > 600 else 1)
        b += E(x, y, s * 1.6, s, "#ffffff", op=round(r.uniform(.25, .55), 2))
    return svg(W, H, f'<g filter="url(#b60)">{b}</g>', common_defs())


# ------------------------------------------------------------------ FX sprites (1024², centred)
S = 1024


def fx_sakura_petal():
    pts = [(512, 840), (300, 640), (250, 400), (380, 230), (470, 240), (512, 300), (554, 240), (644, 230), (774, 400), (724, 640)]
    b = P(smooth(pts, True, .45), "url(#pet)", "#e07f9e", 10)
    b += P(smooth([(512, 820), (512, 520), (512, 330)], False), stroke="#f3a7bd", sw=10)
    b += E(410, 420, 70, 120, "#ffffff", rot=20, op=.55)
    return svg(S, S, b, rad("pet", [(0, "#fff3f6"), (1, "#ffb5c8")], .5, .65, .6))


def fx_tropical_leaf():
    return svg(S, S, leaf(170, 860, 820, -50, "#5fb46e", "#d8ffc8", LINE, .34) + E(420, 520, 140, 40, "#ffffff", rot=-50, op=.25))


def fx_lightning():
    pts = [(600, 60), (330, 520), (500, 520), (380, 960), (720, 400), (540, 400), (700, 60)]
    b = P(poly(pts), "#fff3a6", op=.6, extra='filter="url(#b30)"') + P(poly(pts), "#ffe066", "#e6a52e", 12)
    b += P(poly([(610, 110), (420, 470), (470, 470)]), "#ffffff", op=.8)
    return svg(S, S, b, common_defs())


def fx_lava_bubble():
    b = C(512, 512, 330, "#ff9a4a", op=.5, extra='filter="url(#b30)"') + C(512, 512, 300, "url(#lb)", "#c24a3a", 12)
    b += E(410, 390, 90, 55, "#fff3c8", rot=-35, op=.8) + C(640, 650, 30, "#fff3c8", op=.6)
    return svg(S, S, b, rad("lb", [(0, "#ffe08a"), (.6, "#ff9a4a"), (1, "#e2553a")], .45, .4, .65) + common_defs())


def fx_steam():
    blobs = [(512, 600, 200), (360, 560, 150), (660, 540, 160), (450, 420, 150), (600, 380, 130), (520, 270, 110)]
    b = "".join(C(x, y, r_, "#ffffff", op=.6) for x, y, r_ in blobs)
    return svg(S, S, f'<g filter="url(#b14)">{b}</g>' + "".join(C(x - r_ * .2, y - r_ * .25, r_ * .4, "#ffffff", op=.5) for x, y, r_ in blobs[:3]), common_defs())


def fx_icicle():
    pts = [(400, 80), (624, 80), (560, 500), (530, 760), (512, 960), (494, 760), (464, 500)]
    b = P(smooth(pts, True, .2), "#9fe0ff", op=.5, extra='filter="url(#b30)"') + P(smooth(pts, True, .2), "url(#ic)", "#5a9fd6", 10)
    b += P(smooth([(450, 120), (480, 500), (505, 850)], False), stroke="#ffffff", sw=18, op=.8)
    b += sparkles(5, 6, 100, 900, "#ffffff", 8, 16).replace(str(W), str(S))
    return svg(S, S, b, lin("ic", [(0, "#e8f8ff"), (1, "#7fc4ef")], 0, 0, 1, 0) + common_defs())


def fx_sun_glare():
    d = rad("sg", [(0, "#ffffff", 1), (.15, "#fff6c8", .95), (.5, "#ffd98a", .35), (1, "#ffd98a", 0)])
    b = C(512, 512, 500, "url(#sg)")
    for k in range(12):
        a = np.radians(k * 30)
        b += P(poly([(512, 512), (512 + 480 * np.cos(a - .05), 512 + 480 * np.sin(a - .05)), (512 + 480 * np.cos(a + .05), 512 + 480 * np.sin(a + .05))]), "#fff6c8", op=.35)
    b += hexagon(760, 760, 60, "#fff6d8", None, .4) + hexagon(860, 860, 30, "#fff6d8", None, .35)
    return svg(S, S, b, d)


def fx_season_swirl():
    b = ""
    for k in range(2):
        pts = [(512 + (60 + 6 * t) * np.cos(np.radians(t * 9 + 180 * k)), 512 + (60 + 6 * t) * np.sin(np.radians(t * 9 + 180 * k))) for t in range(0, 70, 3)]
        col = "#9fdcff" if k == 0 else "#ffc6d6"
        b += P(smooth(pts, False), stroke=col, sw=60, op=.45, extra='filter="url(#b14)"') + P(smooth(pts, False), stroke=col, sw=24) + P(smooth(pts, False), stroke="#ffffff", sw=8, op=.8)
    for ang in range(200, 360, 40):
        a = np.radians(ang); x, y = 512 + 330 * np.cos(a), 512 + 330 * np.sin(a)
        b += snowflake(x, y, 34)
    for ang in range(20, 180, 40):
        a = np.radians(ang); x, y = 512 + 330 * np.cos(a), 512 + 330 * np.sin(a)
        b += E(x, y, 26, 15, "#ffc6d6", rot=ang, stroke="#e07f9e", sw=3)
    b += C(512, 512, 70, "#fff3b0", "#f2c86b", 6) + sparkles(3, 8, 300, 720, "#fff3b0", 6, 12).replace(str(W), str(S))
    return svg(S, S, b, common_defs())


def snowflake(x, y, s):
    out = ""
    for k in range(6):
        a = np.radians(k * 60); ex, ey = x + s * np.cos(a), y + s * np.sin(a)
        out += P(poly([(x, y), (ex, ey)], False), stroke="#ffffff", sw=6) + P(poly([(x, y), (ex, ey)], False), stroke="#9fdcff", sw=3)
    return out + C(x, y, s * .2, "#ffffff")


JOBS = {
    "winter/winter_far.png": winter_far, "winter/winter_mid.png": winter_mid, "winter/winter_near.png": winter_near,
    "summer/summer_far.png": summer_far, "summer/summer_mid.png": summer_mid, "summer/summer_near.png": summer_near,
    "rainforest/rainforest_far.png": rainforest_far, "rainforest/rainforest_storm_far.png": lambda: rainforest_far(True),
    "rainforest/rainforest_mid.png": rainforest_mid, "rainforest/rainforest_near.png": rainforest_near,
    "spring/spring_far.png": spring_far, "spring/spring_mid.png": spring_mid, "spring/spring_near.png": spring_near,
    "spring/spring_station.png": spring_station,
    "ice_fire/tunnel_ice_wall.png": tunnel_ice_wall, "ice_fire/tunnel_lava_wall.png": tunnel_lava_wall,
    "winter/frost_overlay.png": frost, "winter/frost_corner.png": lambda: frost(True),
    "rainforest/raindrops_overlay.png": raindrops, "summer/heat_haze_overlay.png": heat_haze,
    "seasonal_chaos/fog_overlay.png": fog,
    "spring/fx_sakura_petal.png": fx_sakura_petal, "rainforest/fx_tropical_leaf.png": fx_tropical_leaf,
    "rainforest/fx_lightning.png": fx_lightning, "ice_fire/fx_lava_bubble.png": fx_lava_bubble,
    "ice_fire/fx_steam.png": fx_steam, "ice_fire/fx_icicle.png": fx_icicle, "summer/fx_sun_glare.png": fx_sun_glare,
    "seasonal_chaos/fx_season_swirl.png": fx_season_swirl,
}


def main(names):
    sel = {k: v for k, v in JOBS.items() if not names or any(n in k for n in names)}
    src = os.path.join(ROOT, "project", "art_render", "svg")
    os.makedirs(src, exist_ok=True)
    jobs = []
    for k, fn in sel.items():
        text = fn(); open(os.path.join(src, os.path.basename(k).replace(".png", ".svg")), "w").write(text)
        jobs.append((text, os.path.join(A, k)))
    render(jobs)
    print(f"{len(jobs)} images rendered")


if __name__ == "__main__":
    main(sys.argv[1:])
