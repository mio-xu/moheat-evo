#!/usr/bin/env python3
"""Cover plate from a WHOLE painting (DEMO_DESIGN_GUIDE §7.3 2b; Demo22 2026-11-08): when no pose cut-out can meet the cover numbers
with all its cut edges outside the frame, take a full painting of the demo, shrink it so the face is the standard size with the eyes
on the standard spot, and let gpt-image-2 paint the gaps (one masked edit, high 2560×1440, ≈ $0.3, logged in project/openai_log.json).
The edit is used as it is (the model relights the whole frame; pasting the original back shows seams — --paste does it anyway).
Then the face is measured again on the plate (SCRFD) and printed as the MoHeatCover.fit() numbers to use.

  ~/ml/layers/bin/python tools/art/cover_plate.py <demo folder> <painting> [--face .285] [--eye .72,.31] [--hint "what is around"] [--reuse]
  [--shrink .85 (a group: anchored bottom-right, every face clear of the copy column)] [--who "The three people stay exactly as they are…"]
  → <demo>/media/art/cover_plate.jpg (1920×1080) + raw <demo>/assets/art/cover_plate_raw.png
In the demo: C.fit(ctx, { eye, face } (printed), () => ctx.drawImage(plate, 0, 0, W, H), { at: { y, face }, tone }) — see Demo22 main.js.
"""
import base64, io, json, os, sys, time, uuid, urllib.request
from PIL import Image, ImageFilter
a = sys.argv[1:]; opt = lambda f, d: a[a.index(f) + 1] if f in a else d
D, SRC = os.path.abspath(a[0]), os.path.abspath(a[1]); W, H = 2560, 1440
RAW = os.path.join(D, 'assets', 'art', 'cover_plate_raw.png'); OUT = os.path.join(D, 'media', 'art', 'cover_plate.jpg')


def face(path):
    import cv2
    sys.path.insert(0, os.path.expanduser('~/ml/LivePortrait/src/utils/dependencies/insightface/model_zoo')); sys.modules.setdefault('onnx', type(sys)('onnx'))
    from scrfd import SCRFD
    d = SCRFD(os.path.expanduser('~/ml/LivePortrait/pretrained_weights/insightface/models/buffalo_l/det_10g.onnx')); d.prepare(-1, input_size=(640, 640)); d.det_thresh = .35
    im = cv2.imread(path); h, w = im.shape[:2]; f, k = d.detect(im, input_size=(640, 640))
    i = max(range(len(f)), key=lambda j: f[j][3] - f[j][1])
    return (f[i][3] - f[i][1]) / h, ((k[i][0][0] + k[i][1][0]) / 2 / w, (k[i][0][1] + k[i][1][1]) / 2 / h)


tmp = os.path.join(D, 'assets', 'art', '_cover_src.png'); os.makedirs(os.path.dirname(tmp), exist_ok=True); Image.open(SRC).convert('RGB').save(tmp)
FACE, EYE = face(tmp); T_FACE = float(opt('--face', .285)); T_EYE = [float(v) for v in opt('--eye', '.72,.31').split(',')]
k = T_FACE / FACE; pw, ph = round(W * k), round(H * k); px, py = round(T_EYE[0] * W - EYE[0] * pw), round(T_EYE[1] * H - EYE[1] * ph)
if '--shrink' in a:   # a whole group (several faces): keep every face clear of the copy column — shrink the painting by this factor, anchored bottom-right
    k = float(opt('--shrink', '.85')); pw, ph = round(W * k), round(H * k); px, py = W - pw, H - ph
base = Image.new('RGB', (W, H), (16, 12, 24)); base.paste(Image.open(tmp).resize((pw, ph), Image.LANCZOS), (px, py))
print(f'painting: face {FACE:.3f} eye {EYE[0]:.3f},{EYE[1]:.3f} → placed at {px / W:.2f},{py / H:.2f} size {k:.2f}')
if '--reuse' not in a:
    KEY = os.environ.get('OPENAI_API_KEY') or open(os.path.expanduser('~/.openai_key')).read().strip()
    mask = Image.new('RGBA', (W, H), (0, 0, 0, 0)); mask.paste((0, 0, 0, 255), (px + 40, py + 40, px + pw - 40, py + ph - 40))
    prompt = ('Extend this anime illustration outward so it fills the whole 16:9 frame: continue the same place naturally on every side ('
              + opt('--hint', 'the room, its walls, ceiling and floor') + '). ' + opt('--who', 'The person stays exactly as he is: do not redraw or move him, add no other person') + ', no hands, no text. Same painting style, colours and light; the new areas quiet, a little darker toward the left edge.')
    bnd = uuid.uuid4().hex; body = b''
    for kk, v in {'model': 'gpt-image-2', 'prompt': prompt, 'size': f'{W}x{H}', 'quality': 'high', 'n': '1'}.items(): body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"\r\n\r\n{v}\r\n'.encode()
    for kk, im in (('image[]', base), ('mask', mask)):
        b = io.BytesIO(); im.save(b, 'PNG'); body += f'--{bnd}\r\nContent-Disposition: form-data; name="{kk}"; filename="{kk[:5]}.png"\r\nContent-Type: image/png\r\n\r\n'.encode() + b.getvalue() + b'\r\n'
    body += f'--{bnd}--\r\n'.encode(); t0 = time.time()
    r = json.load(urllib.request.urlopen(urllib.request.Request('https://api.openai.com/v1/images/edits', data=body, method='POST',
        headers={'Authorization': 'Bearer ' + KEY, 'Content-Type': f'multipart/form-data; boundary={bnd}'}), timeout=900))
    Image.open(io.BytesIO(base64.b64decode(r['data'][0]['b64_json']))).convert('RGB').save(RAW)
    LOG = os.path.join(D, 'project', 'openai_log.json'); log = json.load(open(LOG)) if os.path.exists(LOG) else {}; prev = log.get('cover_plate') or {}
    log['cover_plate'] = {'model': 'gpt-image-2', 'size': f'{W}x{H}', 'quality': 'high', 'seconds': round(time.time() - t0), 'usage': r.get('usage'), 'out': [W, H],
                          **({'prior_usage': (prev.get('prior_usage') or []) + [prev.get('usage')]} if prev else {})}
    os.makedirs(os.path.dirname(LOG), exist_ok=True); json.dump(log, open(LOG + '.tmp', 'w'), indent=1); os.replace(LOG + '.tmp', LOG); print('usage', r.get('usage'))
raw = Image.open(RAW).convert('RGB').resize((W, H), Image.LANCZOS)
if '--paste' in a:
    keep = Image.new('L', (W, H), 0); keep.paste(255, (px + 40, py + 40, px + pw - 40, py + ph - 40)); raw = Image.composite(base, raw, keep.filter(ImageFilter.GaussianBlur(14)))
raw.resize((1920, 1080), Image.LANCZOS).save(OUT, quality=92); os.remove(tmp)
f2, e2 = face(OUT); print(f'plate: {OUT}\nfit numbers: from = {{ eye: [{e2[0]:.3f}, {e2[1]:.3f}], face: {f2:.3f} }}')
