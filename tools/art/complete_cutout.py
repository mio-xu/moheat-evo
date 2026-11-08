#!/usr/bin/env python3
"""Complete a cut-out sprite set (RGBA, transparent background) whose body ends in a hard straight cut
(user 2026-11-08, Nobunaga series: "I_bust / I_ear 需要补全，否则画面会有瑕疵").

For sprites that are already cut out (no stage.json / plain-background pose: the Nobunaga _kit/art busts and ear close-ups),
tools/art/extend_pose.py does not apply. This one:
  1. pads the canvas (optional, --pad L,T,R,B) and marks what may change: inside the --zone rects, every transparent pixel
     (and the padding) plus the --redo rects (opaque pixels at the cut itself, so the straight cut line can be redrawn);
  2. sends the base on a flat magenta matte with those pixels transparent + the same mask to the OpenAI image API
     (gpt-image-2 masked edit), registers the answer back onto the canvas (the model may shift / zoom slightly),
     keys the matte out and pastes ONLY the editable pixels; every other pixel (face, hands …) stays bit-identical;
  3. gives every variant (--variants: blink / mouth / expressions) exactly the same new pixels, so they stay aligned.
Writes the files in place (originals backed up outside the repo), a before | after sheet and the raw answer in --work.
If the canvas grew on the left / top, shift every pixel coordinate that refers to these images (faces.json, data.js artFaces).

  python3 tools/art/complete_cutout.py <base.webp> --variants <v.webp> … --pad 256,0,256,0 \
      --zone 1150,600,1280,1536 --zone 0,1370,1024,1536 --redo 980,700,1024,1536 --hint "his far shoulder …" --work <dir>
  --reraw   re-place the saved raw answer (no new call)   --dry   only write the request picture + mask to --work
Cost ≈ one OpenAI edit (~$0.2–0.4) per set. Key: ~/.openai_key.
"""
import argparse, base64, io, json, os, shutil, sys, time, urllib.request, urllib.error, uuid
from PIL import Image, ImageFilter
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('base'); ap.add_argument('--variants', nargs='*', default=[])
ap.add_argument('--pad', default='0,0,0,0'); ap.add_argument('--zone', action='append', default=[]); ap.add_argument('--redo', action='append', default=[])
ap.add_argument('--trim', default='0,0,0,0', help='L,T,R,B px cut off the finished canvas (padding given only so the model has room, e.g. --pad 0,0,0,400 --trim 0,0,0,400)')
ap.add_argument('--hint', default=''); ap.add_argument('--matte', default='255,0,255'); ap.add_argument('--scale', type=float, default=1.333)
ap.add_argument('--window', default='', help='x0,y0,x1,y1 (original px): send only this part (a thin band at the bottom of a full figure makes the model redraw the whole figure smaller)')
ap.add_argument('--max-err', type=float, default=10.0, help='refuse to write when the registered answer differs this much from the kept pixels (model re-composed the picture)')
ap.add_argument('--model', default='gpt-image-2'); ap.add_argument('--quality', default='high')
ap.add_argument('--work', required=True); ap.add_argument('--reraw', action='store_true'); ap.add_argument('--dry', action='store_true')
ap.add_argument('--backup', default=os.path.expanduser('~/Desktop/MoHeat Evo 备份/complete_cutout'))
a = ap.parse_args()
os.makedirs(a.work, exist_ok=True)
name = os.path.splitext(os.path.basename(a.base))[0]
L, T, R, B = [int(v) for v in a.pad.split(',')]
MATTE = np.array([int(v) for v in a.matte.split(',')], np.float32)

base = np.asarray(Image.open(a.base).convert('RGBA')).astype(np.float32)
H, W = base.shape[:2]; NW, NH = W + L + R, H + T + B


def pad(img):
    out = np.zeros((NH, NW, 4), np.float32); out[T:T + H, L:L + W] = img; return out


def rects(lst):
    m = np.zeros((NH, NW), bool)
    for r in lst:
        x0, y0, x1, y1 = [int(v) for v in r.split(',')]
        m[max(0, y0 + T):max(0, y1 + T), max(0, x0 + L):max(0, x1 + L)] = True
    return m


P = pad(base); A = P[..., 3]
E = rects(a.zone) & ((A < 250) | rects(a.redo))      # editable pixels
print(f'{name}: {W}x{H} → {NW}x{NH}, editable {E.mean() * 100:.1f} % of the canvas')

# request picture: figure on the matte, editable pixels transparent (an opaque margin is just kept by the model)
rgb = P[..., :3] * (A[..., None] / 255) + MATTE * (1 - A[..., None] / 255)
req = np.dstack([rgb, np.where(E, 0, 255)]).clip(0, 255).astype(np.uint8)
wx0, wy0, wx1, wy1 = ([int(v) for v in a.window.split(',')] if a.window else [-L, -T, W + R, H + B])
wx0, wy0, wx1, wy1 = wx0 + L, wy0 + T, wx1 + L, wy1 + T          # padded px
WW, WH = wx1 - wx0, wy1 - wy0
TW, TH = int(round(WW * a.scale / 16) * 16), int(round(WH * a.scale / 16) * 16)
req_im = Image.fromarray(req[wy0:wy1, wx0:wx1]).resize((TW, TH), Image.LANCZOS)
Ed = np.asarray(Image.fromarray((E * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0   # a few px overlap so strokes join
assert not (Ed & ~np.pad(np.ones((WH, WW), bool), ((wy0, NH - wy1), (wx0, NW - wx1)))).any(), 'editable pixels outside --window'
mask_im = Image.fromarray(np.dstack([np.zeros((WH, WW, 3), np.uint8), np.where(Ed[wy0:wy1, wx0:wx1], 0, 255).astype(np.uint8)])).resize((TW, TH), Image.NEAREST)
req_im.save(os.path.join(a.work, name + '_request.png')); mask_im.save(os.path.join(a.work, name + '_mask.png'))
if a.dry: sys.exit(0)

prompt = ("Masked edit (outpaint) of a Japanese ukiyo-e / woodblock style character illustration on a flat magenta (#FF00FF) background. "
          "Only the transparent area may be painted. The figure is cut off by a hard straight line there: continue and complete it. "
          + (a.hint + ' ' if a.hint else '') +
          "Continue the existing clothing exactly: the same fabric, the same gold flower pattern and crests, the same colours, the same black "
          "ink outlines and paper grain, joining the existing strokes seamlessly at the seam. Where the figure ends, close its silhouette with a "
          "natural black ink outline. Everything outside the figure stays flat pure magenta #FF00FF. Do not change anything outside the "
          "transparent area, do not move or re-scale the picture, no new objects, no text, no background scenery.")
raw = os.path.join(a.work, name + '_raw.png')
cost = None
if not a.reraw:
    KEY = open(os.path.expanduser('~/.openai_key')).read().strip()
    png = lambda im: (lambda b: (im.save(b, 'PNG'), b.getvalue())[1])(io.BytesIO())
    fields = {'model': a.model, 'prompt': prompt, 'size': f'{TW}x{TH}', 'quality': a.quality, 'n': '1'}
    bnd = uuid.uuid4().hex; body = b''
    for k, v in fields.items(): body += f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode()
    for k, fn, data in (('image[]', 'sprite.png', png(req_im)), ('mask', 'mask.png', png(mask_im))):
        body += f'--{bnd}\r\nContent-Disposition: form-data; name="{k}"; filename="{fn}"\r\nContent-Type: image/png\r\n\r\n'.encode() + data + b'\r\n'
    body += f'--{bnd}--\r\n'.encode()
    t0 = time.time(); print(f'calling {a.model} {TW}x{TH} {a.quality} …', flush=True)
    for i in range(4):
        rq = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST',
                                    headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={bnd}'})
        try: r = json.load(urllib.request.urlopen(rq, timeout=900)); break
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:400]
            if e.code in (429, 500, 502, 503) and i < 3: print(f'  {e.code}, retry: {msg[:120]}', flush=True); time.sleep(20 * (i + 1)); continue
            sys.exit(f'HTTP {e.code}: {msg}')
    Image.open(io.BytesIO(base64.b64decode(r['data'][0]['b64_json']))).convert('RGB').save(raw)
    cost = r.get('usage'); print(f'  answer in {time.time() - t0:.0f}s usage {cost}', flush=True)
    json.dump({'usage': cost, 'size': [TW, TH], 'prompt': prompt}, open(os.path.join(a.work, name + '_usage.json'), 'w'), indent=1)

ans_w = Image.open(raw).convert('RGB').resize((WW, WH), Image.LANCZOS)
ref_w = Image.fromarray(rgb.clip(0, 255).astype(np.uint8)[wy0:wy1, wx0:wx1])

# register (window px): the model may zoom / shift a little. Scale about the window centre + offset, fitted on the opaque kept
# pixels: coarse (¼ res, 2 px steps, ±24 px) then fine (½ res, 1 px, 0.25 %). Margins the shift uncovers get the matte, not black.
keep = ((A > 250) & ~Ed)[wy0:wy1, wx0:wx1]
FILL = tuple(int(v) for v in MATTE)
def aff(sc, dx, dy, w, h):        # output px → input px: x_in = cx + (x - cx - dx) / sc
    cx, cy = w / 2, h / 2
    return (1 / sc, 0, cx - (cx + dx) / sc, 0, 1 / sc, cy - (cy + dy) / sc)
def fit(q, scs, dxs, dys):
    sz = (WW // q, WH // q); R = np.asarray(ref_w.convert('L').resize(sz, Image.BILINEAR), np.float32)
    K = np.asarray(Image.fromarray(keep.astype(np.uint8) * 255).resize(sz)) > 200; Q = ans_w.convert('L').resize(sz, Image.BILINEAR)
    best = (1e9, 1.0, 0, 0)
    for sc in scs:
        for dx in dxs:
            for dy in dys:
                w = Q.transform(sz, Image.AFFINE, aff(sc, dx / q, dy / q, *sz), Image.BILINEAR)
                e = np.abs(np.asarray(w, np.float32) - R)[K].mean()
                if e < best[0]: best = (e, sc, dx, dy)
    return best
err0 = fit(2, [1.0], [0], [0])[0]
b = fit(4, np.arange(0.97, 1.0301, 0.005), range(-24, 25, 2), range(-24, 25, 2))
b = fit(2, np.arange(b[1] - 0.005, b[1] + 0.0051, 0.0025), range(b[2] - 2, b[2] + 3), range(b[3] - 2, b[3] + 3))
print(f'  registration: identity err {err0:.1f} → scale {b[1]:.4f} dx {b[2]} dy {b[3]} err {b[0]:.1f}')
if min(b[0], err0) > a.max_err: sys.exit(f'answer does not match the kept pixels (err {min(b[0], err0):.1f} > {a.max_err}): the model re-composed the picture. Try --window / a smaller canvas; nothing written.')
if b[0] < err0 - 0.3:
    ans_w = ans_w.transform((WW, WH), Image.AFFINE, aff(b[1], b[2], b[3], WW, WH), Image.BICUBIC, fillcolor=FILL)
ans = Image.fromarray(rgb.clip(0, 255).astype(np.uint8)); ans.paste(ans_w, (wx0, wy0))   # outside the window: the original
N = np.asarray(ans).astype(np.float32)

# key the matte out of the new pixels: alpha from the distance to magenta, colour un-mixed (no pink fringe)
d = np.sqrt(((N - MATTE) ** 2).sum(2))
na = np.clip((d - 60) / (150 - 60), 0, 1)
# magenta-ish pixels (r and b high, g low) are matte even when a little off
pinkish = (N[..., 0] - N[..., 1] > 90) & (N[..., 2] - N[..., 1] > 90)
na[pinkish] = np.minimum(na[pinkish], 0.0)
col = np.where(na[..., None] > 0.02, (N - MATTE * (1 - na[..., None])) / np.maximum(na[..., None], 0.02), N).clip(0, 255)
# drop small floating specks of the new layer
from scipy import ndimage   # noqa: E402
lab, n = ndimage.label((na > 0.5) & E)
if n:
    sizes = ndimage.sum(np.ones_like(na), lab, range(1, n + 1))
    for i, s in enumerate(sizes, 1):
        if s < 300: na[lab == i] = 0
newA = na * 255

# blend in: outside E the original stays exact; inside E the new layer, feathered over 4 px where the original is opaque
dist = ndimage.distance_transform_edt(E)
w = np.clip(dist / 4.0, 0, 1)
def merge(orig):
    o = orig.copy()
    oa = orig[..., 3:4] / 255; nw = w[..., None]
    mix_a = oa * (1 - nw) + (newA[..., None] / 255) * nw
    mix_c = (orig[..., :3] * oa * (1 - nw) + col * (newA[..., None] / 255) * nw) / np.maximum(mix_a, 1e-3)
    o[..., :3] = np.where(E[..., None], mix_c, orig[..., :3]); o[..., 3] = np.where(E, mix_a[..., 0] * 255, orig[..., 3])
    return o.clip(0, 255).astype(np.uint8)

outB = merge(P)
stamp = time.strftime('%Y%m%d_%H%M%S'); bdir = os.path.join(a.backup, stamp); os.makedirs(bdir, exist_ok=True)
sheet = []
for path in [a.base] + a.variants:
    shutil.copy2(path, bdir)
    if path == a.base: out = outB
    else:
        V = pad(np.asarray(Image.open(path).convert('RGBA')).astype(np.float32)).astype(np.uint8)
        out = V.copy(); out[E] = outB[E]          # the very same new pixels for every variant
    tl, tt, tr, tb = [int(v) for v in a.trim.split(',')]
    out = out[tt:NH - tb, tl:NW - tr]
    im = Image.fromarray(out); im.save(path, 'WEBP', quality=92, method=6)
    sheet.append((path, im))
    print('  wrote', os.path.basename(path), im.size)
# before | after on a dark and a light ground
before = Image.open(os.path.join(bdir, os.path.basename(a.base))).convert('RGBA')
NW, NH = sheet[0][1].size; L -= int(a.trim.split(',')[0]); T -= int(a.trim.split(',')[1])
bp = Image.new('RGBA', (NW, NH), (0, 0, 0, 0)); bp.paste(before, (L, T))
rows = []
for bgc in ((40, 30, 20, 255), (230, 220, 200, 255)):
    row = Image.new('RGBA', (NW * 2 + 20, NH), bgc)
    for i, im in enumerate((bp, sheet[0][1])):
        t = Image.new('RGBA', (NW, NH), bgc); t.alpha_composite(im); row.paste(t, (i * (NW + 20), 0))
    rows.append(row)
S = Image.new('RGB', (rows[0].width, NH * 2 + 20), (0, 0, 0))
for i, rw in enumerate(rows): S.paste(rw.convert('RGB'), (0, i * (NH + 20)))
S.thumbnail((2400, 2400)); S.save(os.path.join(a.work, name + '_before_after.jpg'), quality=88)
print(f'backup: {bdir}\nsheet: {os.path.join(a.work, name + "_before_after.jpg")}\npad L={L} T={T}: shift coordinates by (+{L}, +{T})')
