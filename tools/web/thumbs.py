#!/usr/bin/env python3
"""Per-language thumbnails for the demo switcher (demos/shared/nav.js): renders every demo's cover in each display language
(<page>?cover=1&sub=<lang>, see shared/subs.js) and writes assets/images/demos/<dir>.<lang>.jpg (480×270). nav.js shows the one for
the current language and falls back to <dir>.jpg (the site menu's thumbnail, untouched by this tool).

  python3 tools/web/thumbs.py                         # every demo in nav.js DEMOS, languages en ja zh
  python3 tools/web/thumbs.py Demo28_SnowFoxLullaby   # only these folders
  python3 tools/web/thumbs.py --langs en,zh
  python3 tools/web/thumbs.py --base …               # also <dir>.jpg (site menu) + demos/<cat>/<dir>/media/cover.jpg from the English cover

Needs the repo-root server: python3 -m http.server 8765. Run it again after a demo's cover or l10n.js changes.

Content stamp (2026-11-08: check_demo `release` compared COMMIT TIMES, so after a shared/cover.js edit every cover.js demo FAILed
forever when the re-rendered thumbnails came out byte-identical — nothing new to commit): every render writes
assets/images/demos/<dir>.thumbs.json = per thumbnail {inputs: sha1 of each cover input, thumb: sha1 of the jpg}. Inputs = INPUTS
below (shared/cover.js, the demo's l10n.js, media/cover.jpg). check_demo.py release is fresh when the inputs and the jpgs on disk
still hash the same as stamped. Commit the .thumbs.json with the thumbnails (it does not change when nothing changed)."""
import hashlib, json, os, re, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
OUT = os.path.join(REPO, 'assets', 'images', 'demos')
INPUTS = ('{demo}/media/cover/stamp.json',)   # UI v2: thumbnails come from the finished cover (tools/web/covers.py --publish), which is stamped with its own inputs


def sha(p):
    try: return hashlib.sha1(open(p, 'rb').read()).hexdigest()
    except OSError: return None


def inputs_of(demo_rel):
    """{input path: sha1 or None} for the cover inputs of demos/<cat>/<dir>."""
    return {q: sha(os.path.join(REPO, q)) for q in (i.format(demo=demo_rel) for i in INPUTS)}


def stamp_path(d): return os.path.join(OUT, f'{d}.thumbs.json')


def stale(cat, d, keys=('en', 'ja', 'zh', 'base')):
    """None when there is no stamp, else [(thumb key, reason)] for every thumbnail whose inputs or jpg changed since it was rendered."""
    try: st = json.load(open(stamp_path(d), encoding='utf-8'))
    except (OSError, ValueError): return None
    cur, out = inputs_of(f'demos/{cat}/{d}'), []
    for k in keys:
        f = os.path.join(OUT, f'{d}.jpg' if k == 'base' else f'{d}.{k}.jpg')
        e = st.get(k)
        if not e: out.append((k, 'not in the stamp (rendered before stamps, or not with --base)')); continue
        ch = [q for q in cur if cur[q] != e['inputs'].get(q)]
        if ch: out.append((k, 'changed since the render: ' + ', '.join(ch)))
        elif sha(f) != e['thumb']: out.append((k, f'{os.path.basename(f)} differs from the stamped render (hand-edited / reverted?)'))
    return out


def write_stamp(cat, d, done):
    """done = thumbnail keys rendered now; keeps other keys' entries. Written via temp file + os.replace (shared tree)."""
    try: st = json.load(open(stamp_path(d), encoding='utf-8'))
    except (OSError, ValueError): st = {}
    cur = inputs_of(f'demos/{cat}/{d}')
    for k in done:
        st[k] = {'inputs': cur, 'thumb': sha(os.path.join(OUT, f'{d}.jpg' if k == 'base' else f'{d}.{k}.jpg'))}
    tmp = stamp_path(d) + f'.{os.getpid()}.tmp'
    json.dump(dict(sorted(st.items())), open(tmp, 'w', encoding='utf-8'), indent=1, sort_keys=True); os.replace(tmp, stamp_path(d))


def shot(cat, d, lang):
    from PIL import Image
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


def main():
    # UI v2: the menu thumbnails + media/cover.jpg are made by the one renderer
    sys.exit(subprocess.call([sys.executable, os.path.join(REPO, 'tools', 'web', 'covers.py'), '--publish', *[a for a in sys.argv[1:] if a != '--base']]))


def main_old():   # before UI v2 (screenshots of ?cover=1); unused
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    skip = [a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--skip=')]
    langs = next((a.split('=', 1)[1] for a in sys.argv[1:] if a.startswith('--langs=')), 'en,ja,zh').split(',')
    if '--langs' in sys.argv: langs = sys.argv[sys.argv.index('--langs') + 1].split(','); args = [a for a in args if a != ','.join(langs)]
    nav = open(os.path.join(REPO, 'demos', 'shared', 'nav.js'), encoding='utf-8').read()
    demos = re.findall(r"\{ cat: '([^']+)', dir: '([^']+)'", nav)
    if args: demos = [d for d in demos if d[1] in args]
    demos = [d for d in demos if d[1] not in skip]
    jobs = [(c, d, l) for c, d in demos for l in langs]
    with ThreadPoolExecutor(2) as ex:   # at most 2 headless Chromes (shared, limited computer)
        res = list(ex.map(safe, jobs))
    for c, d in demos:   # content stamp for the thumbnails rendered now
        done = [l for (c2, d2, l), r in zip(jobs, res) if d2 == d and not r.startswith('FAILED')]
        if done: write_stamp(c, d, done + (['base'] if 'en' in done and '--base' in sys.argv else []))
    print('\n'.join(res)); bad = [r for r in res if r.startswith('FAILED')]
    if bad: sys.exit(f'{len(bad)} failed — run again with those folders')


if __name__ == '__main__':
    main()
