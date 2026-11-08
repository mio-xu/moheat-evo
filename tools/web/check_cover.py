#!/usr/bin/env python3
"""Cover composition check (DEMO_DESIGN_GUIDE §7.3 "封面构图标准", user 2026-11-08: "the cover style — e.g. how much of the frame
the character takes up — must also be consistent").

  python3 tools/web/check_cover.py demos/for-women/Demo24_GakuCamp [more demo folders…]   # shots + measure + PASS / WARN / FAIL table
  python3 tools/web/check_cover.py --all                                                  # every demo in nav.js DEMOS
  python3 tools/web/check_cover.py --all --sheet ~/Desktop/covers.jpg                     # + a contact sheet (export | phone per demo)
  python3 tools/web/check_cover.py … --shots DIR      # keep the screenshots (default: a temp folder)   --json   one JSON object instead

How: tools/web/cover_shots.js (own http.server + own headless Chrome) shoots ?cover=1&sub=en at 1920×1080 (with and without the copy),
the page at 1440×900 and at 390×844 (touch, no Web Serial) and measures the DOM. This script then finds the character in the art-only
frame (rembg isnet-anime matte + SCRFD face / eye detection from ~/ml, the same models build_stage.py / LivePortrait use) and compares
everything with STANDARD below. check_demo.py runs it as the G7 `cover` row. Exit code 1 when any demo has a FAIL.
The numbers are in % of the stage (16:9 frame): x from the left, y from the top."""
import json, os, re, subprocess, sys, tempfile

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ML_PY = os.path.expanduser('~/ml/layers/bin/python')
SCRFD = os.path.expanduser('~/ml/LivePortrait/pretrained_weights/insightface/models/buffalo_l/det_10g.onnx')

# ---------------------------------------------------------------- the standard (keep in sync with DEMO_DESIGN_GUIDE §7.3 and shared/cover.js)
STANDARD = {   # all numbers in % of the 16:9 stage; targets = shared/cover.js STD
    # one lead character: eye-line centre at (72, 30), face (hairline → chin, ≈ the SCRFD face box) 27 % of the height
    'solo': {'eye_x': (64, 80), 'eye_y': (25, 35), 'face_h': (22, 32)},
    # two people: the middle between their eyes at (72, 30), each face 21 %, both on the right half
    'duo':  {'eye_x': (62, 82), 'eye_y': (25, 36), 'face_h': (16, 26), 'each_x_min': 50},
    'copy': {'cx': (28, 40), 'cy': (42, 58)},    # the copy block: left column (6–62cqw), vertically centred
    'h1':   {'font': (3.2, 5.6)},                 # 5.6cqw, long titles shrink to fit the column (subs.js) but not below 3.2
    'luma_copy_max': 95,     # mean luma (0–255) of the art under the copy block (export, copy hidden): the dark side really is dark
    'face_clear': 0.5,       # overlap (% of the frame area) allowed between the copy block and a face box
    'phone': {'start_min_px': 44},
}


def fmt(r):
    return f'{r[0]}–{r[1]}'


def analyze(shots):   # runs under ~/ml/layers/bin/python (rembg + onnxruntime + cv2)
    import numpy as np, cv2, glob
    from PIL import Image
    from rembg import remove, new_session
    sys.path.insert(0, os.path.expanduser('~/ml/LivePortrait/src/utils/dependencies/insightface/model_zoo'))
    sys.modules.setdefault('onnx', type(sys)('onnx'))   # scrfd.py imports onnx but never uses it
    from scrfd import SCRFD as Det
    det = Det(SCRFD); det.prepare(-1, input_size=(640, 640)); det.det_thresh = .35
    sess = new_session('isnet-anime'); res = {}
    for f in sorted(glob.glob(os.path.join(shots, '*.art.png'))):
        name = os.path.basename(f)[:-8]; im = Image.open(f).convert('RGB'); W, H = im.size
        m = np.asarray(remove(im, session=sess, only_mask=True).convert('L'), np.float32) / 255
        n, lab, stats, cent = cv2.connectedComponentsWithStats((m > .5).astype(np.uint8), 8)
        big = [i for i in range(1, n) if stats[i, 4] > .012 * W * H]
        a = np.asarray(im)
        faces, kps = det.detect(cv2.cvtColor(a, cv2.COLOR_RGB2BGR), input_size=(640, 640))
        fl = []
        for b, k in zip(faces, kps if kps is not None else [None] * len(faces)):
            x0, y0, x1, y1, s = b[:5]
            if (y1 - y0) < .06 * H: continue   # small faces in the background (crowds, posters)
            fl.append({'x': round(float((x0 + x1) / 2 / W * 100), 1), 'top': round(float(y0 / H * 100), 1), 'w': round(float((x1 - x0) / W * 100), 1), 'h': round(float((y1 - y0) / H * 100), 1),
                       'eye_y': round(float((k[0][1] + k[1][1]) / 2) / H * 100, 1) if k is not None else None, 's': round(float(s), 2),
                       'box': [round(float(v), 1) for v in (x0 / W * 100, y0 / H * 100, x1 / W * 100, y1 / H * 100)]})
        fl.sort(key=lambda d: -d['h'])
        luma = (a[..., 0] * .299 + a[..., 1] * .587 + a[..., 2] * .114)
        r = {'faces': fl[:3], 'luma_cols': [round(float(luma[:, int(W * i / 10):int(W * (i + 1) / 10)].mean())) for i in range(10)]}
        if big:
            ys, xs = np.nonzero(np.isin(lab, big))
            r.update(char_top=round(ys.min() / H * 100, 1), char_bottom=round(ys.max() / H * 100, 1), char_left=round(xs.min() / W * 100, 1),
                     char_right=round(xs.max() / W * 100, 1), char_cx=round(xs.mean() / W * 100, 1), char_area=round(len(xs) / (W * H) * 100, 1),
                     char_h=round((ys.max() - ys.min()) / H * 100, 1))
        # a straight cut in the character matte inside the frame (Demo22 2026-11-08: a foreground hair bundle ended on a vertical line): the longest
        # run of rows whose left / right matte boundary stays within 8 px, away from the frame edges
        best = (0, 0, 0, 0)
        M = m > .5; T = np.zeros((H, W // 4 + 2), bool)   # every matte boundary (both directions), in 4 px columns
        for y in range(H):
            xs = np.flatnonzero(M[y, 1:] != M[y, :-1])
            xs = xs[(xs > W * .02) & (xs < W * .98)]; T[y, xs // 4] = True
        Tw = T | np.roll(T, 1, 1) | np.roll(T, -1, 1)   # ± 4 px
        for c in range(1, T.shape[1] - 1):
            col = Tw[:, c]; run = 0
            for y in range(H):
                run = run + 1 if col[y] else 0
                if run > best[0]: best = (run, c * 4, y - run + 1, y)
        r['straight'] = {'h': round(best[0] / H * 100, 1), 'x': round(float(best[1]) / W * 100, 1), 'y0': round(best[2] / H * 100, 1), 'y1': round(best[3] / H * 100, 1)}
        res[name] = r
        # luma of the art under the copy block (from the DOM of the export view, written next to the shots)
        res[name]['_luma'] = luma
    dom = json.load(open(os.path.join(shots, 'dom.json')))['demos']
    for name, r in res.items():
        luma = r.pop('_luma'); c = (dom.get(name, {}).get('export') or {}).get('copy')
        if c:
            H, W = luma.shape; x0, y0 = int(W * c['x'] / 100), int(H * c['y'] / 100)
            r['luma_copy'] = round(float(luma[y0:y0 + int(H * c['h'] / 100), x0:x0 + int(W * c['w'] / 100)].mean()))
    print(json.dumps(res))


def shoot(demos, shots):
    p = subprocess.run(['node', os.path.join(REPO, 'tools', 'web', 'cover_shots.js'), shots] + demos, capture_output=True, text=True, cwd=REPO)
    try: dom = json.loads(p.stdout.strip().splitlines()[-1])
    except Exception: sys.exit('cover_shots.js failed: ' + p.stderr[-800:])
    json.dump(dom, open(os.path.join(shots, 'dom.json'), 'w'))
    return dom


def judge(name, dom, art):
    """→ list of (status, check, value, expected)"""
    rows, E, D, P = [], dom.get('export') or {}, dom.get('desk') or {}, dom.get('phone') or {}
    if not E or E.get('err'): return [('FAIL', 'load', E.get('err', 'no export view'), 'page renders ?cover=1')]
    add = lambda ok, chk, val, exp, warn=False: rows.append(('PASS' if ok else 'WARN' if warn else 'FAIL', chk, val, exp))
    add(E.get('std'), 'shared cover', 'shared/cover.js' if E.get('std') else 'own layout', 'demos/shared/cover.js (.intro.cv-std)')
    faces = [f for f in (art.get('faces') or []) if f['h'] > 8]
    pl = E.get('placed') or {}
    if pl.get('cut'):   # MoHeatCover.layered(): a cut-out's cut border (opaque pixels on its edge) inside the frame = a hard straight cut
        rows.append(('FAIL', 'cut edge in frame', ', '.join(pl['cut']), "every cut edge of the pose outside the frame (scale / move it, or another pose / a whole painting)"))
    scene = pl.get('scene')
    if scene: rows.append(('PASS', 'character', 'scene cover (no lead)', 'declared {scene: true}'))
    elif pl.get('eye') or faces:
        duo = pl.get('duo') if pl.get('eye') else (len(faces) >= 2 or len(E.get('heroes') or []) >= 2)
        S = STANDARD['duo' if duo else 'solo']
        if pl.get('eye'): ex, ey, fh, src = pl['eye'][0], pl['eye'][1], pl['face'], 'declared'
        else:
            m = faces[:2] if duo else faces[:1]
            ex = sum(f['x'] for f in m) / len(m); ey = sum((f['eye_y'] or f['top'] + f['h'] * .5) for f in m) / len(m); fh = sum(f['h'] for f in m) / len(m); src = 'detected'
        add(S['eye_x'][0] <= ex <= S['eye_x'][1], 'eye x' + (' (duo)' if duo else ''), f'{ex:.0f} % ({src})', fmt(S['eye_x']) + ' %')
        add(S['eye_y'][0] <= ey <= S['eye_y'][1], 'eye line', f'{ey:.0f} %', fmt(S['eye_y']) + ' %')
        add(S['face_h'][0] <= fh <= S['face_h'][1], 'face size', f'{fh:.0f} % of H', fmt(S['face_h']) + ' %')
        if duo and len(faces) >= 2: add(min(f['x'] for f in faces[:2]) >= S['each_x_min'], 'both on the right', f"{min(f['x'] for f in faces[:2]):.0f} %", f"each face x ≥ {S['each_x_min']} %")
        if pl.get('eye') and faces:   # the declared spot must match what the detector sees (wrong config numbers)
            f = min(faces, key=lambda f: abs(f['x'] - ex)); d = abs(f['eye_y'] - ey) if f.get('eye_y') else 0
            add(d <= 6 or duo, 'declared = seen', f'eye line {ey:.0f} vs seen {f["eye_y"]}', '≤ 6 % apart', warn=True)
    else: rows.append(('FAIL', 'character', 'no character / creature face found or declared', 'a story cover with its character (§7.3 2b); a place-only cover needs the user\'s OK + {scene: true}'))
    c = E.get('copy')
    if c:
        for f in faces:
            b = f['box']; ov = max(0, min(c['x'] + c['w'], b[2]) - max(c['x'], b[0])) * max(0, min(c['y'] + c['h'], b[3]) - max(c['y'], b[1])) / 100
            if ov > STANDARD['face_clear']: add(False, 'title clear of face', f'{ov:.1f} % overlap (face at x {f["x"]})', 'copy block never on a face')
        C = STANDARD['copy']; cx, cy = c['x'] + c['w'] / 2, c['y'] + c['h'] / 2
        add(C['cx'][0] <= cx <= C['cx'][1], 'copy column', f'centre x {cx:.0f} %', fmt(C['cx']) + ' % (left)')
        add(C['cy'][0] <= cy <= C['cy'][1], 'copy height', f'centre y {cy:.0f} %', fmt(C['cy']) + ' %', warn=True)
    if E.get('h1Font') is not None:
        F = STANDARD['h1']['font']; add(F[0] <= E['h1Font'] <= F[1] + .05, 'title size', f"{E['h1Font']:.1f} cqw", fmt(F) + ' cqw', warn=True)
    if 'luma_copy' in art: add(art['luma_copy'] <= STANDARD['luma_copy_max'], 'dark under copy', f"luma {art['luma_copy']}", f"≤ {STANDARD['luma_copy_max']}")
    if D: add(bool(D.get('start')) and len(D.get('langs') or []) >= 3 and D.get('scrollY', 1) <= 0, 'desktop UI', f"start {'✓' if D.get('start') else '✗'} · langs {len(D.get('langs') or [])} · scroll {D.get('scrollY')}", 'Start + 3 languages, no scroll')
    if P:
        h1, st, lg = P.get('h1'), P.get('start'), P.get('langs') or []
        inside = lambda r: r and r['x'] >= -.5 and r['y'] >= -.5 and r['x'] + r['w'] <= 100.5 and r['y'] + r['h'] <= 100.5
        add(inside(h1), 'phone title', 'inside the player' if inside(h1) else str(h1), 'title fully inside the player')
        hit = [hd for hd in (P.get('hud') or []) if h1 and min(h1['x'] + h1['w'], hd['x'] + hd['w']) > max(h1['x'], hd['x']) and min(h1['y'] + h1['h'], hd['y'] + hd['h']) > max(h1['y'], hd['y'])]
        add(not hit, 'phone title vs 🌐 ⛶', 'clear' if not hit else 'under the corner buttons', 'title not under the 🌐 ⛶ corner')
        add(bool(st) and st['px'] >= STANDARD['phone']['start_min_px'] and inside(st), 'phone start', f"{st['px']} px" if st else 'missing', '≥ 44 px, inside the player')
        add(len(lg) >= 3 and all(inside(l) for l in lg), 'phone langs', f'{len(lg)} buttons', '3 buttons inside the player')
    return rows


def sheet(shots, out, names):   # contact sheet: the 1920×1080 export | the 390×844 phone player (cropped to the stage), one row per demo
    from PIL import Image, ImageDraw, ImageFont
    dom = json.load(open(os.path.join(shots, 'dom.json')))['demos']
    tw, th, pw = 640, 360, 390; W = tw + pw + 30; rows = []
    try: font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
    except Exception: font = ImageFont.load_default()
    for n in names:
        tile = Image.new('RGB', (W, th + 28), (24, 24, 28)); d = ImageDraw.Draw(tile)
        try: tile.paste(Image.open(os.path.join(shots, f'{n}.export.png')).convert('RGB').resize((tw, th)), (0, 28))
        except Exception: pass
        try:
            st = dom[n]['phone']['stage']; ph = Image.open(os.path.join(shots, f'{n}.phone.png')).convert('RGB').crop((st['x'], st['y'], st['x'] + st['w'], st['y'] + st['h']))
            ph = ph.resize((pw, round(pw * ph.height / ph.width))); tile.paste(ph, (tw + 15, 28 + (th - ph.height) // 2))
        except Exception: pass
        d.text((6, 4), n, fill=(240, 240, 240), font=font); d.text((tw + 15, 4), 'phone 390×844', fill=(160, 160, 170), font=font); rows.append(tile)
    cols = 2; R = (len(rows) + cols - 1) // cols; S = Image.new('RGB', (cols * (W + 12), R * (th + 40)), (10, 10, 12))
    for i, t in enumerate(rows): S.paste(t, ((i % cols) * (W + 12), (i // cols) * (th + 40)))
    S.save(out, quality=82); return out


def v2_prepare(names_only, shots):
    """UI v2 (the demo has cover.json): the picture is media/cover/art.webp, no page to shoot — art-only shots + an empty dom.json"""
    from PIL import Image
    dom = {}
    for n in names_only:
        d = os.path.basename(os.path.normpath(n)); Image.open(os.path.join(n, 'media', 'cover', 'art.webp')).convert('RGB').save(os.path.join(shots, f'{d}.art.png')); dom[d] = {}
    json.dump({'demos': dom}, open(os.path.join(shots, 'dom.json'), 'w'))


def judge_v2(n_path, art):
    """the 2b picture numbers on media/cover/art.webp (the title, controls and shade come from the one template)"""
    rows = []; add = lambda ok, chk, val, exp, warn=False: rows.append(('PASS' if ok else 'WARN' if warn else 'FAIL', chk, val, exp))
    try: cj = json.load(open(os.path.join(n_path, 'cover.json'), encoding='utf-8'))
    except (OSError, ValueError) as e: return [('FAIL', 'cover.json', str(e), 'valid cover.json')]
    if cj.get('scene'): return [('PASS', 'character', 'scene cover (no lead)', 'cover.json "scene": true')]
    st = art.get('straight') or {}
    if st.get('h', 0) >= 22: rows.append(('WARN', 'straight edge', f"{st['h']} % of H at x {st['x']} % (y {st['y0']}–{st['y1']} %)", 'look at it: a straight edge of the figure that is a CUT (hair / body ending on a line) must leave the frame (cover_plate.py, or remove that element); a held pole is fine'))
    faces = [f for f in (art.get('faces') or []) if f['h'] > 8]
    dec = cj.get('faces')   # declared where the detector cannot see the face (chibi / animal / profile)
    if dec and (not faces or (dec.get('duo') and len(faces) < 2)):
        S = STANDARD['duo' if dec.get('duo') else 'solo']; ex, ey, fh = dec['eye'][0], dec['eye'][1], dec['face']
        add(S['eye_x'][0] <= ex <= S['eye_x'][1], 'eye x (declared)', f'{ex:.0f} %', fmt(S['eye_x']) + ' %')
        add(S['eye_y'][0] <= ey <= S['eye_y'][1], 'eye line (declared)', f'{ey:.0f} %', fmt(S['eye_y']) + ' %')
        add(S['face_h'][0] <= fh <= S['face_h'][1], 'face size (declared)', f'{fh:.0f} % of H', fmt(S['face_h']) + ' %')
        return rows
    if not faces: return rows + [('FAIL', 'character', 'no character / creature face found', 'a story cover with its character (§7.3 2b); a place-only cover needs the user\'s OK + cover.json "scene": true')]
    duo = len(faces) >= 2 and abs(faces[0]['h'] - faces[1]['h']) < 12; S = STANDARD['duo' if duo else 'solo']; m = faces[:2] if duo else faces[:1]
    ex = sum(f['x'] for f in m) / len(m); ey = sum((f['eye_y'] or f['top'] + f['h'] * .5) for f in m) / len(m); fh = sum(f['h'] for f in m) / len(m)
    add(S['eye_x'][0] <= ex <= S['eye_x'][1], 'eye x' + (' (duo)' if duo else ''), f'{ex:.0f} %', fmt(S['eye_x']) + ' %')
    add(S['eye_y'][0] - 1.5 <= ey <= S['eye_y'][1] + 1.5, 'eye line', f'{ey:.0f} %', fmt(S['eye_y']) + ' % (detector ± 1.5)')
    add(S['face_h'][0] - 1.5 <= fh <= S['face_h'][1] + 1.5, 'face size', f'{fh:.0f} % of H', fmt(S['face_h']) + ' % (detector ± 1.5)')
    if duo: add(min(f['x'] for f in m) >= S['each_x_min'], 'both on the right', f"{min(f['x'] for f in m):.0f} %", f"each face x ≥ {S['each_x_min']} %")
    for f in faces: add(f['box'][0] >= 52 or f['box'][1] >= 56, 'title clear of face', f"face from x {f['box'][0]:.0f} %", 'no face under the copy column (x < 52 %, y < 56 %)', warn=f is not faces[0])
    return rows


def main():
    a = sys.argv[1:]
    if a[:1] == ['--analyze']: return analyze(a[1])
    opt = lambda f: a[a.index(f) + 1] if f in a else None
    names_only = [x for i, x in enumerate(a) if not x.startswith('--') and (i == 0 or a[i - 1] not in ('--shots', '--sheet'))]
    if '--all' in a:
        nav = open(os.path.join(REPO, 'demos', 'shared', 'nav.js'), encoding='utf-8').read()
        names_only = [f'demos/{c}/{d}' for c, d in re.findall(r"\{ cat: '([^']+)', dir: '([^']+)'", nav)]
    if not names_only: sys.exit(__doc__)
    names_only = [os.path.abspath(n) if os.path.isdir(n) else os.path.join(REPO, n) for n in names_only]
    shots = opt('--shots') or tempfile.mkdtemp(prefix='cover-')
    os.makedirs(shots, exist_ok=True)
    v2 = all(os.path.exists(os.path.join(n, 'cover.json')) and os.path.exists(os.path.join(n, 'media', 'cover', 'art.webp')) for n in names_only) and '--old' not in a
    if v2: v2_prepare(names_only, shots)
    elif '--reuse' not in a: shoot(names_only, shots)
    dom = json.load(open(os.path.join(shots, 'dom.json')))['demos']
    art = {}
    if os.path.exists(ML_PY):
        for k in range(2):   # it takes ~10 s; once (2026-11-09, Demo03 under check_demo) it hung for 20 min: time out + one retry
            try: p = subprocess.run([ML_PY, os.path.abspath(__file__), '--analyze', shots], capture_output=True, text=True, timeout=240); break
            except subprocess.TimeoutExpired: p = subprocess.CompletedProcess([], 1, '', 'art analysis timed out after 240 s')
        try: art = json.loads(p.stdout.strip().splitlines()[-1])
        except Exception: print('art analysis failed (WARN):', p.stderr[-600:], file=sys.stderr)
    else: print(f'no {ML_PY}: character / face checks skipped', file=sys.stderr)
    names = [os.path.basename(os.path.normpath(n)) for n in names_only]
    paths = {os.path.basename(os.path.normpath(n)): n for n in names_only}
    report = {n: {'rows': judge_v2(paths[n], art.get(n, {})) if v2 else judge(n, dom.get(n, {}), art.get(n, {})), 'art': art.get(n, {}), 'dom': dom.get(n, {})} for n in names}
    if opt('--sheet') and not v2: print('sheet:', sheet(shots, os.path.expanduser(opt('--sheet')), names), file=sys.stderr)
    if '--json' in a: print(json.dumps({n: {'rows': r['rows'], 'art': r['art']} for n, r in report.items()}));
    else:
        for n, r in report.items():
            worst = 'FAIL' if any(x[0] == 'FAIL' for x in r['rows']) else 'WARN' if any(x[0] == 'WARN' for x in r['rows']) else 'PASS'
            print(f'\n{worst:4}  {n}')
            for s, c, v, e in r['rows']: print(f'   {s:4}  {c:20} {v:28} want {e}')
        print(f'\nshots: {shots}')
    sys.exit(1 if any(x[0] == 'FAIL' for r in report.values() for x in r['rows']) else 0)


if __name__ == '__main__':
    main()
