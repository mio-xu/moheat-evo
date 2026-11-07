"""Train interior (one-point perspective, true 3-D projection) → assets/train_interior/*.png

  python3 scripts/art_train.py

Writes train_interior_master.png (glass = #00FF00, as in the prompt list), train_interior_{day,dusk,night}.png
(glass = transparent, ready to composite over the scrolling scenery), window_mask.png, window_geometry.json,
seat_foreground.png, clock_face.png, clock_hands.png, lamp.png, table_props.png.
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from artlib import *

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "train_interior")
TMP = os.path.join(ROOT, "project", "art_render")
W, H = 1536, 1024
FOC, VX, VY = 610.0, 768.0, 418.0
HW, FLOOR, CORN, PEAK = 1.3, -1.15, 1.02, 1.52        # half width, floor, cornice, ceiling peak (m, eye = 0)
Z0, ZEND = 0.30, 5.6
WIN = dict(z0=1.45, z1=3.55, y0=-0.08, y1=0.86, r=0.20, frame=0.085)
LAMPS = (1.85, 3.45, 5.0)
LINE = "#7a5446"
# palette
CREAM, CREAM_S = "#fff3e2", "#f3dcc4"
WOOD, WOOD_S, WOOD_L = "#c88b5d", "#a96f48", "#e2b083"
CEIL, CEIL_S = "#fdf0dc", "#f1d9bd"
SEAT, SEAT_S, SEAT_L = "#f3a9b9", "#d9879b", "#ffd0da"
CARPET, CARPET_S = "#9fd3c7", "#7cbcb0"
BRASS, BRASS_S = "#f2c86b", "#c99a3e"


def pr(X, Y, Z): return (VX + FOC * X / Z, VY - FOC * Y / Z)
def prs(pts): return [pr(*p) for p in pts]
def arcY(X): return CORN + (PEAK - CORN) * np.sqrt(np.clip(1 - (X / HW) ** 2, 0, 1))


def rrect_plane(a0, a1, b0, b1, r, n=7):
    """rounded rectangle in a 2-D plane (a = depth or x, b = height) → list of (a, b)"""
    pts = []
    for (ca, cb, t0) in ((a1 - r, b1 - r, 0), (a0 + r, b1 - r, 90), (a0 + r, b0 + r, 180), (a1 - r, b0 + r, 270)):
        for t in np.linspace(t0, t0 + 90, n):
            pts.append((ca + r * np.cos(np.radians(t)), cb + r * np.sin(np.radians(t))))
    return pts


def wall_pts(side, ab):            # side wall plane X = side*HW, (Z, Y)
    return prs([(side * HW, b, a) for a, b in ab])


# ------------------------------------------------------------------ geometry pieces
def ceiling():
    xs = np.linspace(-HW, HW, 41)
    near = [(x, arcY(x), Z0) for x in xs]; far = [(x, arcY(x), ZEND) for x in xs[::-1]]
    out = P(poly(prs(near + far)), "url(#ceil)")
    # panels between ribs: alternate light stripes
    zs = np.arange(0.5, ZEND, 0.55)
    for i in range(len(zs) - 1):
        if i % 2: continue
        a = [(x, arcY(x), zs[i]) for x in xs]; b = [(x, arcY(x), zs[i + 1]) for x in xs[::-1]]
        out += P(poly(prs(a + b)), "#fff9ee", op=.55)
    # ribs
    for z in zs:
        pts = prs([(x, arcY(x) - .01, z) for x in xs])
        out += P(poly(pts, False), stroke=WOOD, sw=f(26 / z))
        out += P(poly(pts, False), stroke=WOOD_L, sw=f(7 / z), op=.8)
    # centre beam with little stars painted on
    out += P(poly(prs([(-.12, PEAK - .005, Z0), (.12, PEAK - .005, Z0), (.12, PEAK - .005, ZEND), (-.12, PEAK - .005, ZEND)])), "#ffe7c2", op=.9)
    for z in np.arange(0.7, ZEND, .55):
        x, y = pr(0, PEAK - .01, z + .27)
        out += star(x, y, 22 / z, "#ffd36e", LINE, 4 / z)
    return out


def star(x, y, r, fill, stroke=None, sw=2):
    pts = []
    for i in range(10):
        rr = r if i % 2 == 0 else r * .48
        a = -np.pi / 2 + i * np.pi / 5
        pts.append((x + rr * np.cos(a), y + rr * np.sin(a)))
    return P(smooth(pts, True, .15), fill, stroke, sw)


def side_wall(side):
    s = side
    out = ""
    # upper cream wall and lower wainscot
    up = wall_pts(s, [(Z0, -0.25), (ZEND, -0.25), (ZEND, CORN), (Z0, CORN)])
    lo = wall_pts(s, [(Z0, FLOOR), (ZEND, FLOOR), (ZEND, -0.25), (Z0, -0.25)])
    out += P(poly(up), "url(#wallup)") + P(poly(lo), "url(#wainscot)")
    # wallpaper: tiny dotted flowers
    for z in np.arange(0.75, ZEND - .2, .32):
        for y in np.arange(-0.05, CORN - .05, .27):
            if WIN["z0"] - .15 < z < WIN["z1"] + .15 and WIN["y0"] - .15 < y < WIN["y1"] + .15: continue
            x0, y0 = pr(s * HW, y + (.13 if int(z / .32) % 2 else 0), z)
            out += C(x0, y0, 7 / z, "#f6c9cf", op=.75) + C(x0, y0, 2.6 / z, "#fff7ef")
    # wainscot panels
    zs = np.arange(0.6, ZEND, .62)
    for z in zs:
        pan = wall_pts(s, rrect_plane(z + .05, z + .55, FLOOR + .18, -0.38, .06, 4))
        out += P(poly(pan), WOOD_S, op=.45) + P(poly(pan), stroke=WOOD_L, sw=f(4 / z), op=.7)
    # rails: brass rail at -0.25, wood cornice at CORN
    for y, col, wdt in ((-0.25, BRASS, 13), (-0.21, "#fff1c4", 4), (CORN - .02, WOOD, 30), (CORN - .05, WOOD_L, 8)):
        out += P(poly(wall_pts(s, [(Z0, y), (ZEND, y)]), False), stroke=col, sw=wdt / 2.2)
    # luggage rack: brass bar + brackets
    for z in np.arange(0.9, ZEND, .9):
        out += P(poly(prs([(s * HW, .93, z), (s * (HW - .2), .93, z)]), False), stroke=BRASS_S, sw=f(9 / z))
    out += P(poly(prs([(s * (HW - .2), .93, Z0 + .3), (s * (HW - .2), .93, ZEND)]), False), stroke=BRASS, sw=8)
    out += P(poly(prs([(s * (HW - .2), .96, Z0 + .3), (s * (HW - .2), .96, ZEND)]), False), stroke="#fff1c4", sw=2.5)
    # sconce lamp between window and end wall
    x, y = pr(s * HW, .45, 4.45)
    out += E(x, y + 6, 13, 6, BRASS_S) + P(smooth([(x - 12, y), (x - 16, y - 26), (x, y - 34), (x + 16, y - 26), (x + 12, y)]), "#fff4c9", LINE, 2)
    return out


def window(side):
    s, w = side, WIN
    fr = w["frame"]
    outer = wall_pts(s, rrect_plane(w["z0"] - fr, w["z1"] + fr, w["y0"] - fr, w["y1"] + fr, w["r"] + fr))
    inner = wall_pts(s, rrect_plane(w["z0"], w["z1"], w["y0"], w["y1"], w["r"]))
    bev = wall_pts(s, rrect_plane(w["z0"] - fr * .45, w["z1"] + fr * .45, w["y0"] - fr * .45, w["y1"] + fr * .45, w["r"] + fr * .45))
    out = P(poly(outer), WOOD, LINE, 3) + P(poly(bev), stroke=WOOD_L, sw=5, op=.9)
    # sill (a little shelf that sticks out of the wall)
    sill = prs([(s * HW, w["y0"] - fr, w["z0"] - .14), (s * HW, w["y0"] - fr, w["z1"] + .14),
                (s * (HW - .1), w["y0"] - fr - .02, w["z1"] + .14), (s * (HW - .1), w["y0"] - fr - .02, w["z0"] - .14)])
    out += P(poly(sill), WOOD_L, LINE, 3)
    # a tiny potted flower on the sill near the far end
    x, y = pr(s * (HW - .06), w["y0"] - fr, w["z1"] + .02)
    out += P(poly([(x - 9, y), (x + 9, y), (x + 7, y - 14), (x - 7, y - 14)]), "#f1a27e", LINE, 2)
    for dx, dy, c in ((-6, -22, "#ff9fb5"), (6, -24, "#ffd36e"), (0, -30, "#ffb3c7")):
        out += C(x + dx, y + dy, 6, c, LINE, 1.6)
    out += C(x, y - 18, 4, "#7cc28a")
    return out, inner, outer


def curtains(side):
    s, w = side, WIN
    out = ""
    for zc, dirn in ((w["z0"] - .2, 1), (w["z1"] + .2, -1)):          # curtains tied back beside the frame, not over the glass
        top = w["y1"] + w["frame"] + .04
        z1 = zc + dirn * .2
        pts = [(zc, top), (z1, top), (zc + dirn * .13, .32), (zc + dirn * .17, w["y0"] - .02), (zc, w["y0"] - .05)]
        pp = wall_pts(s, [(a, b) for a, b in pts])
        # draw slightly off the wall so it is in front of the frame
        pp = [pr(s * (HW - .03), b, a) for a, b in pts]
        out += P(smooth(pp, True, .35), "url(#curtain)", LINE, 3)
        # folds
        for t in (.3, .65):
            a = [(zc + dirn * .24 * t, top), (zc + dirn * (.04 + .1 * t), .32), (zc + dirn * .1 * t, w["y0"])]
            out += P(smooth([pr(s * (HW - .03), b, z) for z, b in a], False), stroke="#e79aae", sw=3, op=.8)
        # tie-back ribbon
        bx, by = pr(s * (HW - .035), .32, zc + dirn * .13)
        out += E(bx, by, 12, 8, "#ffe08a", stroke=LINE, sw=2) + C(bx, by, 4, "#f2b84b")
    # valance across the top
    zz = np.linspace(w["z0"] - .2, w["z1"] + .2, 13)
    top = w["y1"] + w["frame"] + .1
    pts = [(s * (HW - .035), top, z) for z in zz] + [(s * (HW - .035), top - .12 - .04 * (i % 2), z) for i, z in enumerate(zz[::-1])]
    out += P(smooth(prs(pts), True, .3), "url(#curtain)", LINE, 3)
    return out


def floor():
    near = [(-HW, FLOOR, Z0), (HW, FLOOR, Z0), (HW, FLOOR, ZEND), (-HW, FLOOR, ZEND)]
    out = P(poly(prs(near)), "url(#floorg)")
    r = rng(3)
    for x in np.arange(-HW + .16, HW, .16):
        out += P(poly(prs([(x, FLOOR, Z0), (x, FLOOR, ZEND)]), False), stroke=WOOD_S, sw=2.2, op=.5)
        for z in r.uniform(.5, ZEND, 4):
            out += P(poly(prs([(x - .16, FLOOR, z), (x, FLOOR, z)]), False), stroke=WOOD_S, sw=2, op=.4)
    car = [(-.36, FLOOR + .002, Z0), (.36, FLOOR + .002, Z0), (.36, FLOOR + .002, ZEND), (-.36, FLOOR + .002, ZEND)]
    out += P(poly(prs(car)), "url(#carpet)")
    for x in (-.31, .31):
        out += P(poly(prs([(x, FLOOR, Z0), (x, FLOOR, ZEND)]), False), stroke="#fff7e8", sw=4, op=.85)
    for z in np.arange(.45, ZEND, .38):
        x, y = pr(0, FLOOR, z)
        out += E(x, y, 26 / z * 1.4, 9 / z * 1.4, "#ffe2a8", op=.85)
    return out


def end_wall():
    xs = np.linspace(-HW, HW, 41)
    sec = [(-HW, FLOOR, ZEND), (HW, FLOOR, ZEND)] + [(x, arcY(x), ZEND) for x in xs[::-1]]
    out = P(poly(prs(sec)), "url(#endwall)", LINE, 2)
    # wainscot
    out += P(poly(prs([(-HW, FLOOR, ZEND), (HW, FLOOR, ZEND), (HW, -.25, ZEND), (-HW, -.25, ZEND)])), WOOD)
    out += P(poly(prs([(-HW, -.25, ZEND), (HW, -.25, ZEND)]), False), stroke=BRASS, sw=4)
    # door with rounded top
    d = [(x, y, ZEND) for x, y in rrect_plane(-.42, .42, FLOOR, .78, .3)]
    out += P(poly(prs(d)), WOOD, LINE, 3)
    d2 = [(x, y, ZEND) for x, y in rrect_plane(-.34, .34, FLOOR + .05, .70, .24)]
    out += P(poly(prs(d2)), WOOD_L, op=.55)
    glass = prs([(x, y, ZEND) for x, y in rrect_plane(-.22, .22, .02, .58, .18)])
    for yy in (-.65, -.25):
        pan = prs([(x, y, ZEND) for x, y in rrect_plane(-.22, .22, yy, yy + .3, .05)])
        out += P(poly(pan), WOOD_S, op=.5)
    kx, ky = pr(.3, -.2, ZEND)
    out += C(kx, ky, 4.5, BRASS, LINE, 1.5)
    # little framed pictures either side
    for sx, col in ((-.86, "#bfe3f5"), (.86, "#fcd6e0")):
        fr = prs([(x, y, ZEND) for x, y in rrect_plane(sx - .2, sx + .2, .15, .55, .04)])
        out += P(poly(fr), BRASS_S, LINE, 2)
        inn = prs([(x, y, ZEND) for x, y in rrect_plane(sx - .16, sx + .16, .19, .51, .03)])
        out += P(poly(inn), col)
        cx, cy = pr(sx, .33, ZEND)
        out += (P(poly([(cx - 9, cy + 7), (cx - 2, cy - 6), (cx + 4, cy + 2), (cx + 7, cy - 2), (cx + 11, cy + 7)]), "#8fc79a") if sx < 0
                else C(cx, cy, 6, "#ff9fb5") + C(cx - 7, cy + 4, 4, "#ffd36e") + C(cx + 7, cy + 4, 4, "#ffd36e"))
    return out, glass


def clock_svg(cx, cy, R, with_hands=False, hh=10.2, mm=8):
    """Cute round brass clock: scalloped rim, cream dial, coloured dots for hours, little crown on top."""
    out = ""
    pts = []
    for i in range(48):
        a = i / 48 * 2 * np.pi
        rr = R * (1.0 + .035 * np.cos(a * 12))
        pts.append((cx + rr * np.cos(a), cy + rr * np.sin(a)))
    out += E(cx, cy - R * .98, R * .16, R * .1, BRASS_S, stroke=LINE, sw=R * .025)
    out += C(cx, cy - R * 1.1, R * .07, "#ff9fb5", LINE, R * .02)
    out += P(smooth(pts), "url(#brass)", LINE, R * .035)
    out += C(cx, cy, R * .82, "#c99a3e") + C(cx, cy, R * .78, "url(#dial)", LINE, R * .02)
    for i in range(12):
        a = -np.pi / 2 + i * np.pi / 6
        x, y = cx + R * .64 * np.cos(a), cy + R * .64 * np.sin(a)
        if i % 3 == 0:
            out += star(x, y, R * .085, ["#ffcf5c", "#9fd3e8", "#ff9fb5", "#a8d8a0"][i // 3], LINE, R * .012)
        else:
            out += C(x, y, R * .035, "#d7a7b6")
    out += P(smooth([(cx - R * .28, cy + R * .3), (cx, cy + R * .4), (cx + R * .28, cy + R * .3)], False), stroke="#f2c86b", sw=R * .02, op=.6)
    out += E(cx - R * .32, cy - R * .4, R * .22, R * .1, "#ffffff", rot=-35, op=.45)
    if with_hands:
        out += hands_svg(cx, cy, R, hh, mm)
    out += C(cx, cy, R * .06, "#c99a3e", LINE, R * .015)
    return out


def hand(cx, cy, L, wdt, ang, fill):
    a = np.radians(ang - 90)
    ux, uy = np.cos(a), np.sin(a); px, py = -uy, ux
    pts = [(cx - ux * L * .14 + px * wdt * .4, cy - uy * L * .14 + py * wdt * .4), (cx + ux * L * .6 + px * wdt, cy + uy * L * .6 + py * wdt),
           (cx + ux * L, cy + uy * L), (cx + ux * L * .6 - px * wdt, cy + uy * L * .6 - py * wdt),
           (cx - ux * L * .14 - px * wdt * .4, cy - uy * L * .14 - py * wdt * .4)]
    return P(smooth(pts, True, .25), fill, LINE, wdt * .25)


def hands_svg(cx, cy, R, hh, mm):
    return hand(cx, cy, R * .46, R * .06, hh * 30 + mm * .5, "#8a5a4a") + hand(cx, cy, R * .66, R * .045, mm * 6, "#b5707d")


def lamp_svg(x, y, s, lit=False):
    """hanging tulip lamp; (x, y) = bottom of the cord (top of the cap), s = scale (px per 0.1 m)"""
    out = P(poly([(x - s * .5, y), (x + s * .5, y), (x + s * .35, y + s * .6), (x - s * .35, y + s * .6)]), BRASS, LINE, s * .08)
    pts = [(x - s * .35, y + s * .55), (x - s * 1.25, y + s * 1.9), (x - s * .9, y + s * 2.25), (x - s * .45, y + s * 2.0),
           (x, y + s * 2.35), (x + s * .45, y + s * 2.0), (x + s * .9, y + s * 2.25), (x + s * 1.25, y + s * 1.9), (x + s * .35, y + s * .55)]
    out += P(smooth(pts, True, .4), "url(#shade_lit)" if lit else "url(#shade)", LINE, s * .08)
    out += P(smooth([(x - s * .8, y + s * 1.5), (x - s * .3, y + s * .9)], False), stroke="#ffffff", sw=s * .14, op=.6)
    out += C(x, y + s * 2.25, s * .16, BRASS_S, LINE, s * .05)
    return out


def seat(side, z):
    s = side
    x0, x1 = (-HW + .08, -.38) if s < 0 else (.38, HW - .08)
    top, dep = -.27, .16
    inner_x = x1 if s < 0 else x0
    out = ""
    # inner side face (towards the aisle)
    sd = prs([(inner_x, FLOOR, z), (inner_x, FLOOR, z + dep), (inner_x, top - .03, z + dep), (inner_x, top - .03, z)])
    out += P(poly(sd), SEAT_S, LINE, 2.5)
    # top face
    tp = prs([(x0, top, z), (x1, top, z), (x1, top, z + dep), (x0, top, z + dep)])
    out += P(poly(tp), SEAT_L, LINE, 2.5)
    # front face (back of the seat) = rounded rect in the X-Y plane
    fr = prs([(x, y, z) for x, y in rrect_plane(x0, x1, FLOOR + .1, top, .09)])
    out += P(poly(fr), "url(#seat)", LINE, 3)
    # wooden plinth
    out += P(poly(prs([(x0 + .02, FLOOR, z), (x1 - .02, FLOOR, z), (x1 - .02, FLOOR + .12, z), (x0 + .02, FLOOR + .12, z)])), WOOD_S, LINE, 2)
    # tufting buttons and a lace head-cover
    for xx in np.linspace(x0 + .18, x1 - .18, 3):
        for yy in (-.55, -.8):
            bx, by = pr(xx, yy, z)
            out += C(bx, by, 7 / z, "#e58ea3") + C(bx - 1.5 / z, by - 1.5 / z, 2.5 / z, "#ffe1e8")
    lc = prs([(x, y, z - .005) for x, y in rrect_plane((x0 + x1) / 2 - .2, (x0 + x1) / 2 + .2, top - .2, top + .005, .05)])
    out += P(poly(lc), "#fffaf3", LINE, 1.8)
    for xx in np.linspace((x0 + x1) / 2 - .17, (x0 + x1) / 2 + .17, 7):
        bx, by = pr(xx, top - .2, z - .005)
        out += C(bx, by, 6 / z, "#fffaf3", LINE, 1.5 / z * 1.5)
    out += P(poly(prs([((x0 + x1) / 2 - .2, top - .16, z - .006), ((x0 + x1) / 2 + .2, top - .16, z - .006)]), False), stroke="#f4c6d0", sw=f(5 / z))
    return out


def table():
    y, z0, z1, hx = -.58, .62, .98, .36
    out = ""
    edge = prs([(-hx, y - .06, z0), (hx, y - .06, z0), (hx, y, z0), (-hx, y, z0)])
    top = prs([(-hx, y, z0), (hx, y, z0), (hx, y, z1), (-hx, y, z1)])
    out += P(poly(top), "url(#tabletop)", LINE, 4)
    out += P(poly(edge), WOOD_S, LINE, 4)
    # runner cloth
    run = prs([(-.17, y + .002, z0), (.17, y + .002, z0), (.17, y + .002, z1), (-.17, y + .002, z1)])
    out += P(poly(run), "#fff4f6", op=.95)
    for xx in (-.15, .15):
        out += P(poly(prs([(xx, y + .003, z0), (xx, y + .003, z1)]), False), stroke="#f6b4c3", sw=4)
    hang = prs([(-.17, y + .002, z0 - .005), (.17, y + .002, z0 - .005), (.17, y - .1, z0 - .006), (-.17, y - .1, z0 - .006)])
    out += P(poly(hang), "#fff4f6", LINE, 2.5)
    for xx in np.linspace(-.15, .15, 9):
        bx, by = pr(xx, y - .1, z0 - .006)
        out += C(bx, by, 9, "#fff4f6", LINE, 2)
    return out


def defs(scene="day"):
    return "".join([
        lin("ceil", [(0, CEIL_S), (1, CEIL)]),
        lin("wallup", [(0, CREAM), (1, "#fde8d3")]),
        lin("wainscot", [(0, WOOD), (1, "#b47750")]),
        lin("floorg", [(0, "#d9a477"), (1, "#c38558")]),
        lin("carpet", [(0, CARPET), (1, CARPET_S)]),
        lin("endwall", [(0, CREAM_S), (1, CREAM)]),
        lin("seat", [(0, SEAT), (.75, SEAT), (1, SEAT_S)]),
        lin("curtain", [(0, "#ffc4d0"), (1, "#f6a9bb")], 0, 0, 1, 0),
        lin("tabletop", [(0, "#d69a6b"), (1, WOOD_L)]),
        lin("brass", [(0, "#ffe39a"), (1, BRASS_S)]),
        rad("dial", [(0, "#fffdf6"), (1, "#fbecd2")]),
        lin("shade", [(0, "#fff7dc"), (1, "#f8d9b8")]),
        rad("shade_lit", [(0, "#fffef2"), (.7, "#ffe9a8"), (1, "#ffc977")], .5, .75, .7),
    ])


def scene_svg(glass_green=False, lit=False, only=None):
    body_back = ceiling() + floor() + side_wall(-1) + side_wall(1)
    ew, door_glass = end_wall()
    body_back += ew
    win = []
    for s in (-1, 1):
        w_svg, inner, outer = window(s); body_back += w_svg; win.append(inner)
    cx, cy = pr(0, 1.07, ZEND)
    R = .3 * FOC / ZEND
    body_back += clock_svg(cx, cy, R)
    glass = [poly(g) for g in win] + [poly(door_glass)]
    mask = ('<mask id="cut" maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1024">'
            f'<rect width="1536" height="1024" fill="white"/>{"".join(P(g, "black") for g in glass)}</mask>')
    front = curtains(-1) + curtains(1)
    for z in (4.45, 3.55, 2.65, 1.75):
        front += seat(-1, z) + seat(1, z)
    for z in sorted(LAMPS, reverse=True):
        x, y = pr(0, PEAK - .02, z); x2, y2 = pr(0, 1.18, z)
        front += P(poly([(x, y), (x2, y2)], False), stroke=LINE, sw=f(10 / z))
        front += lamp_svg(x2, y2, 0.1 * FOC / z, lit)
    front += table()
    green = "".join(P(g, "#00FF00") for g in glass) if glass_green else ""
    body = f'<g mask="url(#cut)">{body_back}</g>{green}{front}'
    if only == "table": body = table()
    return svg(W, H, body, defs() + mask), win, door_glass, (cx, cy, R)


def lamp_points():
    out = []
    for z in LAMPS:
        x2, y2 = pr(0, 1.18, z); s = .1 * FOC / z
        out.append((x2, y2 + s * 1.6, s))
    return out


def tint(png_in, png_out, mode):
    im = np.asarray(Image.open(png_in).convert("RGBA")).astype(np.float32) / 255
    rgb, a = im[..., :3], im[..., 3:]
    yy, xx = np.mgrid[0:H, 0:W]
    glow = np.zeros((H, W))
    for x, y, s in lamp_points():
        glow += .6 * np.exp(-((xx - x) ** 2 / (2 * (s * 11) ** 2) + (yy - y) ** 2 / (2 * (s * 7) ** 2)))
        glow += 1.4 * np.exp(-((xx - x) ** 2 + (yy - y) ** 2) / (2 * (s * 1.4) ** 2))
    glow += .35 * np.exp(-((xx - 768) ** 2 / (2 * 520 ** 2) + (yy - 640) ** 2 / (2 * 260 ** 2)))   # warm pool on seats / table
    for gx in (300, 1236):                                                                    # wall sconces
        glow += .35 * np.exp(-((xx - gx) ** 2 + (yy - 330) ** 2) / (2 * 140 ** 2))
    glow = np.clip(glow, 0, 2)[..., None]
    warm = np.array([1.0, .78, .45])
    if mode == "day":
        rgb = rgb * .98 + .02
        rgb = 1 - (1 - rgb) * (1 - .06 * glow * warm)
    elif mode == "dusk":
        rgb = rgb * np.array([1.0, .80, .66]) * .93
        rgb = 1 - (1 - rgb) * (1 - .38 * glow * warm)
    elif mode == "night":
        lum = rgb.mean(-1, keepdims=True)
        rgb = (rgb * .55 + lum * .45) * np.array([.42, .44, .70])
        rgb = 1 - (1 - rgb) * (1 - .5 * np.clip(glow, 0, 1) ** 1.3 * warm)
    out = np.concatenate([np.clip(rgb, 0, 1), a], -1)
    Image.fromarray((out * 255).astype(np.uint8)).save(png_out)


def main():
    os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
    s_dark, win, door, clock = scene_svg(lit=False)
    s_lit, _, _, _ = scene_svg(lit=True)
    s_green, _, _, _ = scene_svg(glass_green=True)
    s_table, _, _, _ = scene_svg(only="table")
    R = 420
    clock_face = svg(1024, 1024, clock_svg(512, 540, R), defs())
    clock_hands = svg(1024, 1024, hand(330, 760, 600, 34, 0, "#8a5a4a") + hand(700, 900, 820, 26, 0, "#b5707d") +
                      C(330, 760, 22, "#c99a3e", LINE, 6) + C(700, 900, 22, "#c99a3e", LINE, 6), defs())
    lamp = svg(1024, 1024, P(poly([(512, 0), (512, 200)], False), stroke=LINE, sw=16) + lamp_svg(512, 200, 300, True), defs())
    for name, text in (("_dark", s_dark), ("_lit", s_lit), ("master", s_green), ("table", s_table)):
        open(os.path.join(TMP, f"train_{name}.svg"), "w").write(text)
    render([(s_dark, os.path.join(TMP, "train_dark.png")), (s_lit, os.path.join(TMP, "train_lit.png")),
            (s_green, os.path.join(OUT, "train_interior_master.png")), (s_table, os.path.join(OUT, "seat_foreground.png")),
            (clock_face, os.path.join(OUT, "clock_face.png")), (clock_hands, os.path.join(OUT, "clock_hands.png")),
            (lamp, os.path.join(OUT, "lamp.png")), (props_svg(), os.path.join(OUT, "table_props.png"))])
    tint(os.path.join(TMP, "train_dark.png"), os.path.join(OUT, "train_interior_day.png"), "day")
    tint(os.path.join(TMP, "train_lit.png"), os.path.join(OUT, "train_interior_dusk.png"), "dusk")
    tint(os.path.join(TMP, "train_lit.png"), os.path.join(OUT, "train_interior_night.png"), "night")
    a = np.asarray(Image.open(os.path.join(OUT, "train_interior_day.png")))[..., 3]
    Image.fromarray(255 - a).save(os.path.join(OUT, "window_mask.png"))
    geo = dict(size=[W, H], vanishing_point=[VX, VY], focal=FOC,
               left_glass=[[round(x, 1), round(y, 1)] for x, y in win[0]], right_glass=[[round(x, 1), round(y, 1)] for x, y in win[1]],
               door_glass=[[round(x, 1), round(y, 1)] for x, y in door],
               clock=dict(cx=round(clock[0], 1), cy=round(clock[1], 1), r=round(clock[2], 1)),
               lamps=[[round(x, 1), round(y, 1), round(s, 1)] for x, y, s in lamp_points()],
               bbox=dict(left=bbox(win[0]), right=bbox(win[1])))
    json.dump(geo, open(os.path.join(OUT, "window_geometry.json"), "w"), indent=1)
    print("train interior done")


def bbox(pts):
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return [round(min(xs)), round(min(ys)), round(max(xs)), round(max(ys))]


def props_svg():
    out = ""
    # tea cup with steam
    out += E(300, 700, 190, 50, "#f6d3dc", stroke=LINE, sw=8)                                  # saucer
    out += P(smooth([(170, 520), (190, 660), (300, 700), (410, 660), (430, 520)], False) + " Z", "#fffaf3", LINE, 8)
    out += E(300, 520, 130, 34, "#c9824f", stroke=LINE, sw=8) + E(300, 524, 110, 24, "#e3a36a")
    out += P(smooth([(430, 545), (500, 560), (480, 630), (415, 630)], False), stroke=LINE, sw=26) + P(smooth([(430, 545), (500, 560), (480, 630), (415, 630)], False), stroke="#fffaf3", sw=14)
    for x0 in (250, 340):
        out += P(smooth([(x0, 470), (x0 - 25, 410), (x0 + 15, 350), (x0 - 10, 290)], False), stroke="#ffffff", sw=14, op=.7)
    out += C(300, 610, 22, "#ff9fb5") + C(272, 600, 12, "#ffd36e") + C(328, 600, 12, "#ffd36e")
    # little book
    out += P(poly([(520, 820), (880, 770), (930, 860), (560, 920)]), "#9fd3e8", LINE, 8)
    out += P(poly([(530, 800), (870, 752), (880, 770), (520, 820)]), "#fffaf3", LINE, 6)
    out += star(720, 840, 30, "#ffd36e", LINE, 4)
    # snow globe
    out += P(poly([(600, 700), (860, 700), (840, 760), (620, 760)]), "#c88b5d", LINE, 8)
    out += C(730, 560, 150, "url(#globe)", LINE, 8)
    out += P(smooth([(585, 620), (650, 580), (730, 600), (810, 575), (875, 620), (730, 700)]), "#ffffff", op=.95)
    out += P(poly([(730, 470), (690, 560), (770, 560)]), "#5d9c8f", LINE, 4) + P(poly([(730, 500), (680, 600), (780, 600)]), "#4f8e83", LINE, 4)
    out += P(poly([(730, 470), (712, 505), (748, 505)]), "#ffffff")
    for x, y in ((650, 480), (790, 470), (700, 430), (820, 540), (630, 560), (760, 440)):
        out += C(x, y, 7, "#ffffff")
    out += E(680, 470, 40, 18, "#ffffff", rot=-40, op=.55)
    return svg(1024, 1024, out, rad("globe", [(0, "#eaf7ff", .8), (1, "#b9dff2", .9)]))


if __name__ == "__main__":
    main()
