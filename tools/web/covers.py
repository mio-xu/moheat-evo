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
  python3 tools/web/covers.py --check               # no render: which finished covers are missing / older than their inputs
FAIL (exit 1) when a copy block does not end above the live controls (title too long → shorten it in cover.json) or a file goes over
its budget (w1920 ≤ 300 KB, w1280 ≤ 170 KB, c1200 ≤ 140 KB). Needs no server (own http.server + headless Chrome, at most one)."""
import json, os, re, subprocess, sys, tempfile
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BUDGET = {'w1920': 300, 'w1280': 170, 'c1200': 140}   # KB
LANGS = ('en', 'ja', 'zh')
SIZES = ('w1920', 'w1280', 'c1200')


def sha(p):
    import hashlib
    try: return hashlib.sha1(open(p, 'rb').read()).hexdigest()[:12]
    except OSError: return None


def inputs(cat, d):
    """what a finished cover depends on: the data, the picture, the template (a template change = every cover is stale)"""
    dd = os.path.join(REPO, 'demos', cat, d)
    try: cj = json.load(open(os.path.join(dd, 'cover.json'), encoding='utf-8'))
    except (OSError, ValueError): cj = None
    import hashlib   # only what is baked into the picture (options / chapters are live, they never make a cover stale)
    seen = None if cj is None else hashlib.sha1(json.dumps({k: cj.get(k) for k in ('title', 'tagline', 'chips', 'series', 'tone')}, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:12]
    return {'cover.json': seen, 'art.webp': sha(os.path.join(dd, 'media', 'cover', 'art.webp')),
            'cover_tpl.html': sha(os.path.join(REPO, 'tools', 'web', 'cover_tpl.html'))}


def stale(cat, d):
    """[] when media/cover/ holds every finished image rendered from the current inputs, else the reasons (check_demo.py G7 ui)"""
    od = os.path.join(REPO, 'demos', cat, d, 'media', 'cover'); out = []
    miss = [f'{l}.{z}.webp' for l in LANGS for z in SIZES if not os.path.exists(os.path.join(od, f'{l}.{z}.webp'))]
    if miss: out.append('missing ' + ', '.join(miss))
    try: st = json.load(open(os.path.join(od, 'stamp.json')))
    except (OSError, ValueError): return out + ['no media/cover/stamp.json (render with tools/web/covers.py)']
    cur = inputs(cat, d); ch = [k for k in cur if cur[k] != st.get(k)]
    if ch: out.append('changed since the render: ' + ', '.join(ch) + f' → python3 tools/web/covers.py {d}')
    return out


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
    if len(todo) > 1 and '--publish-only' not in a:   # a batch: one heavy job at a time
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'qa')); import heavy_lock; heavy_lock.guard(f'covers.py ({len(todo)} demos)', browser=True)
    if '--publish-only' in a:   # no render: menu thumbnails + media/cover.jpg from the finished images already on disk
        import thumbs
        for c, d in todo:
            dd = os.path.join(REPO, 'demos', c, d)
            for l in LANGS:
                im = Image.open(os.path.join(dd, 'media', 'cover', f'{l}.w1920.webp')).convert('RGB'); th = im.resize((480, 270), Image.LANCZOS)
                th.save(os.path.join(REPO, 'assets', 'images', 'demos', f'{d}.{l}.jpg'), quality=84)
                if l == 'en': th.save(os.path.join(REPO, 'assets', 'images', 'demos', f'{d}.jpg'), quality=84); im.save(os.path.join(dd, 'media', 'cover.jpg'), quality=84)
            thumbs.write_stamp(c, d, list(LANGS) + ['base'])
        print(f'{len(todo)} demos published'); return
    if '--check' in a:   # no render: list stale / missing finished covers (exit 1 if any)
        bad = [f'{d}: {"; ".join(r)}' for c, d in todo for r in [stale(c, d)] if r]
        print('\n'.join(bad) or 'all finished covers are current'); sys.exit(1 if bad else 0)
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
                    if not os.path.exists(png): bad.append(f'{d} {l} {lay}: not rendered (browser timeout?) — run covers.py {d} again'); continue
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
            if langs.split(',') == list(LANGS) and not any(x.startswith(d + ' ') for x in bad):   # a full render: stamp it
                stf = os.path.join(od, f'stamp.json.{os.getpid()}'); json.dump(inputs(c, d), open(stf, 'w'), indent=1); os.replace(stf, os.path.join(od, 'stamp.json'))
            if publish and not any(x.startswith(d + ' ') for x in bad):   # the content stamp check_demo's release row reads
                import thumbs; thumbs.write_stamp(c, d, langs.split(',') + (['base'] if 'en' in langs.split(',') else []))
            print(d, ' · '.join(row))
    if bad: print('FAIL\n  ' + '\n  '.join(bad)); sys.exit(1)
    print('PASS')


if __name__ == '__main__':
    main()
