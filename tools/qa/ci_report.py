#!/usr/bin/env python3
"""CI half of the QA gates (.github/workflows/qa.yml; user 2026-11-08 提效标准「推送时自动检查」). Informative only: always exits 0,
so a red check never blocks GitHub Pages (Pages builds on its own); problems show as annotations + the job summary.

  python3 tools/qa/ci_report.py <since-commit>        # check_deps --fail + check_demo --quick on the demos changed since <since>
  python3 tools/qa/ci_report.py <since> --all         # every demo (slow: ~30 s each)

Locally it prints the same report (annotations are plain lines outside GitHub Actions).
Note: assets/ (raw art) is not in git, so G4 rows that need it may differ in CI from a local run — the local check_demo is the gate.
"""
import json, os, subprocess, sys, glob

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GH = os.environ.get('GITHUB_ACTIONS') == 'true'
summary = []


def note(level, msg, file=None):
    msg = msg.replace('\n', ' ').replace('%', '%25')
    print(f'::{level}' + (f' file={file}' if file else '') + f'::{msg}' if GH else f'[{level}] {(file + ": ") if file else ""}{msg}')


def run(*cmd):
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)


def main():
    a = sys.argv[1:]
    since = next((x for x in a if not x.startswith('--')), 'HEAD~1')
    if run('git', 'rev-parse', '--verify', '-q', since + '^{commit}').returncode: since = 'HEAD~1'
    # 1. dependency rule (DEMO_DESIGN_GUIDE §12.1)
    r = run(sys.executable, 'tools/qa/check_deps.py', '--fail')
    summary.append('## check_deps --fail\n\n' + ('✅ no runtime violations' if r.returncode == 0 else '❌ runtime dependency violations') + '\n')
    if r.returncode:
        for ln in r.stdout.splitlines()[-30:]:
            if ln.strip(): note('error', 'check_deps: ' + ln.strip())
    # 2. changed demos
    if '--all' in a:
        demos = sorted(os.path.relpath(os.path.dirname(p), ROOT) for p in glob.glob(os.path.join(ROOT, 'demos', '*', 'Demo*', 'index.html')))
        why = {d: ['--all'] for d in demos}
    else:
        c = run(sys.executable, 'tools/qa/changed.py', since, '--json')
        try: ch = json.loads(c.stdout or '{}')
        except ValueError: ch = {}
        demos, why = sorted(ch), {d: v['areas'] for d, v in ch.items()}
    summary.append(f'## check_demo --quick ({len(demos)} changed demo(s) since `{since[:12]}`)\n')
    if demos: summary.append('| demo | areas | FAIL | WARN | failing rows |\n|---|---|---:|---:|---|')
    tot_f = 0
    for d in demos:
        r = run(sys.executable, 'tools/qa/check_demo.py', d, '--quick', '--json')
        try: res = json.loads(r.stdout)
        except ValueError:
            note('warning', f'check_demo gave no JSON: {r.stderr.strip()[-200:]}', d + '/index.html'); continue
        bad = [x for x in res['rows'] if x['status'] == 'FAIL']
        tot_f += len(bad)
        for x in res['rows']:
            if x['status'] in ('FAIL', 'WARN'):
                note('error' if x['status'] == 'FAIL' else 'warning', f'{x["gate"]} {x["id"]}: {x["summary"]}' + (' · ' + ' · '.join(map(str, x['details'][:3])) if x['details'] else ''), d + '/index.html')
        summary.append(f'| {d} | {" / ".join(why.get(d, []))} | {res["fail"]} | {res["warn"]} | {", ".join(x["gate"] + " " + x["id"] for x in bad)} |')
    summary.append(f'\n{tot_f} FAIL row(s). Informative: Pages deploys regardless; fix FAILs before the next release (DEMO_DESIGN_GUIDE §6 制作流程 v2).')
    text = '\n'.join(summary) + '\n'
    if os.environ.get('GITHUB_STEP_SUMMARY'):
        open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(text)
    else:
        print('\n' + text)
    return 0


if __name__ == '__main__':
    sys.exit(main())
