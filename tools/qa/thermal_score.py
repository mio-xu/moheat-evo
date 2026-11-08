#!/usr/bin/env python3
"""Thermal-use score of a demo (0–100): how fully it uses MoHeat Evo's thermal feedback (user 2026-11-08: 推荐度 = 冷热反馈用得多充分).
It decides the menu's "Try these first" (top 3) and breaks ties in the menu order (demos/shared/nav.js, DEMO_DESIGN_GUIDE §7.3 2d).

  python3 tools/qa/thermal_score.py demos/<cat>/<DemoNN_Name> [...]     # one pure-mode run each (tools/web/check_shell.js --record)
  python3 tools/qa/thermal_score.py --all [--jobs 2]                     # every demo in nav.js DEMOS (2 Chromes at a time)
  python3 tools/qa/thermal_score.py --write-nav                          # only copy tools/qa/thermal_scores.json into nav.js HEAT
  check_demo.py --full updates the demo's entry too (from its own ?auto playthrough) — then run --write-nav.

The run is the real "just listen" experience (pure mode, zero input, real speed) with the #cmd thermal text sampled every 100 ms.
Score = 100 × weighted sum of six parts, each 0–1 (time-weighted over the run, a sample holds until the next, ≤ 2 s):
  active   0.25  share of the time with any output (any channel > 5 %)                    → min(1, share / 0.6)
  switch   0.15  fast hot↔cold switches on one ear (≤ 3 s apart)                          → min(1, count / 4)
  dual     0.15  same ear cool + warm at once (DUAL)                                        → min(1, share / 0.15)
  lr       0.15  clear left / right contrast (|L − R| > 25 % on heat or cool)              → min(1, share / 0.3)
  range    0.15  intensity range: (peak heat + peak cool) / 2, × the 10–90 % spread of the strongest channel (≥ 0.4 counts full)
  variety  0.15  distinct thermal states (each channel in 4 levels) — the number of different sources / mixes → min(1, n / 16)
Heat is 0–200 (H200 = 100 %), cool 35–80 (C35 = 0 %, C80 = 100 %), as the device commands.
"""
import json, os, re, subprocess, sys, datetime, threading
from concurrent.futures import ThreadPoolExecutor
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(REPO, 'tools', 'qa', 'thermal_scores.json')
NAV = os.path.join(REPO, 'demos', 'shared', 'nav.js')
W = {'active': .25, 'switch': .15, 'dual': .15, 'lr': .15, 'range': .15, 'variety': .15}


def parse(cmds):
    H = lambda x: min(1, x / 200); C = lambda x: max(0, x - 35) / 45 if x else 0
    pts = []
    for t, c in cmds:
        v = {k: int(n) for k, n in re.findall(r'\b([LR][CH])(\d+)', c)}
        stop = c.strip().lower() == 'stop' or not v
        pts.append((float(t), 0 if stop else C(v.get('LC', 0)), 0 if stop else H(v.get('LH', 0)), 0 if stop else C(v.get('RC', 0)), 0 if stop else H(v.get('RH', 0))))
    return pts


def score(cmds, secs=None):
    """→ (score 0–100, parts {name: 0–1}) from a [[t, cmd], …] stream."""
    pts = parse(cmds)
    if not pts: return 0, {k: 0 for k in W}
    end = max(secs or 0, pts[-1][0] + 1)
    dur = lambda i: min(2.0, (pts[i + 1][0] if i + 1 < len(pts) else end) - pts[i][0])
    T = sum(dur(i) for i in range(len(pts))) or 1
    share = lambda f: sum(dur(i) for i, p in enumerate(pts) if f(p)) / T
    act = share(lambda p: max(p[1:]) > .05)
    dual = share(lambda p: (p[1] > .05 and p[2] > .05) or (p[3] > .05 and p[4] > .05))
    lr = share(lambda p: abs(p[2] - p[4]) > .25 or abs(p[1] - p[3]) > .25)
    n_sw = 0
    for ci, hi in ((1, 2), (3, 4)):
        last = None
        for p in pts:
            st = 'hot' if p[hi] > .3 and p[ci] < .2 else 'cold' if p[ci] > .3 and p[hi] < .15 else None
            if st and last and st != last[0] and p[0] - last[1] <= 3: n_sw += 1
            if st: last = (st, p[0])
    peak_h, peak_c = max(max(p[2], p[4]) for p in pts), max(max(p[1], p[3]) for p in pts)
    strong = sorted(max(p[1:]) for p in pts if max(p[1:]) > .02)
    spread = (strong[int(len(strong) * .9) - 1] - strong[int(len(strong) * .1)]) if len(strong) > 4 else 0
    states = {tuple(min(3, int(x * 4)) for x in p[1:]) for p in pts if max(p[1:]) > .05}
    parts = {'active': min(1, act / .6), 'switch': min(1, n_sw / 4), 'dual': min(1, dual / .15), 'lr': min(1, lr / .3),
             'range': (peak_h + peak_c) / 2 * min(1, spread / .4), 'variety': min(1, len(states) / 16)}
    return round(100 * sum(W[k] * v for k, v in parts.items())), {k: round(v, 2) for k, v in parts.items()}


def load():
    try: return json.load(open(OUT, encoding='utf-8'))
    except Exception: return {}


def save(db):
    tmp = OUT + '.tmp'
    json.dump(dict(sorted(db.items())), open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); os.replace(tmp, OUT)


LOCK = threading.Lock()


def update(dir_name, cmds, secs, how):
    s, parts = score(cmds, secs)
    with LOCK:
        db = load(); db[dir_name] = {'score': s, 'parts': parts, 'secs': secs, 'how': how, 'date': datetime.date.today().isoformat()}; save(db)
    return s, parts


def write_nav():
    """nav.js keeps the scores on ONE line (`const HEAT = {...};`) so the menu can sort without a request."""
    db = load(); src = open(NAV, encoding='utf-8').read()
    line = 'const HEAT = ' + json.dumps({k: v['score'] for k, v in sorted(db.items())}, separators=(',', ':')) + ';'
    new, n = re.subn(r'const HEAT = \{[^\n]*?\};', line, src, count=1)
    if not n: raise SystemExit('nav.js has no `const HEAT = {…};` line')
    if new != src:
        tmp = NAV + '.tmp'; open(tmp, 'w', encoding='utf-8').write(new); os.replace(tmp, NAV)
    print(f'nav.js HEAT: {len(db)} demos')


def run(demo, secs):
    r = subprocess.run(['node', os.path.join(REPO, 'tools', 'web', 'check_shell.js'), demo, '--record', '--secs', str(secs)], capture_output=True, text=True)
    try: res = json.loads(r.stdout.strip().splitlines()[-1])
    except Exception: return demo, None, r.stderr[-300:]
    s, parts = update(os.path.basename(demo.rstrip('/')), res.get('cmds', []), res.get('secs'), 'pure run' + ('' if res.get('pureEnded') else ' (did not end)'))
    return demo, (s, parts, res.get('pureEnded'), res.get('secs')), ''


def all_demos():
    src = open(NAV, encoding='utf-8').read()
    return [f'demos/{c}/{d}' for c, d in re.findall(r"cat: '([^']+)', dir: '([^']+)'", src)]


if __name__ == '__main__':
    a = sys.argv[1:]
    if '--write-nav' in a and len(a) == 1: write_nav(); sys.exit(0)
    jobs = int(a[a.index('--jobs') + 1]) if '--jobs' in a else 2
    secs = int(a[a.index('--secs') + 1]) if '--secs' in a else 420
    demos = all_demos() if '--all' in a else [x for i, x in enumerate(a) if not x.startswith('--') and a[i - 1] not in ('--jobs', '--secs')]
    with ThreadPoolExecutor(max_workers=min(2, jobs)) as ex:   # at most 2 Chromes (shared machine)
        for demo, res, err in ex.map(lambda d: run(d, secs), demos):
            if res: print(f'{res[0]:3d}  {demo}  {res[1]}{"" if res[2] else "  (did not end)"}', flush=True)
            else: print(f'  ?  {demo}  no result {err}', flush=True)
    write_nav()
