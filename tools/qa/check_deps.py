#!/usr/bin/env python3
"""Site-wide dependency matrix: which demo loads what from OUTSIDE its own folder (docs/engine/2026-11-08_engine_plan.md §3.1,
DEMO_DESIGN_GUIDE §12 / §14 — user 2026-11-08: 「demo 之间不应该存在依附性」「同一个类别可以共享一个依赖」).

  python3 tools/qa/check_deps.py                 # matrix + every violation (exit 0)
  python3 tools/qa/check_deps.py --fail          # exit 1 on any runtime / link violation (pre-commit, CI)
  python3 tools/qa/check_deps.py --demo Demo16_FamilyCall2 [--demo …]   # only these folders
  python3 tools/qa/check_deps.py --json          # machine-readable
  python3 tools/qa/check_deps.py --scripts       # also list the build-time (B) references one by one

Allowed for a demo (demos/<cat>/DemoNN_X/): its own folder · demos/shared/** · its OWN category kit demos/<cat>/_kit/** ·
site root files (device.js, index.html, credits.html …) and assets/** (site images).
Forbidden (= violation):
  R  runtime: the page / its JS / CSS / media load a file from another demo folder or another category's _kit
  B! <base href> in a page (the whole page then comes from another folder)
  L  hard-coded link to another demo (<a href="../DemoNN_…/">, location = …): demo-to-demo navigation lives only in nav.js data
  S  a deployed symlink that leaves the demo folder (shared things go into the kit, they are not linked)
  K  a _kit file that references a demo folder or another category's kit (kit → shared only; dependencies go down: demo → kit → shared)
Reported, not a violation yet (P4 of the engine plan): B = build-time scripts (scripts/ project/ tools/) naming another demo.
Folders that are not in demos/shared/nav.js DEMOS (remake staging such as Demo34 / Demo35 before merge_remake.py) are listed but
never fail the run. Only deployable files count (git ls-files -co --exclude-standard: ignored assets / audio never reach the site).
"""
import argparse, json, os, re, subprocess, sys
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEMOS = os.path.join(REPO, 'demos')
BUILD = ('scripts', 'project', 'tools', 'assets', 'output')
RUNTIME_EXT = ('.html', '.js', '.css', '.json', '.webmanifest')

ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
ap.add_argument('--fail', action='store_true'); ap.add_argument('--json', action='store_true')
ap.add_argument('--demo', action='append', default=[]); ap.add_argument('--scripts', action='store_true')
A = ap.parse_args()

files = subprocess.run(['git', '-C', REPO, 'ls-files', '-co', '--exclude-standard', '--', 'demos'], capture_output=True, text=True).stdout.splitlines()
nav = open(os.path.join(DEMOS, 'shared', 'nav.js'), encoding='utf-8').read()
in_menu = set(re.findall(r"dir:\s*'([^']+)'", nav))


def owner(rel):
    """'demos/<cat>/<folder>/…' → (cat, folder) with folder = DemoNN_X | _kit | None (shared or other)."""
    p = rel.split('/')
    if len(p) >= 3 and p[0] == 'demos' and p[1] != 'shared': return p[1], p[2]
    return (None, None)


def classify(cat, folder, target_rel):
    """→ None (allowed) or (kind, target-folder)."""
    t = target_rel.split('/')
    if target_rel.startswith('..'): return ('R', 'outside the repo')
    if t[0] != 'demos': return None                                   # site root / assets
    if len(t) < 2 or t[1] == 'shared': return None
    if len(t) < 3: return ('R', '/'.join(t[:2]))
    tc, tf = t[1], t[2]
    if tc == cat and tf == folder: return None
    if tf == '_kit':
        if folder == '_kit': return None if tc == cat else ('K', f'{tc}/_kit')
        return None if tc == cat else ('R', f'{tc}/_kit')
    if not re.match(r'Demo\d{2}_', tf): return None if tc == cat or tf.startswith(('index', 'credits')) else ('R', f'{tc}/{tf}')
    if folder == '_kit': return ('K', f'{tc}/{tf}')
    return ('R', f'{tc}/{tf}')


STR = re.compile(r'''(?:src|href|poster|content)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)|["'`]((?:\.\./|\./|/demos/)[^"'`\s]*)["'`]''')
LINK = re.compile(r'''<a\b[^>]*\bhref\s*=\s*["']([^"']+)["']|location(?:\.href)?\s*=\s*["'`]([^"'`]+)|location\.(?:assign|replace)\(\s*["'`]([^"'`]+)''')


def strip_comments(t, ext):
    if ext == '.html': t = re.sub(r'<!--.*?-->', '', t, flags=re.S)
    t = re.sub(r'/\*.*?\*/', '', t, flags=re.S)
    return re.sub(r'(^|[\s;{}(])//[^\n]*', r'\1', t) if ext != '.html' or '<script' in t else t


rows = {}   # (cat, folder) → {'R': [...], 'L': [...], 'B!': [...], 'S': [...], 'K': [...], 'B': [...]}


def add(cat, folder, kind, msg):
    rows.setdefault((cat, folder), {}).setdefault(kind, []).append(msg)


for rel in files:
    cat, folder = owner(rel)
    if not folder or not (folder == '_kit' or re.match(r'Demo\d{2}_', folder)): continue
    if A.demo and folder not in A.demo: continue
    rows.setdefault((cat, folder), {})
    full = os.path.join(REPO, rel)
    if not os.path.lexists(full): continue   # deleted in the working tree (git ls-files -c still lists it)
    inner = rel.split('/')[3:]
    build = bool(inner) and inner[0] in BUILD
    if os.path.islink(full):
        tgt = os.path.realpath(full); root = os.path.join(DEMOS, cat, folder)
        if not tgt.startswith(root + os.sep) and not build:
            add(cat, folder, 'S', f'{"/".join(inner)} → {os.path.relpath(tgt, REPO)}')
        continue
    ext = os.path.splitext(rel)[1].lower()
    if build:
        if ext in ('.py', '.js', '.sh', '.mjs', '.json', '.command') and os.path.getsize(full) < 2e6:
            t = open(full, encoding='utf-8', errors='replace').read()
            for m in sorted(set(re.findall(r'Demo\d{2}_[A-Za-z0-9]+', t))):
                if m != folder: add(cat, folder, 'B', f'{"/".join(inner)}: {m}')
        continue
    if ext not in RUNTIME_EXT or os.path.getsize(full) > 3e6: continue
    t = strip_comments(open(full, encoding='utf-8', errors='replace').read(), ext)
    here = os.path.dirname(full)
    # base of relative paths: CSS url() → the CSS file; HTML → the page (or its <base>); JS strings → the page that loads it =
    # the demo folder (a kit file: a demo folder of that category; a page in live/ → live/)
    page_dir = os.path.join(DEMOS, cat, folder if folder != '_kit' else 'DemoXX_page')
    if ext == '.html':
        page_dir = here
        b = re.search(r'<base\s+href\s*=\s*["\']([^"\']+)["\']', t)
        if b:
            bt = os.path.relpath(os.path.normpath(os.path.join(here, b.group(1))), REPO)
            c = classify(cat, folder, bt + '/x')
            if c: add(cat, folder, 'B!', f'{"/".join(inner)}: <base href="{b.group(1)}"> → {c[1]}')   # a <base> inside its own folder (live/ → ../) is harmless
            page_dir = os.path.join(here, b.group(1))
    links = set()
    for m in LINK.finditer(t):
        s = next(g for g in m.groups() if g)
        if s.startswith(('http', '//', '#', 'mailto:', 'javascript:')): continue
        tgt = os.path.relpath(os.path.normpath(os.path.join(page_dir, s.split('?')[0].split('#')[0])), REPO)
        c = classify(cat, folder, tgt + '/x' if s.endswith('/') else tgt)
        if c: add(cat, folder, 'L', f'{"/".join(inner)}: {s}'); links.add(s)
    for m in STR.finditer(t):
        s = next((g for g in m.groups() if g), '')
        if m.group(1) and not re.search(r'/|\.[a-z0-9]{2,5}$', s.split('?')[0]): continue   # content="noindex", alt texts …
        if not s or s in links or s.startswith(('http', '//', 'data:', '#', 'mailto:', 'javascript:', 'blob:')) or '${' in s[:3]: continue
        base = here if (ext == '.css' and m.group(2)) else page_dir
        s0 = s.split('?')[0].split('#')[0]
        if s0.startswith('/demos/'): tgt = s0.lstrip('/')
        else: tgt = os.path.relpath(os.path.normpath(os.path.join(base, s0)), REPO)
        c = classify(cat, folder, tgt if not s0.endswith('/') else tgt + '/x')
        if c: add(cat, folder, c[0], f'{"/".join(inner)}: {s}')
    # runtime: a page that keeps a <base> loads everything from that folder — list what (resolved) for the plan
for k, v in rows.items():
    for kind in v: v[kind] = sorted(set(v[kind]))

VIOL = ('R', 'B!', 'L', 'S', 'K')


def targets(v):
    out = set()
    for kind in VIOL:
        for msg in v.get(kind, []):
            for m in re.findall(r'(?:\.\./)*(?:([\w-]+)/)?(Demo\d{2}_[A-Za-z0-9]+|_kit)/', msg):
                out.add(m[1] if m[1] != '_kit' else f'{m[0]}/_kit')
    return sorted(out)


report = []
for (cat, folder), v in sorted(rows.items(), key=lambda kv: (kv[0][0], kv[0][1])):
    staging = folder != '_kit' and folder not in in_menu
    n = {k: len(v.get(k, [])) for k in VIOL + ('B',)}
    bad = sum(n[k] for k in VIOL)
    report.append({'demo': f'{cat}/{folder}', 'staging': staging, 'violations': bad, 'counts': n, 'targets': [t for t in targets(v) if t != folder],
                   'details': {k: v[k] for k in v}})

fails = [r for r in report if r['violations'] and not r['staging']]
if A.json:
    print(json.dumps({'fail': len(fails), 'rows': report}, ensure_ascii=False, indent=1))
else:
    print(f'{"demo":46} {"R":>3} {"B!":>3} {"L":>3} {"S":>3} {"K":>3} {"B":>4}  depends on')
    for r in report:
        c = r['counts']
        if not (r['violations'] or c['B']) and not A.demo: continue
        tag = ' (staging)' if r['staging'] else ''
        print(f'{r["demo"] + tag:46} ' + ' '.join(f'{c[k] or "·":>3}' for k in VIOL) + f' {c["B"] or "·":>4}  {", ".join(r["targets"]) or "—"}')
    clean = [r['demo'] for r in report if not r['violations'] and r['demo'].split('/')[1] != '_kit']
    print(f'\nself-contained at runtime: {len(clean)} of {sum(1 for r in report if r["demo"].split("/")[1] != "_kit")} demo folders')
    for r in report:
        if not r['violations'] and not (A.scripts and r['counts']['B']): continue
        print(f'\n{r["demo"]}{" (staging — not counted)" if r["staging"] else ""}')
        for k in VIOL + (('B',) if A.scripts else ()):
            for msg in r['details'].get(k, []): print(f'  {k:2} {msg}')
    print(f'\n{"FAIL" if fails else "PASS"}: {len(fails)} demo folder(s) with runtime / link violations'
          + ('' if fails else ' — every demo loads only its own folder, demos/shared/ and its category _kit/')
          + '\n  R runtime load · B! <base href> · L hard link to another demo · S symlink out of the folder · K kit → demo / other kit · B build scripts (P4, not counted)')
sys.exit(1 if A.fail and fails else 0)
