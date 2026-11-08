#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""UI v2 finished covers (DEMO_DESIGN_GUIDE §7.3 "UI v2 cover"; user 2026-11-08: "one standard format, never drawn per demo").

Every demo provides ONLY  <demo>/cover.json  (title / tagline / chips / option rows per language, tone, series) and
<demo>/media/cover/art.webp  (the picture: background + character composed once to the 2b numbers — or a whole painting widened
with tools/art/cover_plate.py). This script renders the finished cover image from the shared template tools/web/cover_tpl.html:

  <demo>/media/cover/<lang>.w1920.webp   wide layout 1920×1080   (big / retina players)
  <demo>/media/cover/<lang>.w1280.webp   wide layout 1280×720
  <demo>/media/cover/<lang>.c1200.webp   compact layout 1200×675 (players < 760 px: phones, small embeds)
  --publish also: <demo>/media/cover.jpg (en, wide 1920) + assets/images/demos/<dir>.jpg / <dir>.<lang>.jpg (menu thumbnails, 480×270)

  python3 tools/web/covers.py                       # every demo in nav.js DEMOS
  python3 tools/web/covers.py Demo24_GakuCamp …     # only these folders
  python3 tools/web/covers.py --langs en,zh --publish
FAIL (exit 1) when a copy block does not end above the live controls (title too long → shorten it in cover.json) or a file goes over
its budget (w1920 ≤ 260 KB, w1280 ≤ 160 KB, c1200 ≤ 140 KB). Needs no server (own http.server + headless Chrome, at most one)."""
import json, os, re, subprocess, sys, tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUDGET = {'w1920': 260, 'w1280': 160, 'c1200': 140}   # KB


def demos(args):
    nav = open(os.path.join(REPO, 'demos', 'shared', 'nav.js'), encoding='utf-8').read()
    ds = re.findall(r"\{ cat: '([^']+)', dir: '([^']+)'", nav)
    return [(c, d) for c, d in ds if not args or d in args]


def webp(im, path, kb):
    for q in (82, 76, 70, 64, 58):   # the best quality inside the budget
        im.save(path, 'WEBP', quality=q, method=6)
        if os.path.getsize(path) <= kb * 1024: return q
    return q


def main():
    a = sys.argv[1:]
    langs = 'en,ja,zh'
    if '--langs' in a: i = a.index('--langs'); langs = a[i + 1]; del a[i:i + 2]
    publish = '--publish' in a; args = [x for x in a if not x.startswith('--')]
    todo = [(c, d) for c, d in demos(args) if os.path.exists(os.path.join(REPO, 'demos', c, d, 'cover.json'))]
    if not todo: sys.exit('no demo with cover.json')
    with tempfile.TemporaryDirectory() as tmp:
        r = subprocess.run(['node', os.path.join(REPO, 'tools', 'web', 'cover_render.js'), tmp, *[f'demos/{c}/{d}' for c, d in todo], '--langs', langs],
                           capture_output=True, text=True, cwd=REPO, timeout=3600)
        res = json.loads(r.stdout.strip().splitlines()[-1])
        bad = list(res.get('errors', []))
        for c, d in todo:
            dd = os.path.join(REPO, 'demos', c, d); od = os.path.join(dd, 'media', 'cover'); os.makedirs(od, exist_ok=True)
            row = []
            for l in langs.split(','):
                for lay in ('wide', 'compact'):
                    t = res['demos'].get(d, {}).get(f'{l}.{lay}', {})
                    if t.get('err') or not t.get('fit'): bad.append(f'{d} {l} {lay}: {t.get("err") or "copy ends at %scqw > %s" % (t.get("end"), t.get("endMax"))}')
                    png = os.path.join(tmp, f'{d}.{l}.{lay}.png')
                    if not os.path.exists(png): continue
                    im = Image.open(png).convert('RGB')
                    if lay == 'wide':
                        im = im.resize((1920, 1080), Image.LANCZOS)
                        q1 = webp(im, os.path.join(od, f'{l}.w1920.webp'), BUDGET['w1920'])
                        q2 = webp(im.resize((1280, 720), Image.LANCZOS), os.path.join(od, f'{l}.w1280.webp'), BUDGET['w1280'])
                        row.append(f'{l}: w1920 {os.path.getsize(os.path.join(od, f"{l}.w1920.webp")) // 1024} KB (q{q1}) h1 {t.get("h1")}')
                        if publish:
                            th = im.resize((480, 270), Image.LANCZOS)
                            th.save(os.path.join(REPO, 'assets', 'images', 'demos', f'{d}.{l}.jpg'), quality=84)
                            if l == 'en':
                                th.save(os.path.join(REPO, 'assets', 'images', 'demos', f'{d}.jpg'), quality=84)
                                im.save(os.path.join(dd, 'media', 'cover.jpg'), quality=84)
                    else:
                        im = im.resize((1200, 675), Image.LANCZOS)
                        webp(im, os.path.join(od, f'{l}.c1200.webp'), BUDGET['c1200'])
            for f in os.listdir(od):
                k = f.split('.')[1] if f.count('.') == 2 else None
                if k in BUDGET and os.path.getsize(os.path.join(od, f)) > BUDGET[k] * 1024: bad.append(f'{d}/{f} over {BUDGET[k]} KB')
            print(d, ' · '.join(row))
    if bad: print('FAIL\n  ' + '\n  '.join(bad)); sys.exit(1)
    print('PASS')


if __name__ == '__main__':
    main()
