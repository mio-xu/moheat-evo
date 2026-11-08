#!/usr/bin/env python3
"""Per-language thumbnails for the demo switcher (demos/shared/nav.js): renders every demo's cover in each display language
(<page>?cover=1&sub=<lang>, see shared/subs.js) and writes assets/images/demos/<dir>.<lang>.jpg (480×270). nav.js shows the one for
the current language and falls back to <dir>.jpg (the site menu's thumbnail, untouched by this tool).

  python3 tools/web/thumbs.py                         # every demo in nav.js DEMOS, languages en ja zh
  python3 tools/web/thumbs.py Demo28_SnowFoxLullaby   # only these folders
  python3 tools/web/thumbs.py --langs en,zh
  python3 tools/web/thumbs.py --base …               # also <dir>.jpg (site menu) + demos/<cat>/<dir>/media/cover.jpg from the English cover

Needs the repo-root server: python3 -m http.server 8765. Run it again after a demo's cover or l10n.js changes."""
import os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT = os.path.join(REPO, 'assets', 'images', 'demos')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
skip = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--skip=')]
langs = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--langs=')), 'en,ja,zh').split(',')
if '--langs' in sys.argv: langs = sys.argv[sys.argv.index('--langs') + 1].split(','); args = [a for a in args if a != ','.join(langs)]
nav = open(os.path.join(REPO, 'demos', 'shared', 'nav.js'), encoding='utf-8').read()
demos = re.findall(r"\{ cat: '([^']+)', dir: '([^']+)'", nav)
if args: demos = [d for d in demos if d[1] in args]
demos = [d for d in demos if d[1] not in skip]


def shot(cat, d, lang):
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, 'c.png')
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1920,1080', '--timeout=10000',
                        f'--user-data-dir={tmp}', f'--screenshot={png}', f'http://localhost:8765/demos/{cat}/{d}/?cover=1&sub={lang}'],
                       check=True, capture_output=True, timeout=90)
        im = Image.open(png).convert('RGB')
        if len(im.resize((96, 54)).getcolors(96 * 54) or range(9999)) < 1500:   # cover still loading under load (Demo42: dark, 13 KB); real covers ≥ 2,800
            raise OSError('cover not drawn yet')
        im.resize((480, 270), Image.LANCZOS).save(os.path.join(OUT, f'{d}.{lang}.jpg'), quality=84)
        if lang == 'en' and '--base' in sys.argv:   # also the site menu's thumbnail and the demo's media/cover.jpg (the English cover)
            im.resize((480, 270), Image.LANCZOS).save(os.path.join(OUT, f'{d}.jpg'), quality=84)
            os.makedirs(os.path.join(REPO, 'demos', cat, d, 'media'), exist_ok=True); im.save(os.path.join(REPO, 'demos', cat, d, 'media', 'cover.jpg'), quality=86)
    return f'{d}.{lang}.jpg'


def safe(job):   # a page that hangs once (heavy film demos under load) gets one more try; failures are listed, not fatal
    for _ in range(2):
        try: return shot(*job)
        except (subprocess.TimeoutExpired, subprocess.CalledProcessError, OSError): pass
    return f'FAILED {job[1]}.{job[2]}.jpg'


with ThreadPoolExecutor(2) as ex:   # at most 2 headless Chromes (shared, limited computer)
    res = list(ex.map(safe, [(c, d, l) for c, d in demos for l in langs]))
print('\n'.join(res)); bad = [r for r in res if r.startswith('FAILED')]
if bad: sys.exit(f'{len(bad)} failed — run again with those folders')
