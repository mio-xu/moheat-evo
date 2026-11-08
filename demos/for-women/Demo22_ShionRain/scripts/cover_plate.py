#!/usr/bin/env python3
"""Cover plate for Demo22 (§7.3 2b): the full window painting (media/art/shion_window.jpg — no cut-out, so no cut edge can show)
scaled so his face is the standard size and the eyes sit on the standard spot, the gaps around it (top, left, bottom) painted by
gpt-image-2 (masked edit; the result is used as it is — see --paste). Writes media/art/cover_plate.jpg (1920×1080). ~$0.3 (one high 2560×1440 edit, logged).
  python3 scripts/cover_plate.py [--reuse]      # --reuse: only re-composite from assets/art/cover_plate_raw.png (no API call)
"""
import base64, io, json, os, sys, time, uuid, urllib.request
from PIL import Image, ImageFilter
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); W, H = 2560, 1440
SRC = os.path.join(D, 'media', 'art', 'shion_window.jpg'); RAW = os.path.join(D, 'assets', 'art', 'cover_plate_raw.png'); OUT = os.path.join(D, 'media', 'art', 'cover_plate.jpg')
FACE, EYE = .383, (.576, .226)            # SCRFD on shion_window.jpg: face box height, eye-line centre (fractions of the picture)
T_FACE, T_EYE = .285, (.72, .31)          # cover standard (shared/cover.js STD.solo, check_cover.py tolerances)
k = T_FACE / FACE; pw, ph = round(W * k), round(H * k); px, py = round(T_EYE[0] * W - EYE[0] * pw), round(T_EYE[1] * H - EYE[1] * ph)
src = Image.open(SRC).convert('RGB').resize((pw, ph), Image.LANCZOS)
base = Image.new('RGB', (W, H), (16, 12, 24)); base.paste(src, (px, py))
keep = Image.new('L', (W, H), 0); keep.paste(255, (px + 6, py + 6, px + pw - 6, py + ph - 6))   # the painting's own area (6 px in)
if '--reuse' not in sys.argv:
    KEY = os.environ.get('OPENAI_API_KEY') or open(os.path.expanduser('~/.openai_key')).read().strip()
    mask = Image.new('RGBA', (W, H), (0, 0, 0, 0)); mask.paste((0, 0, 0, 255), (px + 40, py + 40, px + pw - 40, py + ph - 40))   # transparent = may change
    prompt = ('Extend this anime illustration outward so it fills the whole 16:9 frame: the same dim night living room of a high-rise flat — '
              'the dark ceiling and the top of the tall rain-streaked window with purple city lights above, more of the dark sofa and the floor on the left and '
              'at the bottom, the warm floor lamp glow on the right. The man stays exactly as he is: do not redraw him, add no person, no hands, no text. '
              'Same painting style, colours and soft light; the new areas are quiet and darker toward the left edge.')
    bnd = uuid.uuid4().hex; body = b''
    for kk, v in {'model': 'gpt-image-2', 'prompt': prompt, 'size': f'{W}x{H}', 'quality': 'high', 'n': '1'}.items(): body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"\r\n\r\n{v}\r\n'.encode()
    for kk, im in (('image[]', base), ('mask', mask)):
        b = io.BytesIO(); im.save(b, 'PNG'); body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"; filename="{kk[:5]}.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + b.getvalue() + b'\r\n'
    body += f'--{bnd}--\r\n'.encode(); t0 = time.time()
    req = urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST', headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={bnd}'})
    r = json.load(urllib.request.urlopen(req, timeout=900))
    os.makedirs(os.path.dirname(RAW), exist_ok=True); Image.open(io.BytesIO(base64.b64decode(r['data'][0]['b64_json']))).convert('RGB').save(RAW)
    LOG = os.path.join(D, 'project', 'openai_log.json'); log = json.load(open(LOG)) if os.path.exists(LOG) else {}
    prev = log.get('cover_plate') or {}
    log['cover_plate'] = {'model': 'gpt-image-2', 'size': f'{W}x{H}', 'quality': 'high', 'seconds': round(time.time() - t0), 'usage': r.get('usage'), 'out': [W, H],
                          **({'prior_usage': (prev.get('prior_usage') or []) + [prev.get('usage')]} if prev else {})}
    json.dump(log, open(LOG + '.tmp', 'w'), indent=1); os.replace(LOG + '.tmp', LOG); print('usage', r.get('usage'))
raw = Image.open(RAW).convert('RGB').resize((W, H), Image.LANCZOS)
# the model relights the whole frame a little, so pasting the original back shows a rectangle (tried: visible seams) — the edit is
# used as it is (he is redrawn faithfully at the same spot); --paste brings the original pixels back with a soft seam
if '--paste' in sys.argv:
    seam = keep.filter(ImageFilter.GaussianBlur(14)); seam.paste(255, (px + 40, py + 40, px + pw - 40, py + ph - 40)); raw = Image.composite(base, raw, seam)
raw.resize((1920, 1080), Image.LANCZOS).save(OUT, quality=92)
print('wrote', OUT, 'painting at', (px / W, py / H, pw / W, ph / H))
