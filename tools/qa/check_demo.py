#!/usr/bin/env python3
"""ONE QA entry point for a demo (DEMO_DESIGN_GUIDE §6 制作流程 v2). Runs every automatic check we have and prints a PASS / WARN / FAIL
table; exit code 1 when anything FAILs. Every lesson in §11.1 that a script can catch is checked here (the "gate" column = the step of
制作流程 v2 that the check belongs to). tools/web/merge_remake.py refuses to merge when this fails (unless --force).

  python3 tools/qa/check_demo.py <demo folder>                  # static + art + browser (one auto playthrough in zh + 7-size phone check)
  python3 tools/qa/check_demo.py <demo folder> --quick          # no browser (≈ 10 s): files, refs, ?v, art, l10n, release
  python3 tools/qa/check_demo.py <demo folder> --full           # + the alt branch + lip-sync runtime check (tools/art/check_mouth.js)
  python3 tools/qa/check_demo.py <staging> --remake-of <orig>   # a remake before merge_remake.py: refs to <orig> allowed, menu / thumbs skipped
  python3 tools/qa/check_demo.py <demo folder> --checklist      # also write / refresh <demo>/project/CHECKLIST.md (manual items kept)
  options: --secs N (playthrough limit, default 300) · --json (machine-readable) · --no-mobile
           --parallel (--full: main + alt playthrough at once, mouth after — at most 2 browsers; default = one browser at a time)
Browsers (2026-11-08: main + alt + mouth started together = 3 Chromes, under load the probe timed out "did not answer"): by default
ONE headless Chrome at a time — the main playthrough runs while the static checks work, then alt, mouth, shell, cover one after the
other. The wait for the probe is longer than page_probe.js's own deadline (--secs + 900 s), so a slow run answers with what it has
instead of being killed; a probe that still gives no answer is retried once alone.
Per-demo exceptions (each with a reason) go in <demo>/project/qa.json:
  { "l10n_ignore": ["…"],                              Japanese strings that are never shown (TTS readings, keys)
    "skip": { "patches": "why", "thermal": "why" } }    a check id → reason (shown as SKIP)
What is checked (id → lesson / rule):
  syntax     node --check of every JS the page loads (§11.1 script edits that broke syntax)
  layers     media/layers.js readable; rebuilt after the last stage.json edit (§11.1 stale build, foreign tool output)
  cut-body   tools/art/check_cut_body.py (half bodies floating in the frame)
  patches    tools/art/check_patches.py (mouth drift / seams / outer ring / patch outside; OLD-MOUTH / NO-TEETH unless qa.json mouth_exceptions; NO-MOUTH = WARN)
  eyes       every eyes patch covers two eyes (one-eye blinks)
  refs       only own folder + demos/shared + own category _kit (tools/qa/check_deps.py): no <base href>, no other demo folder / other
             category's kit, no hard link to another demo, no symlink out (engine plan §3.1, guide §12.1)
  links      no broken symlinks (Pages build fails), symlinks into other demos listed
  files      every local file the page / its code names exists (static 404 scan)
  cache      ?v= of shared files = the highest on the site and newer than the file's last change; same for the demo's own files
             (§11.1 mouth that did not move: shared/layers.js changed without a bump; media/layers.js rebuilt without a bump)
  l10n-flash (G6, browser) no Japanese painted before the chosen language: tools/qa/l10n_flash.js, en / zh, desktop / phone, demo switch
  l10n       l10n.js with ja / en / zh; static scan (tools/l10n/check_missing.js) = WARN; runtime '[MoHeatSub] no zh' = FAIL; ko = INFO
  voice      shared/voice.js loaded (answers by voice, judged)
  end        story ends on its OWN cover with Play again (static + runtime), never navigates to another demo
  thermal    DUAL used; showcase from the real #cmd stream: simultaneous cool + heat, fast hot↔cold, both directions, peak, ends on stop
  runtime    0 exceptions / console errors / failed requests during the playthrough
  mobile     tools/web/check_mobile.html at 7 sizes (one screen, no overflow, ≥ 44 px, guide on screen, drawer)
  drag       CDP touch strokes on the picture at 390×844 / 844×390: no page scroll / zoom / pointercancel (§7.1 拖动手势, shared/gesture.js)
  mouth      (--full) tools/art/check_mouth.js: opens only while talking, no stuck / half / flicker
  shell      (browser) tools/web/check_shell.js: pure mode ends with zero input, no mic, ← / → only on the cover, Space pauses, seek
  cover      (browser) tools/web/check_cover.py: the cover standard (§7.3 封面构图标准) — shared/cover.js, face size / eye line / side,
             copy column, dark under the copy, phone title / Start / languages (per-demo exception: qa.json skip.cover)
  release    cover.jpg, menu thumbnail + en / ja / zh thumbs (rendered from the CURRENT cover.js / l10n.js / cover.jpg: content stamp
             assets/images/demos/<dir>.thumbs.json from tools/web/thumbs.py), nav.js DEMOS, site menu, credits.html
  hygiene    assets/ git-ignored, no big tracked files, budget logged, project/CHECKLIST.md present
"""
import argparse, datetime, glob, json, os, re, subprocess, sys
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(REPO, 'tools', 'art'))

ap = argparse.ArgumentParser(description='One QA entry point for a demo (DEMO_DESIGN_GUIDE §6 制作流程 v2).')
ap.add_argument('demo'); ap.add_argument('--quick', action='store_true'); ap.add_argument('--full', action='store_true')
ap.add_argument('--remake-of', default=None); ap.add_argument('--checklist', nargs='?', const='', default=None)
ap.add_argument('--secs', type=int, default=300); ap.add_argument('--json', action='store_true'); ap.add_argument('--no-mobile', action='store_true')
ap.add_argument('--parallel', action='store_true')
A = ap.parse_args()
D = os.path.abspath(A.demo); NAME = os.path.basename(D); CAT = os.path.basename(os.path.dirname(D))
REL = os.path.relpath(D, REPO)
ORIG = os.path.basename(os.path.abspath(A.remake_of)) if A.remake_of else None
QA = {}
if os.path.exists(os.path.join(D, 'project', 'qa.json')):
    QA = json.load(open(os.path.join(D, 'project', 'qa.json'), encoding='utf-8'))
ROWS = []   # (gate, id, status, summary, details[])


def row(gate, cid, status, summary, details=()):
    if cid in QA.get('skip', {}): status, summary, details = 'SKIP', QA['skip'][cid], []
    ROWS.append((gate, cid, status, summary, list(details)))


def git(*args):
    r = subprocess.run(['git', '-C', REPO, *args], capture_output=True, text=True)
    return r.stdout.strip()


def read(p):
    try: return open(p, encoding='utf-8', errors='replace').read()
    except OSError: return ''


# ---------------------------------------------------------------- browser probe first (runs while the static checks work)
# ONE browser at a time by default (max-2-browsers rule; 3 at once timed out under load): main now, alt / mouth after it (--parallel:
# alt next to main, still ≤ 2). PROBE_WAIT > page_probe.js's own deadline (secs + 900) so a slow probe answers with partial results.
probe = probe_alt = None
PROBE = ['node', os.path.join(REPO, 'tools', 'qa', 'page_probe.js'), D, '--secs', str(A.secs)]
PROBE_WAIT = A.secs + 1200


def start_probe(extra):
    return subprocess.Popen(PROBE + extra, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True)


if not A.quick and os.path.exists(os.path.join(D, 'index.html')):
    probe = start_probe(['--no-mobile'] if A.no_mobile else [])
    if A.full and A.parallel: probe_alt = start_probe(['--alt', '--no-mobile'])
HAS_MOUTH = A.full and os.path.exists(os.path.join(D, 'media', 'layers.js'))

# ---------------------------------------------------------------- what the page loads
INDEX = os.path.join(D, 'index.html')
html = read(INDEX)
if not html:
    row('G5', 'files', 'FAIL', 'no index.html')
refs = re.findall(r'(?:src|href)="([^"#]+)"', html)
local_refs = [r for r in refs if not re.match(r'(https?:|//|data:|mailto:|javascript:)', r)]


def resolve(ref, base=D):
    return os.path.normpath(os.path.join(base, ref.split('?')[0]))


loaded = []   # (ref as written, absolute path) of the page's own JS / CSS (not demos/shared, not device.js)
for r in local_refs:
    p = resolve(r)
    if p.endswith(('.js', '.css')) and not p.startswith(os.path.join(REPO, 'demos', 'shared')) and os.path.dirname(p) != REPO:
        loaded.append((r, p))
own_files = [p for _, p in loaded if os.path.exists(p)]
if os.path.exists(os.path.join(D, 'media', 'layers.js')): own_files.append(os.path.join(D, 'media', 'layers.js'))
code = {p: read(p) for p in own_files}
alljs = '\n'.join(v for k, v in code.items() if k.endswith('.js'))

# ---------------------------------------------------------------- G5 syntax
bad = []
for p in own_files:
    if p.endswith('.js'):
        r = subprocess.run(['node', '--check', p], capture_output=True, text=True)
        if r.returncode: bad.append(f'{os.path.relpath(p, REPO)}: {(r.stderr.strip().splitlines() or ["?"])[-1][:160]}')
row('G5', 'syntax', 'FAIL' if bad else 'PASS', f'{len(bad)} JS file(s) do not parse' if bad else f'{sum(p.endswith(".js") for p in own_files)} JS files parse', bad)

# ---------------------------------------------------------------- G4 art
LJ = os.path.join(D, 'media', 'layers.js')
layers = None
if os.path.exists(LJ):
    t = read(LJ)
    try: layers = json.loads(t[t.index('{'):t.rindex('}') + 1])
    except ValueError: row('G4', 'layers', 'FAIL', 'media/layers.js has no readable JSON (half-written? rerun build_stage.py)')
    if layers is not None:
        sj = os.path.join(D, 'project', 'stage.json'); stale = []
        if os.path.exists(sj):
            try:
                sv = json.load(open(sj, encoding='utf-8')).get('views', {})
                names = {v.get('still', k).rsplit('.', 1)[0] for k, v in sv.items()}
                lv = set(layers.get('views', {}))
                if names - lv: stale.append(f'stage.json views not in media/layers.js: {", ".join(sorted(names - lv))}')
            except ValueError: stale.append('project/stage.json does not parse')
            if os.path.relpath(sj, REPO) in git('status', '--porcelain', '--', os.path.relpath(sj, REPO)) and os.path.getmtime(sj) > os.path.getmtime(LJ) + 1:
                stale.append('project/stage.json edited (uncommitted) after the last build')
        row('G4', 'layers', 'WARN' if stale else 'PASS',
            'media/layers.js may be stale — rerun tools/art/build_stage.py' if stale else f'{len(layers.get("views", {}))} views, in step with stage.json', stale)
        try:
            import check_cut_body
            cut = check_cut_body.check(D)
            row('G4', 'cut-body', 'FAIL' if cut else 'PASS', f'{len(cut)} cut edge(s) inside the frame → tools/art/extend_pose.py' if cut else 'no half bodies',
                [f'{n} {s}: {m}' for n, s, m in cut])
        except Exception as e:
            row('G4', 'cut-body', 'FAIL', f'check_cut_body failed: {e}')
        r = subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'art', 'check_patches.py'), D], capture_output=True, text=True)
        fl = [l.strip()[2:] for l in r.stdout.splitlines() if l.strip().startswith('✗')]
        hard = [f for f in fl if not f.startswith('NO-MOUTH')]
        if r.returncode and not fl: hard = [(r.stderr.strip().splitlines() or ['check_patches.py crashed'])[-1]]
        row('G4', 'patches', 'FAIL' if hard else 'WARN' if fl else 'PASS',
            (f'{len(hard)} patch problem(s) — look at assets/patch_check/ at 100 %, fix regions_mouth / regions_eyes' if hard else
             f'{len(fl)} view(s) without a mouth patch (fine only if nobody talks there)' if fl else 'all patches aligned (still look at assets/patch_check/mouths.jpg + every assets/lp_mouths/<pose>_sheet.jpg 2×: teeth inside the lips, same place on lv2 / lv3)'), fl)
        # eyes: two eyes in every eyes patch
        one = []
        try:
            from PIL import Image
            import numpy as np
            seen = set()
            for stem, v in layers.get('views', {}).items():
                for p in v.get('patches', []):
                    if p.get('kind') != 'eyes' or p['src'] in seen: continue
                    seen.add(p['src'])
                    a = np.asarray(Image.open(os.path.join(D, 'media', p['src'].split('?')[0])).convert('RGBA'))[..., 3] > 40
                    cols = a.any(0).astype(int); runs = int(((cols[1:] - cols[:-1]) == 1).sum() + cols[0])
                    w, h = p['rect'][2], p['rect'][3]
                    if runs < 2 and w / max(h, 1) < 1.35: one.append(f'{stem}: {p["src"].split("?")[0]} is one blob {w}×{h} — both eyes? (preview: both must close)')
        except Exception as e:
            one.append(f'could not read eyes patches: {e}')
        row('G4', 'eyes', 'WARN' if one else 'PASS', f'{len(one)} eyes patch(es) may cover one eye only' if one else 'every eyes patch spans two eyes', one)
        # asset standard checks (USER_PREFERENCES 素材制作标准, guide §6 G3 / G4): tools/art/check_art.py
        try:
            import check_art
            res = check_art.check(D)
            DESC = {'edges': ('no flat head / ruler cut, cut edges ≥ 1.5 % outside the frame', 'flat head / straight cut or a cut edge close to the frame'),
                    'fringe': ('no backdrop colour on the cut-out rim', 'backdrop colour on the cut-out rim (grey / green / magenta halo)'),
                    'blink': ('both eyes close, no iris through the lids', 'one-eye blink or iris through the closed lid'),
                    'far-motion': ('mouth / blink readable at 1080p on every view', 'mouth / blink too small to read on a far shot'),
                    'looks': ('same hair in every pose, same outfit within each look', 'hair / outfit colour differs (coarse; confirm on poses_preview.jpg)')}
            for k, (ok, bad) in DESC.items():
                got = [m for lv, kk, m in res if kk == (k if k != 'edges' else 'edge-margin')]
                lvl = 'FAIL' if any(lv == 'FAIL' and kk == (k if k != 'edges' else 'edge-margin') for lv, kk, _ in res) else 'WARN' if got else 'PASS'
                row('G4', k, lvl, f'{len(got)} × {bad}' if got else ok, got)
        except Exception as e:
            row('G4', 'fringe', 'WARN', f'tools/art/check_art.py failed: {e}')
else:
    row('G4', 'layers', 'SKIP', 'no media/layers.js (not a layered page)')

# ---------------------------------------------------------------- G5 refs / links / files
# refs = the dependency rule of the engine plan (docs/engine/2026-11-08_engine_plan.md §3.1, guide §12 / §14): a demo loads only from its
# own folder, demos/shared/** and its OWN category kit demos/<cat>/_kit/**; no <base href> to another folder, no hard link to another
# demo (navigation = nav.js data), no symlink out of the folder. Same scan as the site-wide tools/qa/check_deps.py (one rule, one code).
# qa.json allow_foreign is gone; only --remake-of <orig> lets a staging folder point at the folder it replaces.
REFS_LEVEL = 'FAIL'   # since P1 of the engine plan (check_deps.py = 0 violations)
r = subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'qa', 'check_deps.py'), '--json', '--demo', NAME], capture_output=True, text=True)
try:
    dep = next((x for x in json.loads(r.stdout)['rows'] if x['demo'] == f'{CAT}/{NAME}'), {'details': {}})
    LABEL = {'R': 'loads', 'B!': 'base', 'L': 'link', 'S': 'symlink', 'K': 'kit'}
    foreign = sorted(f'{LABEL[k]} {m}' for k in LABEL for m in dep['details'].get(k, []) if not (ORIG and ORIG in m))
    row('G5', 'refs', REFS_LEVEL if foreign else 'PASS',
        f'{len(foreign)} reference(s) outside own folder / shared / own _kit — move what two demos share into demos/{CAT}/_kit/ (rule: guide §12)'
        if foreign else f'self-contained (own folder + demos/shared + demos/{CAT}/_kit only)', foreign)
except (ValueError, KeyError, StopIteration) as e:
    row('G5', 'refs', 'FAIL', f'tools/qa/check_deps.py failed: {e} {r.stderr.strip()[-200:]}')
allowed = {ORIG} if ORIG else set()

broken, outside = [], []
tracked = set(git('ls-files', '--', REL).splitlines())
for dp, dn, fn in os.walk(D):
    for f in dn + fn:
        p = os.path.join(dp, f)
        if not os.path.islink(p): continue
        tgt = os.path.realpath(p); rp = os.path.relpath(p, REPO)
        if not os.path.exists(tgt): broken.append(rp + (' (tracked)' if rp in tracked else ''))
        elif not tgt.startswith(D + os.sep):
            m = re.search(r'/(Demo\d{2}_\w+)/', tgt)
            if m and m.group(1) != NAME and m.group(1) not in allowed: outside.append(f'{rp} → {os.path.relpath(tgt, REPO)}')
tb = [b for b in broken if b.endswith('(tracked)')]
row('G5', 'links', 'FAIL' if tb else 'WARN' if broken or outside else 'PASS',
    (f'{len(tb)} broken tracked symlink(s): the Pages build fails' if tb else f'{len(broken)} broken untracked link(s), {len(outside)} link(s) into other demos (break when that demo is remade)'
     if broken or outside else 'no broken links'), broken + outside[:12] + ([f'… {len(outside) - 12} more'] if len(outside) > 12 else []))

missing = []
PATH = re.compile(r'''['"`(]((?:\.{1,2}/|[\w-]+/)*[\w.@-]+\.(?:webp|jpe?g|png|gif|svg|m4a|mp3|wav|ogg|mp4|webm|js|css|json|woff2?))(?:\?[^'"`)]*)?['"`)]''')
def strip_comments(t):
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(^|\s)//[^\n]*', r'\1', t)
for r in local_refs:
    p = resolve(r)
    if not os.path.exists(p): missing.append(f'index.html: {r}')
# `PREFIX + 'file.webp'` (e.g. const ART = '../_kit/art/') — resolve the prefix constant from the same file, else the bare
# file name was looked up next to the page and reported as a false 404 (2026-11-08: banquet_bg.webp in Demo23 / 41 / 42).
CONST = re.compile(r'''\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*['"`]([^'"`$]*/)['"`]''')
for p, t in code.items():
    base = os.path.join(D, 'media') if p == LJ else (os.path.dirname(p) if p.endswith('.css') else D)
    tc = strip_comments(t); consts = dict(CONST.findall(tc))
    for m in PATH.finditer(tc):
        s = m.group(1)
        if '${' in s or s.startswith(('http', '//')): continue
        pre = re.search(r'([A-Za-z_$][\w$]*)\s*\+\s*$', tc[max(0, m.start() - 60):m.start()])
        if pre and pre.group(1) in consts: s = consts[pre.group(1)] + s
        q = os.path.normpath(os.path.join(base, s))
        if not os.path.exists(q) and not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(p), s))):
            missing.append(f'{os.path.relpath(p, D)}: {s}')
missing = sorted(set(missing))
row('G5', 'files', 'FAIL' if missing else 'PASS', f'{len(missing)} file(s) named but missing (404)' if missing else 'every named local file exists', missing)

# ---------------------------------------------------------------- G5 cache (?v=)
site_pages = [p for p in glob.glob(os.path.join(REPO, 'demos', '*', '*', 'index.html')) + glob.glob(os.path.join(REPO, '*.html'))]
site_max = {}
for p in site_pages:
    t = read(p); b = re.search(r'<base\s+href="([^"]+)"', t); base = resolve(b.group(1), os.path.dirname(p)) if b else os.path.dirname(p)
    for ref, v in re.findall(r'(?:src|href)="([^"?#]+)\?v=(\d+)"', t):
        q = os.path.normpath(os.path.join(base, ref))
        site_max[q] = max(site_max.get(q, 0), int(v))
dirty = set(git('status', '--porcelain', '--', REL, 'demos/shared', 'device.js').splitlines())
dirty = {l[3:].strip('"') for l in dirty}
cache_fail, cache_warn = [], []
for ref, v in re.findall(r'(?:src|href)="([^"?#]+)\?v=([^"&]+)"', html):
    p = resolve(ref); rp = os.path.relpath(p, REPO)
    if not os.path.exists(p): continue
    if not v.isdigit():   # content-hash version (tools/web/bump.py --auto): stale when it is not the file's current hash
        import hashlib
        h = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
        if re.fullmatch(r'[0-9a-f]{6,12}', v) and v != h: cache_fail.append(f'{ref}?v={v}: content is now {h} — python3 tools/web/bump.py --auto {rp}')
        continue
    shared = rp.startswith('demos/shared/') or os.path.dirname(p) == REPO
    if shared and int(v) < site_max.get(p, 0):
        cache_fail.append(f'{ref}?v={v}: other pages use ?v={site_max[p]} — bump (python3 tools/web/bump.py {rp})'); continue
    pat = f'{os.path.basename(p)}?v={v}' if shared else f'"{ref}?v={v}"'
    where = [] if shared else ['--', os.path.relpath(INDEX, REPO)]
    c = git('log', '-1', '--format=%H', '-S', pat, *where)
    if c:
        later = git('log', '--diff-filter=M', '--format=%h %s', f'{c}..HEAD', '--', rp)   # M only: a move / first add is not a change
        if later:   # shared files and media/layers.js = FAIL (§11.1: mouth did not move); the demo's other files = WARN
            (cache_fail if shared or rp.endswith('media/layers.js') else cache_warn).append(
                f'{ref}?v={v}: {rp} changed in {later.splitlines()[0][:70]} after that number was set — bump')
    if rp in dirty and not shared: cache_warn.append(f'{rp} has uncommitted changes — bump ?v= in the same commit (tools/web/bump.py --stage)')
for r in local_refs:
    if r.split('?')[0].endswith(('.js', '.css')) and '?v=' not in r and not re.match(r'\.\./\.\./shared/', r):
        cache_warn.append(f'{r} has no ?v= (browsers keep the old copy)')
row('G5', 'cache', 'FAIL' if cache_fail else 'WARN' if cache_warn else 'PASS',
    f'{len(cache_fail)} stale ?v= number(s) (shared / media/layers.js)' if cache_fail else f'{len(cache_warn)} older ?v= / note(s) — bump on the next change' if cache_warn else 'every ?v= is current', cache_fail + cache_warn)

# ---------------------------------------------------------------- G5 l10n / voice / end (static)
l10n = read(os.path.join(D, 'l10n.js'))
lang_missing = [l for l in ('ja', 'en', 'zh') if not re.search(rf'["\']?{l}["\']?\s*:\s*\{{', l10n)]
if not l10n: row('G5', 'l10n', 'FAIL', 'no l10n.js (the 中文 / cover texts live there)')
else:
    r = subprocess.run(['node', os.path.join(REPO, 'tools', 'l10n', 'check_missing.js'), 'zh', NAME], capture_output=True, text=True)
    ign = set(QA.get('l10n_ignore', []))
    miss = [l.strip() for l in r.stdout.splitlines() if l.startswith('   ') and '|' not in l and l.strip() not in ign]
    ko = 'ko' in l10n
    row('G5', 'l10n', 'FAIL' if lang_missing else 'WARN' if miss else 'PASS',
        (f'l10n.js has no text for {", ".join(lang_missing)}' if lang_missing else
         f'{len(miss)} Japanese string(s) without zh in the static scan — translate the visible ones or list them in project/qa.json l10n_ignore' if miss else
         'ja / en / zh present, static scan clean') + ('' if ko else ' · ko not yet (room kept: subs.js LANGS)'), miss[:15] + ([f'… {len(miss) - 15} more'] if len(miss) > 15 else []))
talks = os.path.exists(os.path.join(D, 'lines.js')) or 'lines.js' in html
has_voice = 'shared/voice.js' in html
row('G5', 'voice', 'PASS' if has_voice else 'FAIL' if talks else 'SKIP',
    'shared/voice.js loaded (answers by voice, judged)' if has_voice else 'dialogue demo without shared/voice.js' if talks else 'no dialogue')
end_static = re.search(r'もう一度 · Play again', alljs) is not None
navaway = re.findall(r'location(?:\.href)?\s*=\s*[^;\n]*Demo\d{2}|location\.(?:assign|replace)\([^)]*Demo\d{2}', alljs)
row('G5', 'end', 'FAIL' if (not end_static or navaway) else 'PASS',
    'navigates to another demo at the end' if navaway else 'no "↺ もう一度 · Play again" on its own cover at the end' if not end_static else 'ends on its own cover (static)', navaway)

# ---------------------------------------------------------------- G5 media budget (tools/qa/media_budget.py; user 2026-11-08: demo switching slow)
try:
    sys.path.insert(0, os.path.join(REPO, 'tools', 'qa')); import media_budget
    mo, mt = media_budget.check(D)
    row('G5', 'media', 'WARN' if mo or mt > media_budget.TOTAL_KB else 'PASS',
        f'{len(mo)} file(s) over the media budget, media {mt} KB' if mo else f'every file within budget, media {mt} KB',
        [f'{r}: {kb} KB > {lim} KB — {how}' for r, kb, lim, how in mo[:8]] + ([f'… {len(mo) - 8} more (python3 tools/qa/media_budget.py {REL})'] if len(mo) > 8 else []))
except Exception as e: row('G5', 'media', 'WARN', f'media_budget.py failed: {e}')

# ---------------------------------------------------------------- G7 release / G8 hygiene
if ORIG:
    row('G7', 'release', 'SKIP', f'staging folder (remake of {ORIG}): cover / thumbs / menu are checked on {ORIG} after merge_remake.py')
else:
    rel = []
    TH = os.path.join(REPO, 'assets', 'images', 'demos')
    if not os.path.exists(os.path.join(D, 'media', 'cover.jpg')): rel.append('media/cover.jpg missing (headless Chrome ?cover=1)')
    for f in [f'{NAME}.jpg'] + [f'{NAME}.{l}.jpg' for l in ('en', 'ja', 'zh')]:
        if not os.path.exists(os.path.join(TH, f)): rel.append(f'assets/images/demos/{f} missing (python3 tools/web/thumbs.py {NAME})')
    nav = read(os.path.join(REPO, 'demos', 'shared', 'nav.js'))
    if f"dir: '{NAME}'" not in nav: rel.append('not in demos/shared/nav.js DEMOS')
    if NAME not in read(os.path.join(REPO, 'index.html')): rel.append('not in the site menu (index.html .td-menu)')
    warn = []
    navrow = re.search(rf"dir: '{re.escape(NAME)}', ja: '([^']+)'", nav)
    title = navrow.group(1) if navrow else NAME
    crow = next((l for l in read(os.path.join(REPO, 'credits.html')).splitlines() if '<tr>' in l and title.split('、')[0] in l), '')
    if not crow: warn.append(f'credits.html has no row for 「{title}」')
    elif os.path.exists(LJ) and 'layered' not in crow: warn.append(f'credits.html row for 「{title}」 does not say "layered" (art credit out of date?)')
    # thumbnails vs cover CONTENT (2026-11-08: commit times made every shared/cover.js demo FAIL forever when the re-rendered thumbnails
    # were byte-identical): tools/web/thumbs.py stamps assets/images/demos/<dir>.thumbs.json with the sha1 of each cover input + jpg
    sys.path.insert(0, os.path.join(REPO, 'tools', 'web')); import thumbs as _thumbs
    uses_cover = 'shared/cover.js' in read(os.path.join(D, 'index.html'))
    stl = _thumbs.stale(CAT, NAME, ('en', 'ja', 'zh') + (('base',) if uses_cover else ()))
    if stl is not None:
        for k, why in stl:
            msg = f'thumbnail {k}: {why} — python3 tools/web/thumbs.py{" --base" if uses_cover else ""} {NAME} (then commit the jpgs + {NAME}.thumbs.json)'
            (warn if why.startswith('changed since the render: ') and all(q.endswith('/l10n.js') for q in why.split(': ', 1)[1].split(', ')) or not uses_cover else rel).append(msg)
    else:   # no stamp yet: the old commit-time rule, with the way out
        ct = lambda p: int(git('log', '-1', '--format=%ct', '--', p) or 0)
        th = min([ct(os.path.join('assets', 'images', 'demos', f'{NAME}.{l}.jpg')) for l in ('en', 'ja', 'zh')] or [0])
        for src in ('media/cover.jpg', 'l10n.js'):
            if th and ct(os.path.join(REL, src)) > th: warn.append(f'{src} committed after the en/ja/zh thumbnails (no {NAME}.thumbs.json content stamp yet) — rerun tools/web/thumbs.py {NAME}')
        cvt = max(ct(os.path.join('demos', 'shared', 'cover.js')), ct(os.path.join(REL, 'media', 'cover.jpg')))
        base = ct(os.path.join('assets', 'images', 'demos', f'{NAME}.jpg'))
        if th and uses_cover and min(th, base or th) < cvt:
            rel.append(f'menu thumbnails committed before the last shared/cover.js / media/cover.jpg change and no content stamp — python3 tools/web/thumbs.py --base {NAME} '
                       f'(writes assets/images/demos/{NAME}.thumbs.json; byte-identical thumbnails then pass)')
    row('G7', 'release', 'FAIL' if rel else 'WARN' if warn else 'PASS', f'{len(rel)} release item(s) missing' if rel else f'{len(warn)} note(s)' if warn else 'cover, thumbs, menu, credits', rel + warn)
# ---------------------------------------------------------------- G7 category style (tools/art/style_card.py, demos/<cat>/_kit/style.json)
try:
    import style_card
    sser, sw = style_card.check(D)
    row('G7', 'style', 'WARN' if sw else 'PASS', f'{len(sw)} view(s) drift from the category style anchor — compare in demos/{CAT}/_kit/style_family.jpg' if sw
        else f'cover / main view match the {sser["id"]} style anchor (saturation, contrast, line density)', sw)
except Exception as e:
    row('G7', 'style', 'WARN', f'tools/art/style_card.py failed: {e}')
hy = []
if os.path.isdir(os.path.join(D, 'assets')) and subprocess.run(['git', '-C', REPO, 'check-ignore', '-q', os.path.join(REL, 'assets', 'x.png')]).returncode:
    hy.append('assets/ is not in .gitignore (raw art must stay out of git)')
for f in tracked:
    p = os.path.join(REPO, f)
    if os.path.isfile(p) and not os.path.islink(p) and os.path.getsize(p) > 5e6: hy.append(f'{f} is {os.path.getsize(p) / 1e6:.0f} MB in git')
docs = ' '.join(read(p) for p in glob.glob(os.path.join(D, 'README.md')) + glob.glob(os.path.join(D, 'project', '*.md')))
if not re.search(r'credits|\$\s?\d|USD|美元', docs): hy.append('no budget line (credits / $) in README.md or project/*.md')
if not os.path.exists(os.path.join(D, 'project', 'CHECKLIST.md')): hy.append('no project/CHECKLIST.md (run with --checklist)')
if os.path.exists(LJ) and not os.path.exists(os.path.join(D, 'project', 'script.md')):   # G1: script + shot list + thermal table before art
    hy.append('no project/script.md (G1: world rule card, shot list, thermal table — template tools/qa/SCRIPT_TEMPLATE.md)')
if os.path.exists(os.path.join(D, 'project', 'openai_log.json')):   # per-demo OpenAI cap $10, ⚠ at 80 % (tools/report/balances.py)
    bq = subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'report', 'balances.py'), '--demo', D], capture_output=True, text=True)
    if bq.returncode: hy.append(bq.stdout.strip())
row('G8', 'hygiene', 'WARN' if hy else 'PASS', f'{len(hy)} note(s)' if hy else 'assets ignored, no big files, budget logged, checklist present', hy)

# ---------------------------------------------------------------- G6 browser results


def thermal(cmds, secs):
    """showcase analysis of the #cmd stream (heat 0–200, cool 35–80 PWM in the DUAL demos)."""
    pts = []
    for t, c in cmds:
        v = {k: int(n) for k, n in re.findall(r'\b([LR][CH])(\d+)', c)}
        pts.append((t, v.get('LC', 0), v.get('LH', 0), v.get('RC', 0), v.get('RH', 0), c.strip().lower() == 'stop'))
    if not pts or all(p[5] for p in pts): return 'FAIL', f'no thermal output in {secs} s of play', []
    H = lambda x: x / 200; C = lambda x: max(0, x - 35) / 45 if x else 0
    notes, info = [], []
    dual = any(c.startswith('DUAL') for _, c in cmds)
    simul = any((C(p[1]) > .05 and H(p[2]) > .05) or (C(p[3]) > .05 and H(p[4]) > .05) for p in pts)
    cross = any((H(p[2]) > .15 and C(p[3]) > .15) or (H(p[4]) > .15 and C(p[1]) > .15) for p in pts)
    side = any(abs(H(p[2]) - H(p[4])) > .25 or abs(C(p[1]) - C(p[3])) > .25 for p in pts)
    fast = None
    for ear, (ci, hi) in (('L', (1, 2)), ('R', (3, 4))):
        last = None
        for p in pts:
            st = 'hot' if H(p[hi]) > .3 and C(p[ci]) < .2 else 'cold' if C(p[ci]) > .3 and H(p[hi]) < .15 else None
            if st and last and st != last[0] and p[0] - last[1] <= 3: fast = fast or f'{ear} ear {last[0]}→{st} in {p[0] - last[1]:.1f} s at {p[0]:.0f} s'
            if st: last = (st, p[0])
    ph, pc = max(max(H(p[2]), H(p[4])) for p in pts), max(max(C(p[1]), C(p[3])) for p in pts)
    if not dual: notes.append('old one-mode-per-ear commands (the user prefers DUAL)')
    if not simul: notes.append('never cool + heat on the same ear at once (DUAL showcase)')
    if not fast: notes.append('no fast hot↔cold switch on one ear (≤ 3 s)')
    if not side: notes.append('never a clear left / right difference (direction)')
    if ph < .5: notes.append(f'peak heat only {ph:.0%}')
    if pc < .5: notes.append(f'peak cool only {pc:.0%}')
    info.append(f'{len(pts)} commands · peak heat {ph:.0%} · peak cool {pc:.0%} · simultaneous {"yes" if simul else "no"} · L-heat/R-cool split {"yes" if cross else "no"} · fast switch: {fast or "none"}')
    return ('WARN' if notes else 'PASS'), ('; '.join(notes) if notes else 'DUAL showcase: simultaneous, fast switch, direction, peaks'), info


def take(proc, timeout):
    try: out, _ = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired: proc.kill(); return None
    try: return json.loads(out.strip().splitlines()[-1])
    except Exception: return None


if probe:
    res = take(probe, PROBE_WAIT)
    if not res:   # killed / crashed / no JSON: once more, alone (nothing else of ours is running now)
        if probe_alt: probe_alt.kill(); probe_alt = None
        res = take(start_probe(['--no-mobile'] if A.no_mobile else []), PROBE_WAIT)
    if not res: row('G6', 'runtime', 'FAIL', 'the browser probe did not answer twice (Chrome / port problem? see `node tools/qa/page_probe.js <demo>`)')
    else:
        runs = [('', res)]
        if A.full:
            ra = take(probe_alt or start_probe(['--alt', '--no-mobile']), PROBE_WAIT)   # sequential unless --parallel started it already
            if ra: runs.append(('alt ', ra))
            else: row('G6', 'alt runtime', 'FAIL', 'the alt-branch probe did not answer')
        for tag, r in runs:
            P = r.get('play') or {}
            errs = [f'exception: {x}' for x in P.get('exceptions', [])] + [f'console.error: {x}' for x in P.get('console', [])] + [f'request: {x}' for x in P.get('bad', [])] + [f'probe: {x}' for x in r.get('errors', [])]
            row('G6', f'{tag}runtime', 'FAIL' if errs else 'PASS', f'{len(errs)} error(s) / failed request(s) in {P.get("secs")} s' if errs else f'0 errors, 0 failed requests in {P.get("secs")} s (?auto=1, zh)', errs[:20])
            nz = P.get('nozh', [])
            norm = lambda x: re.sub(r'\s+', '', x)
            have = norm(l10n)
            real = [x for x in nz if norm(x) not in have]   # in l10n.js but shown before it loaded = the startup race in subs.js, not a missing line
            race = [f'{x} (in l10n.js, shown before it loaded)' for x in nz if norm(x) in have]
            row('G6', f'{tag}l10n-live', 'FAIL' if real else 'WARN' if race else 'PASS',
                f'{len(real)} visible string(s) without zh' if real else f'{len(race)} line(s) shown before l10n.js loaded' if race else 'no "[MoHeatSub] no zh" during the playthrough', (real + race)[:15])
            if P.get('left'): row('G6', f'{tag}end-live', 'FAIL', f'navigated away to {P["left"]}')
            elif P.get('ended'): row('G6', f'{tag}end-live', 'PASS', f'back on its own cover with Play again after {P.get("secs")} s')
            else: row('G6', f'{tag}end-live', 'WARN', f'did not reach the end within {P.get("secs")} s (raise --secs, or the auto path stalls)')
            st, summ, info = thermal(P.get('cmds', []), P.get('secs'))
            if P.get('cmds') and P['cmds'][-1][1].strip().lower() != 'stop' and P.get('ended'): st = 'WARN'; summ += '; does not end on stop'
            if A.full and not tag and P.get('cmds'):   # the thermal-use score for the menu (tools/qa/thermal_score.py → thermal_scores.json; then --write-nav)
                sys.path.insert(0, os.path.join(REPO, 'tools', 'qa')); import thermal_score
                ts, tp = thermal_score.update(NAME, P['cmds'], P.get('secs'), 'check_demo --full (?auto run)'); info.append(f'thermal-use score {ts} / 100 {tp} → tools/qa/thermal_scores.json')
            row('G6', f'{tag}thermal', st, summ, info)
        M = res.get('mobile')
        if M and any(m['problems'] for m in M):   # parallel Chrome runs make one-screen results flaky: a size fails only if it fails twice
            again = subprocess.run(['node', os.path.join(REPO, 'tools', 'qa', 'page_probe.js'), D, '--no-play'], capture_output=True, text=True)
            try:
                M2 = json.loads(again.stdout.strip().splitlines()[-1]).get('mobile') or []
                bad2 = {m['size'] for m in M2 if m['problems']}
                M = [m if m['size'] in bad2 else {**m, 'problems': []} for m in M]
            except Exception: pass
        if M is not None:
            badm = [f'{m["size"]} ({m["layout"]}): ' + '; '.join(m['problems']) for m in M if m['problems']]
            row('G6', 'mobile', 'FAIL' if badm or not M else 'PASS', f'{len(badm)} of {len(M)} sizes with problems' if badm else
                f'{len(M)} sizes: one screen, ≥ 44 px, guide on screen' if M else 'no result from check_mobile.html', badm)
        DG = res.get('drag')   # drag doesn't scroll (§7.1 拖动手势, shared/gesture.js): CDP touch strokes at 390×844 / 844×390
        if DG is not None:
            badd = [f'{d["size"]}: ' + '; '.join(d['problems']) for d in DG if d['problems']]
            row('G6', 'drag', 'FAIL' if badd or not DG else 'PASS', f'{len(badd)} of {len(DG)} sizes: the browser takes the finger' if badd else
                f'{len(DG)} sizes: strokes reach the page, no scroll / zoom / pointercancel' if DG else 'no result', badd)
if HAS_MOUTH:   # after the probes: one browser at a time
    mouth = subprocess.Popen(['node', os.path.join(REPO, 'tools', 'art', 'check_mouth.js'), D, str(min(A.secs, 240))], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    try: out, _ = mouth.communicate(timeout=A.secs + 600)
    except subprocess.TimeoutExpired: mouth.kill(); out = 'timeout'
    fl = [l.strip()[2:] for l in out.splitlines() if l.strip().startswith('✗')]
    row('G6', 'mouth', 'FAIL' if mouth.returncode else 'PASS', f'{len(fl)} lip-sync problem(s)' if mouth.returncode else 'mouth opens only while talking', fl or ([out.strip().splitlines()[-1]] if mouth.returncode and out.strip() else []))

# ---------------------------------------------------------------- G6 unified shell (tools/web/check_shell.js, guide §2 / §7.3 统一外壳)
if not A.quick and 'shared/shell.js' in read(os.path.join(D, 'index.html')):
    sh = subprocess.run(['node', os.path.join(REPO, 'tools', 'web', 'check_shell.js'), D, '--secs', str(A.secs)], capture_output=True, text=True)
    try:
        r = json.loads(sh.stdout.strip().splitlines()[-1]); bad = []
        if not r.get('pureEnded'): bad.append(f'pure mode did not reach its own cover in {r.get("secs")} s with zero input')
        if r.get('mic'): bad.append('pure mode asked for the microphone: ' + ', '.join(r['mic']))
        if r.get('navDuringPlay'): bad.append('← / → left the page during playback')
        if not r.get('navOnCover'): bad.append('→ on the cover did not switch demos')
        if not (r.get('pause') or {}).get('frozen'): bad.append('Space did not freeze the clock')
        sk = r.get('seek')
        if sk and not (sk.get('forward') and sk.get('back')): bad.append(f'seek failed: {sk}')
        row('G6', 'shell', 'FAIL' if bad else 'PASS', f'{len(bad)} shell problem(s)' if bad else f'pure run ends in {r.get("secs")} s, no mic, ←/→ gated, pause, seek {"ok" if sk else "n/a (no chapters)"}', bad + r.get('errors', []))
    except Exception: row('G6', 'shell', 'WARN', 'check_shell.js gave no result', [sh.stderr.strip()[-300:]])
elif not A.quick: row('G6', 'shell', 'WARN', 'page does not load demos/shared/shell.js yet (pure / interactive mode, pause, seek, ← / →)')

# ---------------------------------------------------------------- G6 l10n-flash (tools/qa/l10n_flash.js, guide §2.2; user 2026-11-08: switching demos
# showed the Japanese cover first): EN and 中文 at desktop + phone size, opened twice in one tab (= arriving from another demo); every frame
# from first paint is sampled — a Japanese text painted and then replaced by the translation = FAIL
if not A.quick and os.path.exists(os.path.join(D, 'index.html')):
    lf = subprocess.run(['node', os.path.join(REPO, 'tools', 'qa', 'l10n_flash.js'), D, D, '--secs', '3'], capture_output=True, text=True)
    try:
        r = json.loads(lf.stdout.strip().splitlines()[-1])
        bad = [f'{x["lang"]} {x["size"]}{" (switch)" if x["switched"] else ""}: ' + ', '.join(f'「{f["text"]}」@{f["ms"]} ms' for f in x['flash'][:3]) for x in r['runs'] if x['flash']]
        dead = [f'{x["lang"]} {x["size"]}: {x["error"]}' for x in r['runs'] if x.get('error')] + r.get('errors', [])
        row('G6', 'l10n-flash', 'FAIL' if bad else 'WARN' if dead else 'PASS',
            f'{len(bad)} run(s) painted Japanese before the chosen language' if bad else 'no Japanese painted before the chosen language (en / zh, desktop / phone, switch)', bad + dead)
    except Exception: row('G6', 'l10n-flash', 'WARN', 'l10n_flash.js gave no result', [lf.stderr.strip()[-300:]])

# ---------------------------------------------------------------- G7 cover composition (tools/web/check_cover.py, guide §7.3 封面构图标准)
if not A.quick:
    if 'cover' in QA.get('skip', {}): row('G7', 'cover', 'SKIP', QA['skip']['cover'])
    else:
        cv = subprocess.run([sys.executable, os.path.join(REPO, 'tools', 'web', 'check_cover.py'), D, '--json'], capture_output=True, text=True)
        try:
            cr = json.loads(cv.stdout.strip().splitlines()[-1])[NAME]['rows']
            bad = [f'{c}: {v} (want {e})' for s_, c, v, e in cr if s_ == 'FAIL']; wn = [f'{c}: {v} (want {e})' for s_, c, v, e in cr if s_ == 'WARN']
            row('G7', 'cover', 'FAIL' if bad else 'WARN' if wn else 'PASS', f'{len(bad)} off the cover standard' if bad else f'{len(wn)} note(s)' if wn else 'face size / eye line / side, copy column, shade, phone', bad + wn)
        except Exception: row('G7', 'cover', 'WARN', 'check_cover.py gave no result', [cv.stderr.strip()[-300:]])

# ---------------------------------------------------------------- output
ORDER = {'G4': 0, 'G5': 1, 'G6': 2, 'G7': 3, 'G8': 4}
ROWS.sort(key=lambda r: ORDER.get(r[0], 9))
fails = sum(r[2] == 'FAIL' for r in ROWS); warns = sum(r[2] == 'WARN' for r in ROWS)
mode = 'quick' if A.quick else 'full' if A.full else 'default'
if A.json:
    print(json.dumps({'demo': REL, 'mode': mode, 'fail': fails, 'warn': warns, 'rows': [dict(zip(('gate', 'id', 'status', 'summary', 'details'), r)) for r in ROWS]}, ensure_ascii=False, indent=1))
else:
    print(f'\n{REL}  ({mode}{", remake of " + ORIG if ORIG else ""})')
    print(f'{"gate":4}  {"check":15} {"result":6}  summary')
    for g, cid, st, summ, det in ROWS:
        print(f'{g:4}  {cid:15} {st:6}  {summ}')
        for d in det[:25]: print(f'{"":28}· {d}')
    print(f'\n{"FAIL" if fails else "PASS"}: {fails} fail, {warns} warn, {sum(r[2] == "PASS" for r in ROWS)} pass' + ('' if fails else ' — the manual items in project/CHECKLIST.md still need a human look'))

# ---------------------------------------------------------------- project/CHECKLIST.md
if A.checklist is not None:
    path = A.checklist or os.path.join(D, 'project', 'CHECKLIST.md')
    tpl = read(os.path.join(REPO, 'tools', 'qa', 'CHECKLIST_TEMPLATE.md'))
    cur = read(path) or tpl.replace('{{DEMO}}', REL)
    stamp = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
    table = '\n'.join([f'Last run: `python3 tools/qa/check_demo.py {REL}{" --" + mode if mode != "default" else ""}` · {stamp} · **{"FAIL" if fails else "PASS"}** ({fails} fail, {warns} warn)', '',
                       '| gate | check | result | summary |', '|---|---|---|---|'] +
                      [f'| {g} | {cid} | {st} | {(s + (" — " + "; ".join(d[:3]) if d and st in ("FAIL", "WARN") else "")).replace("|", "/")} |' for g, cid, st, s, d in ROWS])
    cur = re.sub(r'<!-- qa:auto -->.*?<!-- /qa:auto -->', lambda m: f'<!-- qa:auto -->\n{table}\n<!-- /qa:auto -->', cur, flags=re.S)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(cur)
    print(f'checklist: {os.path.relpath(path, REPO) if path.startswith(REPO) else path}')
sys.exit(1 if fails else 0)
