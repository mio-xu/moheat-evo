#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Cloud half of the full QA gate (.github/workflows/qa-full.yml, manual; user 2026-11-09: run the full gate on GitHub's machines, not on this computer).

  python3 tools/qa/ci_full.py --list all | Demo10,Demo22      # JSON list of demo folders (for the job matrix)
  python3 tools/qa/ci_full.py --run <demo folder or DemoNN> --out DIR
  python3 tools/qa/ci_full.py --summary DIR                   # DIR/summary.md + summary.json from every DIR/**/Demo*.json

Honest about what the cloud cannot do: those checks are SKIP-cloud, which counts as neither pass nor fail:
  · every G4 art row and G8 hygiene (raw art in assets/ is git-ignored, not on this machine);
  · a failed row whose only cause is requests for git-ignored files (large media kept out of git);
  · always, for every demo: WebKit / Safari, a real microphone, the real MoHeat device.
A PASS here means: nothing failed among the checks that could run. It does not replace WebKit, mic or device testing.
Exit 0 whenever a report was written: results live in the report, not in the job colour.
"""
import glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
NEVER = [('G6', 'webkit', 'WebKit / Safari and iOS paths need Apple devices'), ('G6', 'mic', 'no microphone on the runner: voice answers are not exercised'),
         ('G6', 'device-hw', 'no MoHeat hardware: nothing reaches a real serial device')]


def resolve(x):
    if os.path.isdir(os.path.join(ROOT, x)): return x.rstrip('/')
    hits = sorted(os.path.relpath(os.path.dirname(p), ROOT) for p in glob.glob(os.path.join(ROOT, 'demos', '*', os.path.basename(x) + '*', 'index.html')))
    if len(hits) != 1: sys.exit(f'{x}: {len(hits)} matching demos')
    return hits[0]


def all_demos(): return sorted(os.path.relpath(os.path.dirname(p), ROOT) for p in glob.glob(os.path.join(ROOT, 'demos', '*', 'Demo*', 'index.html')))


def ignored(path): return subprocess.run(['git', 'check-ignore', '-q', path], cwd=ROOT).returncode == 0


def only_ignored(details):
    """True when every detail line is a failed request for a git-ignored file"""
    reqs = [re.search(r'request: .*?(demos/[^\s?"]+)', d) for d in details]
    return bool(reqs) and all(reqs) and all(ignored(m[1]) for m in reqs)


def cloud_view(rep):
    rows = []
    for r in rep['rows']:
        r = dict(r)
        if r['gate'] == 'G4' or r['id'] == 'hygiene': r.update(status='SKIP-cloud', summary='raw art (assets/) is git-ignored, not on this machine; was: ' + r['status'] + ' · ' + r['summary'])
        elif r['status'] in ('FAIL', 'WARN') and only_ignored(r.get('details') or []): r.update(status='SKIP-cloud', summary=f'only requests for git-ignored media failed ({len(r["details"])}); same 404 on the public site if the page needs them')
        rows.append(r)
    rows += [dict(gate=g, id=i, status='SKIP-cloud', summary=s, details=[]) for g, i, s in NEVER]
    return rows


def run(demo, out):
    d = resolve(demo); name = os.path.basename(d); os.makedirs(out, exist_ok=True)
    p = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'qa', 'check_demo.py'), d, '--full', '--json'], cwd=ROOT, capture_output=True, text=True, timeout=int(os.environ.get('MOHEAT_CI_DEMO_SEC') or 4800))
    try: rep = json.loads(p.stdout)
    except ValueError: rep = {'demo': d, 'error': f'check_demo gave no report, exit {p.returncode}: ' + p.stderr.strip()[-600:], 'rows': []}
    rep['exit'] = p.returncode; rep['rows'] = cloud_view(rep)
    for k in ('FAIL', 'WARN', 'BUSY'): rep[k.lower()] = sum(r['status'] == k for r in rep['rows'])
    rep['verdict'] = 'ERROR' if rep.get('error') else 'FAIL' if rep['fail'] else 'BUSY' if rep['busy'] else 'PASS (checks that could run)'
    json.dump(rep, open(os.path.join(out, name + '.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(name, rep['verdict'], {k: rep[k] for k in ('fail', 'warn', 'busy')})


def summary(out):
    reps = sorted((json.load(open(f, encoding='utf-8')) for f in glob.glob(os.path.join(out, '**', 'Demo*.json'), recursive=True)), key=lambda r: r['demo'])
    L = ['# QA full (cloud)', '', '`SKIP-cloud` is neither pass nor fail: raw art, git-ignored media, WebKit, microphone and the real device were not tested here.', '',
         '| demo | verdict | fail | busy | warn | skipped |', '|---|---|---|---|---|---|']
    for r in reps: L.append(f'| {r["demo"]} | {r["verdict"]} | {r.get("fail", "-")} | {r.get("busy", "-")} | {r.get("warn", "-")} | {sum(x["status"] == "SKIP-cloud" for x in r["rows"])} |')
    for r in reps:
        bad = [x for x in r['rows'] if x['status'] in ('FAIL', 'BUSY')]
        if r.get('error'): L += ['', f'## {r["demo"]}', '', r['error']]
        elif bad: L += ['', f'## {r["demo"]}', ''] + [f'- **{x["status"]}** {x["gate"]} {x["id"]}: {x["summary"]}' + ''.join(f'\n  - {d}' for d in (x.get('details') or [])[:8]) for x in bad]
    open(os.path.join(out, 'summary.md'), 'w', encoding='utf-8').write('\n'.join(L) + '\n')
    json.dump([{k: r.get(k) for k in ('demo', 'verdict', 'fail', 'busy', 'warn', 'exit')} for r in reps], open(os.path.join(out, 'summary.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('\n'.join(L))


def main():
    a = sys.argv[1:]
    out = a[a.index('--out') + 1] if '--out' in a else 'qa-full-out'
    if a[:1] == ['--list']: print(json.dumps(all_demos() if a[1].strip() in ('', 'all') else [resolve(x.strip()) for x in a[1].split(',') if x.strip()]))
    elif a[:1] == ['--run']: run(a[1], out)
    elif a[:1] == ['--summary']: summary(a[1])
    else: print(__doc__); return 2


if __name__ == '__main__':
    sys.exit(main())
