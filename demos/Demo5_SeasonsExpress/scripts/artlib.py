"""Tiny SVG toolkit for Demo 5's procedural art (ChatGPT was unavailable, so the art is drawn in code).

Everything is plain SVG rendered by headless Chrome → RGBA PNG.  Style rules (match Demo 1–3):
pastel palette, soft cel shading (flat light / shade shapes), warm thin outlines, rounded shapes, soft glow.
"""
import math, os, subprocess, tempfile
from concurrent.futures import ThreadPoolExecutor
import numpy as np

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"


def f(v): return f"{v:.1f}"


def poly(pts, close=True):
    s = "M" + " L".join(f"{f(x)},{f(y)}" for x, y in pts)
    return s + (" Z" if close else "")


def smooth(pts, close=True, k=0.5):
    """Catmull-Rom spline through pts → cubic Bézier path."""
    p = list(pts); n = len(p)
    if n < 3: return poly(p, close)
    get = (lambda i: p[i % n]) if close else (lambda i: p[min(max(i, 0), n - 1)])
    s = f"M{f(p[0][0])},{f(p[0][1])}"
    for i in range(n if close else n - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) * k / 3, p1[1] + (p2[1] - p0[1]) * k / 3)
        c2 = (p2[0] - (p3[0] - p1[0]) * k / 3, p2[1] - (p3[1] - p1[1]) * k / 3)
        s += f" C{f(c1[0])},{f(c1[1])} {f(c2[0])},{f(c2[1])} {f(p2[0])},{f(p2[1])}"
    return s + (" Z" if close else "")


def el(tag, **a):
    attrs = " ".join(f'{k.rstrip("_").replace("_", "-")}="{v}"' for k, v in a.items() if v is not None)
    return f"<{tag} {attrs}/>"


def P(d, fill="none", stroke=None, sw=None, op=None, extra=""):
    a = f'd="{d}" fill="{fill}"'
    if stroke: a += f' stroke="{stroke}" stroke-width="{sw or 3}" stroke-linejoin="round" stroke-linecap="round"'
    if op is not None: a += f' opacity="{op}"'
    return f"<path {a} {extra}/>"


def C(x, y, r, fill, stroke=None, sw=None, op=None, extra=""):
    a = f'cx="{f(x)}" cy="{f(y)}" r="{f(r)}" fill="{fill}"'
    if stroke: a += f' stroke="{stroke}" stroke-width="{sw or 3}"'
    if op is not None: a += f' opacity="{op}"'
    return f"<circle {a} {extra}/>"


def E(x, y, rx, ry, fill, rot=0, op=None, stroke=None, sw=None, extra=""):
    a = f'cx="{f(x)}" cy="{f(y)}" rx="{f(rx)}" ry="{f(ry)}" fill="{fill}"'
    if rot: a += f' transform="rotate({f(rot)} {f(x)} {f(y)})"'
    if stroke: a += f' stroke="{stroke}" stroke-width="{sw or 3}"'
    if op is not None: a += f' opacity="{op}"'
    return f"<ellipse {a} {extra}/>"


def lin(id_, stops, x1=0, y1=0, x2=0, y2=1):
    s = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in _stops(stops))
    return f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">{s}</linearGradient>'


def rad(id_, stops, cx=.5, cy=.5, r=.5, units=None):
    s = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in _stops(stops))
    u = f' gradientUnits="{units}"' if units else ""
    return f'<radialGradient id="{id_}" cx="{cx}" cy="{cy}" r="{r}"{u}>{s}</radialGradient>'


def _stops(stops):
    for st in stops:
        yield (st[0], st[1], st[2] if len(st) > 2 else 1)


def blur(id_, sd): return f'<filter id="{id_}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="{sd}"/></filter>'


def svg(w, h, body, defs=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">'
            f"<defs>{defs}</defs>{body}</svg>")


def wrap_x(x, w, W, fn):
    """Draw fn(x) and its copies shifted by ±W where they touch the canvas → seamless horizontal tiling."""
    out = [fn(x)]
    if x - w < 0: out.append(fn(x + W))
    if x + w > W: out.append(fn(x - W))
    return "".join(out)


def render(jobs, workers=6):
    """jobs: list of (svg_text, out_png).  Renders each with headless Chrome at the SVG's own size."""
    import re
    def one(job):
        text, out = job
        w, h = map(int, re.search(r'width="(\d+)" height="(\d+)"', text).groups())
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with tempfile.TemporaryDirectory() as td:
            src = os.path.join(td, "a.svg"); open(src, "w").write(text)
            png = os.path.join(td, "a.png")
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                            "--default-background-color=00000000", f"--window-size={w},{h}", f"--screenshot={png}",
                            "file://" + src], check=True, capture_output=True, timeout=120)
            os.replace(png, out)
        return out
    with ThreadPoolExecutor(workers) as ex:
        return list(ex.map(one, jobs))


def rng(seed): return np.random.default_rng(seed)
