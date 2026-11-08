#!/usr/bin/env python3
"""Field check of the demo menu (demos/shared/nav.js DEMOS, DEMO_DESIGN_GUIDE §7.3 2d). Exit 1 on any FAIL.

  python3 tools/web/check_nav.py            # table of problems + the displayed order
  python3 tools/web/check_nav.py --order    # only the displayed order (category → series → score → same character → number)

FAIL: a missing / unknown field (cat, dir, ja, en, zh, group = its category, cast), a folder without index.html, a series key that
SERIES does not name, a series spread over two categories, part numbers that are not 1…N without gaps / twice, a featured / new that is
not true, a HEAT key that is not in DEMOS. WARN: a demo folder with an index.html that is not in DEMOS (staging remakes are fine),
no menu thumbnail (assets/images/demos/<dir>.jpg), no thermal score yet (python3 tools/qa/thermal_score.py <demo>).
"""
import json, os, re, subprocess, sys
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CATS = ['all-ages', 'healing', 'for-men', 'for-women', 'nobunaga-suntory']
JS = r"""global.window = { MOHEAT_NAV_DATA_ONLY: true }; global.location = { search: '' }; global.document = { currentScript: null };
eval(require('fs').readFileSync(process.argv[1], 'utf8'));
console.log(JSON.stringify({ demos: window.MoHeatDemos.DEMOS, series: window.MoHeatOrder.SERIES, heat: window.MoHeatOrder.HEAT }));"""
r = subprocess.run(['node', '-e', JS, os.path.join(REPO, 'demos', 'shared', 'nav.js')], capture_output=True, text=True)
if r.returncode: sys.exit(f'nav.js did not evaluate: {r.stderr[-400:]}')
N = json.loads(r.stdout); D, SER, HEAT = N['demos'], N['series'], N['heat']
fail, warn = [], []
known = {'cat', 'dir', 'ja', 'en', 'zh', 'group', 'series', 'part', 'cast', 'featured', 'new'}
for d in D:
    n = d.get('dir', '?')
    for k in ('cat', 'dir', 'ja', 'en', 'zh', 'cast'):
        if not d.get(k): fail.append(f'{n}: no {k}')
    for k in set(d) - known: fail.append(f'{n}: unknown field {k}')
    if d.get('cat') not in CATS: fail.append(f'{n}: unknown cat {d.get("cat")}')
    elif d.get('group') != CATS.index(d['cat']): fail.append(f'{n}: group {d.get("group")} ≠ its category {d["cat"]} ({CATS.index(d["cat"])})')
    if not os.path.exists(os.path.join(REPO, 'demos', d.get('cat', ''), n, 'index.html')): fail.append(f'{n}: demos/{d.get("cat")}/{n}/index.html missing')
    if d.get('series') and d['series'] not in SER: fail.append(f'{n}: series {d["series"]} is not in SERIES')
    if 'part' in d and (not isinstance(d['part'], int) or not d.get('series')): fail.append(f'{n}: part needs an integer and a series')
    for k in ('featured', 'new'):
        if k in d and d[k] is not True: fail.append(f'{n}: {k} must be true (or left out)')
    if d.get('cast') and not re.fullmatch(r'[a-z0-9_]+(\+[a-z0-9_]+)*', d['cast']): fail.append(f'{n}: cast "{d["cast"]}" — lowercase keys joined by +')
    if not os.path.exists(os.path.join(REPO, 'assets', 'images', 'demos', f'{n}.jpg')): warn.append(f'{n}: no menu thumbnail assets/images/demos/{n}.jpg')
    if n not in HEAT: warn.append(f'{n}: no thermal score yet (python3 tools/qa/thermal_score.py demos/{d.get("cat")}/{n})')
for s in sorted({d['series'] for d in D if d.get('series')}):
    m = [d for d in D if d.get('series') == s]
    if len({d['cat'] for d in m}) > 1: fail.append(f'series {s}: spread over {sorted({d["cat"] for d in m})}')
    parts = sorted(d['part'] for d in m if isinstance(d.get('part'), int))
    if parts and parts != list(range(1, len(parts) + 1)): fail.append(f'series {s}: parts {parts} (want 1…{len(parts)}, each once)')
    if parts and len(parts) != len(m): fail.append(f'series {s}: some demos have a part, some not')
    idx = [D.index(d) for d in m]
    if idx != list(range(idx[0], idx[0] + len(idx))): fail.append(f'series {s}: not shown together (positions {[i + 1 for i in idx]})')
for k in HEAT:
    if k not in {d['dir'] for d in D}: fail.append(f'HEAT has {k}, not in DEMOS')
listed = {(d['cat'], d['dir']) for d in D}
for cat in CATS:
    for f in sorted(os.listdir(os.path.join(REPO, 'demos', cat))):
        if f.startswith('Demo') and os.path.exists(os.path.join(REPO, 'demos', cat, f, 'index.html')) and (cat, f) not in listed:
            warn.append(f'demos/{cat}/{f}: not in the menu (fine for a staging remake)')
if True:   # the displayed order, always
    print('displayed order:')
    for i, d in enumerate(D):
        print(f'  {i + 1:2d}  {d["dir"]:28} {d["cat"]:17} {d.get("series", ""):9} {str(d.get("part", "")):2} {d.get("cast", ""):22} 🌡 {HEAT.get(d["dir"], "–")}')
if '--order' in sys.argv: sys.exit(0)
for x in fail: print('FAIL', x)
for x in warn: print('WARN', x)
print(f'{"FAIL" if fail else "PASS"}: {len(fail)} fail, {len(warn)} warn, {len(D)} demos')
sys.exit(1 if fail else 0)
