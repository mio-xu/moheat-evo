#!/usr/bin/env python3
"""Complete a pose whose body is cut off by its own picture edge (user 2026-11-08: "身体只有半截…调用 api 做完整的素材").

The pose (plain / green background) is padded on the cut sides, and the OpenAI image API (gpt-image-2, masked edit) paints
ONLY the new margin: the body / clothes / hair continue, the background stays the same plain colour. The original pixels are
pasted back afterwards, so faces, mouth / eye patches and every coordinate inside the old picture stay identical.
The talk / blink variants of that pose get the same new margin (their own pixels inside), so build_stage's patches still match.
project/stage.json is updated: src / talk / blink → *_ext, every pixel coordinate shifted by the left padding, and each view
using the pose keeps the old part of the figure exactly where it was on screen (x / y / height recomputed).

  python3 tools/art/extend_pose.py <demo> <pose> [--left PX] [--right PX] [--bottom PX] [--auto] [--dry]
     --auto   padding computed from media/layers.js: enough that every cut edge lands outside the frame (+3 % margin)
  then: build_stage.py <demo> → extend_pose.py <demo> <pose> --place → build_stage.py <demo> → check_cut_body.py <demo>

Cost ≈ one OpenAI edit (~$0.2) per pose. Key: ~/.openai_key.
"""
import argparse, base64, io, json, os, sys, time, urllib.request, urllib.error, uuid
from PIL import Image
import numpy as np

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FW, FH = 1920, 1080
ap = argparse.ArgumentParser()
ap.add_argument('demo'); ap.add_argument('pose')
for s in ('left', 'right', 'bottom'): ap.add_argument('--' + s, type=int, default=0)
ap.add_argument('--auto', action='store_true'); ap.add_argument('--dry', action='store_true')
ap.add_argument('--reraw', action='store_true', help='re-place the saved API answer (<src>_ext_raw.png) without a new call (same padding)')
ap.add_argument('--reuse', action='store_true', help='use an existing <src>_ext.png instead of calling the API')
ap.add_argument('--place', action='store_true', help='after build_stage: restore the on-screen position of the old part of the figure')
ap.add_argument('--hint', default='', help='what the missing part is, e.g. "his right shoulder and upper arm in the black jacket"')
ap.add_argument('--model', default='gpt-image-2'); ap.add_argument('--quality', default='high')
a = ap.parse_args()
D = os.path.abspath(a.demo); SJ = os.path.join(D, 'project', 'stage.json')
cfg = json.load(open(SJ)); P = cfg['poses'][a.pose]; ART = os.path.join(D, cfg.get('src', 'assets/art'))
src = lambda n: next(os.path.join(ART, n + e) for e in ('.png', '.jpg', '.webp') if os.path.exists(os.path.join(ART, n + e)))
base = Image.open(src(P['src'])).convert('RGB'); W, H = base.size
views = {k: v for k, v in cfg.get('views', {}).items() if v.get('pose') == a.pose}


def layer_box():
    """the cut-out's box inside the source picture + its placement, from media/layers.js (what build_stage produced)."""
    s = open(os.path.join(D, 'media', 'layers.js'), encoding='utf-8').read(); d = json.loads(s[s.index('{'):s.rindex('}') + 1])
    return d['views']


if a.place:   # exact: the old pixels keep their screen position (source boxes from media/layers.js, scale unchanged)
    lv = layer_box()
    for name, v in views.items():
        pre = v.pop('_pre_extend', None); c = next((x['char'] for x in lv.values() if x.get('view') == name), None)
        if not pre or not c or 'box' not in c: continue
        ob, nb, Lp = pre['box'], c['box'], pre['pad']['left']
        s = pre['height'] * FH / (ob[3] - ob[1])                       # frame px per source px
        wf0 = pre['height'] * pre['w'] / pre['h'] * 9 / 16; L0, T0 = pre['x'] - wf0 / 2, pre['y'] - pre['height']
        nl = L0 + (nb[0] - Lp - ob[0]) * s / FW; nt = T0 + (nb[1] - ob[1]) * s / FH
        nw, nh = (nb[2] - nb[0]) * s / FW, (nb[3] - nb[1]) * s / FH
        v['x'], v['y'], v['height'] = round(nl + nw / 2, 4), round(nt + nh, 4), round(nh, 4)
        print(f'  view {name}: x {pre["x"]}→{v["x"]}  y {pre["y"]}→{v["y"]}  height {pre["height"]}→{v["height"]}')
    json.dump(cfg, open(SJ, 'w'), indent=1, ensure_ascii=False); print('placement restored → run build_stage.py again'); sys.exit(0)

pad = {'left': a.left, 'right': a.right, 'bottom': a.bottom}
if a.auto:
    lv = layer_box()
    for name, v in views.items():
        c = lv.get(v.get('still', name), {}).get('char') or next((x['char'] for x in lv.values() if x.get('view') == name), None)
        if not c: continue
        al = np.array(Image.open(os.path.join(D, 'media', c['src'].split('?')[0])).convert('RGBA'))[:, :, 3]
        bx = c.get('box') or [0, 0, c['w'], c['h']]; s = c['height'] * FH / (bx[3] - bx[1])   # frame px per SOURCE px
        wf = c['height'] * c['w'] / c['h'] * 9 / 16; L, R, B = c['x'] - wf / 2, c['x'] + wf / 2, c['y']
        need = lambda frac: int(max(0, frac + .03) * FW / s) + 16
        # same rule as check_cut_body.py: an edge flush with the frame (±0.005) is hidden by the page's 1.02× zoom
        if (al[:, :3] > 128).any() and L > .005: pad['left'] = max(pad['left'], need(L))
        if (al[:, -3:] > 128).any() and R < .995: pad['right'] = max(pad['right'], need(1 - R))
        if (al[-3:, :] > 128).any() and B < .995: pad['bottom'] = max(pad['bottom'], int(max(0, 1 - B + .03) * FH / s) + 16)
print('padding', pad, 'source', base.size)
if not any(pad.values()): sys.exit('nothing to extend')
if a.dry: sys.exit(0)

L, R, B = pad['left'], pad['right'], pad['bottom']; NW, NH = W + L + R, H + B
bgc = tuple(int(v) for v in np.median(np.concatenate([np.array(base)[:8].reshape(-1, 3), np.array(base)[:, :8].reshape(-1, 3), np.array(base)[:, -8:].reshape(-1, 3)]), axis=0))
# the API works on a fixed 16:9 / 9:16 canvas. A letterboxed canvas makes the model re-compose the whole picture (Demo24 2nd try:
# the figure was redrawn full-height, so the margin no longer lined up). So: cut a WINDOW of exactly the canvas aspect out of the
# padded picture, anchored on the padded side (old picture next to the new margin), and send only that — no letterbox.
padded = Image.new('RGB', (NW, NH), bgc); padded.paste(base, (L, 0))
TW, TH = (2560, 1440) if NW >= NH else (1440, 2560)
ww = min(NW, round(NH * TW / TH)); wh = min(NH, round(ww * TH / TW)); ww = round(wh * TW / TH)
wx = 0 if L else NW - ww if R else (NW - ww) // 2      # left pad → window at the left, right pad → at the right
wy = NH - wh if B else 0
k = TW / ww
win = padded.crop((wx, wy, wx + ww, wy + wh)).resize((TW, TH), Image.LANCZOS)
m = np.full((TH, TW), 255, np.uint8)
EDGE = 6   # a few px of overlap so the new strokes join the old ones
if L: m[:, :max(0, round((L - wx) * k)) + EDGE] = 0
if R: m[:, round((L + W - wx) * k) - EDGE:] = 0
if B: m[round((H - wy) * k) - EDGE:, :] = 0
mask = Image.new('RGBA', (TW, TH), (0, 0, 0, 255)); mask.putalpha(Image.fromarray(m))
# the margin is also transparent in the picture itself: with an opaque grey margin the model just keeps the grey (Demo24 first try)
canvas = win.convert('RGBA'); canvas.putalpha(Image.fromarray(m))
if (L > 0) + (R > 0) + (B > 0) > 1: print('  note: several sides padded — the window may not reach all of them; run once per side if a margin stays empty')
hexc = '#%02x%02x%02x' % bgc
prompt = (f"Outpaint: the transparent area of this character illustration is empty. The character's body is cut off at the edge of the "
          f"opaque picture: draw the missing rest of the body into the transparent area — {a.hint or 'the clothes, sleeves, shoulders and arms'} — "
          f"continuing every line, fold and colour from the cut edge so the figure is complete and nothing ends at the old picture edge. "
          f"Exactly the same art style, line weight, colours, lighting and outfit details. Everything that is not the character stays "
          f"the same flat plain background colour {hexc}. Do not add any new person, object, text or shadow; do not change the existing picture.")
KEY = os.environ.get('OPENAI_API_KEY') or open(os.path.expanduser('~/.openai_key')).read().strip()


def ncc_map(I, T):
    """normalised cross-correlation of template T over image I (valid positions), via FFT."""
    th, tw = T.shape; H_, W_ = I.shape
    if th > H_ or tw > W_: return None
    Tz = T - T.mean(); tn = np.sqrt((Tz ** 2).sum()) + 1e-6
    sh = (H_ + th, W_ + tw)
    num = np.fft.irfft2(np.fft.rfft2(I, sh) * np.conj(np.fft.rfft2(Tz, sh)), sh)[:H_ - th + 1, :W_ - tw + 1]
    c1 = np.pad(I, ((1, 0), (1, 0))).cumsum(0).cumsum(1); c2 = np.pad(I * I, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    box = lambda c: c[th:, tw:] - c[:-th, tw:] - c[th:, :-tw] + c[:-th, :-tw]
    n = th * tw; var = np.maximum(box(c2) - box(c1) ** 2 / n, 1e-6)
    return num / (np.sqrt(var) * tn)


def register(out, win, keep_box):
    """gpt-image re-composes the picture (zoom / shift) even with a mask: find the scale + offset that maps the answer onto what we sent.
    keep_box = the old picture inside the window (canvas px). Returns (scale, dx, dy, score): canvas_sent = canvas_answer * scale + (dx, dy)."""
    g = lambda im, f: np.asarray(im.convert('L').resize((im.width // f, im.height // f), Image.BILINEAR), np.float32)
    x0, y0, x1, y1 = keep_box; best = None
    for f, scales in ((4, np.arange(0.70, 1.42, 0.02)), (2, None)):
        if scales is None: scales = np.arange(best[0] - 0.02, best[0] + 0.021, 0.004)
        Wn = g(win, f); mx, my = (x1 - x0) // 6, (y1 - y0) // 6          # template = the middle of the old picture
        T = Wn[(y0 + my) // f:(y1 - my) // f, (x0 + mx) // f:(x1 - mx) // f]
        for sc in scales:
            I = g(out.resize((max(8, round(out.width * sc)), max(8, round(out.height * sc))), Image.BILINEAR), f)
            c = ncc_map(I, T)
            if c is None: continue
            yy, xx = np.unravel_index(c.argmax(), c.shape)
            dx, dy = (x0 + mx) - xx * f, (y0 + my) - yy * f
            if best is None or c[yy, xx] > best[3] or f == 2 and best[4] == 4: best = (float(sc), dx, dy, float(c[yy, xx]), f)
    return best[:4]


def png(im):
    b = io.BytesIO(); im.save(b, 'PNG'); return b.getvalue()


def place_answer(out):
    """map the API answer onto the padded picture (it is usually zoomed / shifted a little), fill what it does not cover with the bg."""
    kx0, kx1 = (max(0, round((L - wx) * k)) + EDGE if L else 0), (round((L + W - wx) * k) - EDGE if R else TW)
    ky1 = round((H - wy) * k) - EDGE if B else TH
    sc, dx, dy, score = register(out, win, (kx0, 0, kx1, ky1))
    print(f'  answer → sent: scale {sc:.3f}, offset ({dx}, {dy}) canvas px, match {score:.2f}' + ('' if score > .6 else '  WARNING: poor match, check the result'))
    f = sc / k                                              # answer px → padded px
    ox_, oy_ = wx + dx / k, wy + dy / k
    canvas_ = Image.new('RGB', (NW, NH), bgc)
    warped = out.transform((NW, NH), Image.AFFINE, (1 / f, 0, -ox_ / f, 0, 1 / f, -oy_ / f), Image.BICUBIC, fillcolor=bgc)
    cover = Image.new('L', out.size, 255).transform((NW, NH), Image.AFFINE, (1 / f, 0, -ox_ / f, 0, 1 / f, -oy_ / f), Image.NEAREST, fillcolor=0)
    canvas_.paste(warped, (0, 0), cover)
    global COVER; COVER = cover
    return canvas_


COVER = None
extp = os.path.join(ART, P['src'] + '_ext.png')
if a.reuse and os.path.exists(extp):
    ext = Image.open(extp).convert('RGB'); r = {}; t0 = time.time(); print('reusing', os.path.basename(extp))
    assert ext.size == (NW, NH), f'{ext.size} != {(NW, NH)}: padding differs from the first run'
elif a.reraw:
    out = Image.open(os.path.join(ART, P['src'] + '_ext_raw.png')).convert('RGB').resize((TW, TH), Image.LANCZOS); r = {}; t0 = time.time()
    ext = place_answer(out)
else:
    fields = {'model': a.model, 'prompt': prompt, 'size': f'{TW}x{TH}', 'quality': a.quality, 'n': '1'}
    bnd = uuid.uuid4().hex; body = b''
    for kk, v in fields.items(): body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"\r\n\r\n{v}\r\n'.encode()
    for kk, fn, data in (('image[]', 'pose.png', png(canvas)), ('mask', 'mask.png', png(mask))):
        body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"; filename="{fn}"\r\nContent-Type: image/png\r\n\r\n'.encode() + data + b'\r\n'
    body += f'--{bnd}--\r\n'.encode()
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST',
                                 headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={bnd}'})
    t0 = time.time(); print(f'[{a.pose}] outpaint {NW}x{NH}: window {ww}x{wh} at ({wx},{wy}) via {TW}x{TH} …', flush=True)
    for i in range(4):
        try: r = json.load(urllib.request.urlopen(req, timeout=600)); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            if e.code in (429, 500, 502, 503) and i < 3: print(' retry', e.code, msg[:100]); time.sleep(20 * (i + 1)); continue
            sys.exit(f'HTTP {e.code}: {msg}')
    out = Image.open(io.BytesIO(base64.b64decode(r['data'][0]['b64_json']))).convert('RGB').resize((TW, TH), Image.LANCZOS)
    out.save(os.path.join(ART, P['src'] + '_ext_raw.png'))   # the untouched API answer (--reraw re-places it without a new call)
    ext = place_answer(out)
# the old picture stays pixel-identical except near the old cut edge: there the switch to the API's drawing follows a
# minimum-difference seam (image quilting) inside a band, so no ghost / doubled outline shows (a plain feather left a smeared
# second shoulder line on Demo24 "left", where the old picture's cut shoulder and the redrawn one disagree)
def seam_keep(model, orig, cover):
    """1 = keep the original. Band = the last ≤ 20 % (max 420 px) of the old picture on each padded side."""
    keep = np.ones((H, W), np.float32)
    d_all = np.abs(model - orig).mean(2) + (1 - cover) * 1e4         # never switch to where the answer does not reach
    for side, on in (('L', L), ('R', R), ('B', B)):
        if not on: continue
        d = {'R': d_all, 'L': d_all[:, ::-1], 'B': d_all.T}[side]        # band always at the END of axis 1
        n = min(420, d.shape[1] // 5); D = d[:, -n:].copy()
        D[:, 0] += 1e5                                                  # the band's first column stays original
        M = D.copy(); back = np.zeros(D.shape, np.int8)
        for y in range(1, D.shape[0]):
            prev = np.stack([np.r_[np.inf, M[y - 1, :-1]], M[y - 1], np.r_[M[y - 1, 1:], np.inf]])
            j = prev.argmin(0); back[y] = j - 1; M[y] += prev[j, np.arange(n)]
        x = int(M[-1].argmin()); kk = np.ones(d.shape, np.float32)
        for y in range(D.shape[0] - 1, -1, -1):
            kk[y, d.shape[1] - n + x:] = 0; x = int(np.clip(x + int(back[y, x]), 0, n - 1))
        kk = {'R': kk, 'L': kk[:, ::-1], 'B': kk.T}[side]; keep = np.minimum(keep, kk)
    from PIL import ImageFilter
    return np.asarray(Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3)), np.float32) / 255


cov = np.asarray(COVER.crop((L, 0, L + W, H)), np.float32) / 255 if COVER is not None else np.ones((H, W), np.float32)
al = seam_keep(np.asarray(ext.crop((L, 0, L + W, H)), np.float32), np.asarray(base, np.float32), cov)
FEATHER = Image.fromarray((al * 255).astype(np.uint8))
print(f'  original kept: {al.mean():.1%} of the old picture (the rest of the band = the redrawn body)')
ext.paste(base, (L, 0), FEATHER)


def save(name, inner):
    im = ext.copy(); im.paste(inner, (L, 0), FEATHER); im.save(os.path.join(ART, name + '.png')); return name


P['src'] = save(P['src'] + '_ext', base)
for kind in ('talk', 'blink'):
    # named after the pose's own _ext source: a variant shared by several poses (gaku_ref_talk) must not get one pose's margin for all
    if P.get(kind): P[kind] = save(f"{P['src']}_{kind}", Image.open(src(P[kind])).convert('RGB').resize((W, H)))
for kk in [k for k in P if k.startswith(('near_', 'centre_'))]: P[kk] = [P[kk][0] + L, P[kk][1]]
for kk in ('keep', 'erase'):
    if P.get(kk): P[kk] = [[b[0] + L, b[1], b[2] + L, b[3]] for b in P[kk]]
# views: remember the old placement; after build_stage, `--place` puts the old part of the figure back where it was
lv0 = layer_box()
for name, v in views.items():
    c = next((x['char'] for x in lv0.values() if x.get('view') == name), None)
    if c and 'height' in v: v['_pre_extend'] = {'w': c['w'], 'h': c['h'], 'box': c.get('box'), 'x': v['x'], 'y': v['y'], 'height': v['height'], 'pad': pad}
    elif 'height' not in v: print(f'  view {name}: no explicit placement (auto from the figure) — check it after build_stage')
json.dump(cfg, open(SJ, 'w'), indent=1, ensure_ascii=False)
log = os.path.join(D, 'project', 'openai_log.json'); lg = json.load(open(log)) if os.path.exists(log) else {}
key = P['src'] + ':extend'; prev = lg.get(key) or {}   # own key (not the base image's job) + earlier spend kept (balances.py budget)
lg[key] = {'model': a.model, 'size': f'{TW}x{TH}', 'seconds': round(time.time() - t0), 'usage': r.get('usage'), 'pad': pad,
           **({'prior_usage': (prev.get('prior_usage') or []) + [prev.get('usage')]} if prev else {})}
json.dump(lg, open(log + '.tmp', 'w'), indent=1); os.replace(log + '.tmp', log)
print(f'  saved {P["src"]}.png {NW}x{NH} in {time.time() - t0:.0f}s; stage.json updated → run build_stage.py + check_cut_body.py')
