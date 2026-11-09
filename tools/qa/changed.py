#!/usr/bin/env python3
"""QA auto-scoping: which demos and which QA areas changed since a commit (user 2026-11-08 提效标准「测试按改动自动派」).

  python3 tools/qa/changed.py <since-commit> [--worktree] [--json]
  python3 tools/qa/changed.py HEAD~5                 # e.g. what the last 5 commits touched
  python3 tools/qa/changed.py origin/main --worktree # everything not pushed yet, plus uncommitted edits
  python3 tools/qa/changed.py HEAD~5 --run [--quick | --full] [--all] [--secs N]   # RUN check_demo on the affected demos, one at a time

For the coordinator: prints per demo the areas to test (art / mouth / thermal / ui / mobile), the tester roles of
tools/qa/QA_TEAM_BRIEF.md to send, and the check commands. A change in demos/shared/<file> or a category _kit counts for every demo
whose page (or its code) loads that file; device.js counts as thermal for all demos.
--run (user 2026-11-09, machine overload): a change to demos/shared or device.js touches nearly every demo, so it runs only a small representative
set (REPRESENTATIVE, one per family) unless --all is given; what was left out is printed, never dropped silently. Demo and _kit changes run exactly the demos they touch.
Exit code: 1 any FAIL, 75 any BUSY (machine busy, retry), else 0.
"""
import argparse, glob, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REPRESENTATIVE = ('Demo01', 'Demo10', 'Demo14', 'Demo22', 'Demo23')   # film, game, stream room, layered story, AI talk
AREAS = ('art', 'mouth', 'thermal', 'ui', 'mobile')
ROLES = {'art': 'QA-画面', 'mouth': 'QA-画面', 'thermal': 'QA-冷热', 'ui': 'QA-功能 + QA-电脑', 'mobile': 'QA-手机 + QA-平板'}
CMDS = {'art': 'python3 tools/art/check_cut_body.py {d}; python3 tools/art/check_patches.py {d}; node tools/art/check_motion.js {d} 60 --shots',
        'mouth': 'node tools/art/check_mouth.js {d} --shots (+ --alt)',
        'thermal': 'python3 tools/qa/check_demo.py {d}   # G6 thermal row (#cmd)',
        'ui': 'python3 tools/qa/check_demo.py {d}   # runtime / l10n-live / end / shell / cover',
        'mobile': 'tools/web/check_mobile.html + python3 tools/qa/check_demo.py {d}   # mobile / drag rows; iOS Simulator'}


def areas_of(path):
    """QA areas a changed file can break."""
    p, b = path.lower(), os.path.basename(path.lower())
    a = set()
    if re.search(r'mouth|lp_mouths|check_mouth|check_patches|face_patches', p) or b == 'layers.js': a.add('mouth')
    if re.search(r'/media/art/|/art/|stage\.json|layers\.js|build_stage|cover\.jpg|\.(webp|png|jpe?g)$', p): a.add('art')
    if re.search(r'thermal|\.csv$|device\.js|audio\.js|/voice/|\.m4a$|\.mp3$|interact\.js|dual', p): a.add('thermal')
    if re.search(r'\.(html|css)$|nav\.js|shell\.js|subs\.js|l10n|voice\.js|cover\.js|lines\.js|main\.js|scripted\.js|interact\.js', p): a.add('ui')
    if re.search(r'\.css$|index\.html$|nav\.js|shell\.js|gesture\.js|cover\.js|check_mobile', p): a.add('mobile')
    if p.endswith('.js') and not a: a.update({'ui', 'thermal'})   # unknown page code: story / interactions / output
    return a


def users_of(rel_file):
    """Demo folders whose index.html or own code references rel_file (shared / kit file)."""
    name, out = os.path.basename(rel_file), set()
    for page in glob.glob(os.path.join(ROOT, 'demos', '*', 'Demo*', 'index.html')):
        d = os.path.dirname(page)
        texts = [open(page, encoding='utf-8', errors='ignore').read()]
        for js in glob.glob(os.path.join(d, '*.js')) + glob.glob(os.path.join(d, 'media', '*.js')):
            texts.append(open(js, encoding='utf-8', errors='ignore').read())
        for t in texts:
            for ref in re.findall(r'''['"(]([^'"()\s]*''' + re.escape(name) + r''')(?:\?[^'")]*)?['")]''', t):
                if os.path.normpath(os.path.join(d, ref)) == os.path.join(ROOT, rel_file): out.add(os.path.relpath(d, ROOT)); break
    if rel_file.startswith('demos/') and '/_kit/' in rel_file and not out:   # kit files loaded through other kit code
        cat = rel_file.split('/')[1]
        out = {os.path.relpath(os.path.dirname(p), ROOT) for p in glob.glob(os.path.join(ROOT, 'demos', cat, 'Demo*', 'index.html'))
               if '_kit/' in open(p, encoding='utf-8', errors='ignore').read()}
    return out


def changed_files(since, worktree):
    files = subprocess.run(['git', 'diff', '--name-only', f'{since}..HEAD'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.split('\n')
    if worktree:
        files += subprocess.run(['git', 'diff', '--name-only', 'HEAD'], cwd=ROOT, capture_output=True, text=True).stdout.split('\n')
        files += subprocess.run(['git', 'ls-files', '--others', '--exclude-standard', 'demos'], cwd=ROOT, capture_output=True, text=True).stdout.split('\n')
    return sorted({f for f in files if f})


def representatives(demos):
    """The representative demos among `demos` (a shared file none of them loads: its first user, so it is never left untested)."""
    pick = {d for d in demos if os.path.basename(d).split('_')[0] in REPRESENTATIVE}
    return pick or set(sorted(demos)[:1])


def run_checks(since, targets, wide, a):
    """targets = what the change really touches, wide = the part of it that came from demos/shared or device.js"""
    exact = targets - wide
    chosen = sorted(exact | (wide if a.all else representatives(wide)))
    chosen = [d for d in chosen if os.path.exists(os.path.join(ROOT, d, 'index.html'))]
    left = sorted(set(targets) - set(chosen))
    mode = ['--quick'] if a.quick else ['--full'] if a.full else []
    print(f'{len(chosen)} demo(s) to check since {since}: {", ".join(os.path.basename(d) for d in chosen) or "none"}', flush=True)
    if left: print(f'left out: {len(left)} demo(s) using only the changed shared code, covered by the representatives (--all runs them too)', flush=True)
    res = {}
    for d in chosen:
        print(f'\n=== {d}', flush=True)
        res[d] = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'qa', 'check_demo.py'), d, *mode, *(['--secs', str(a.secs)] if a.secs else [])], cwd=ROOT).returncode
    fails = [d for d, c in res.items() if c not in (0, 75)]; busy = [d for d, c in res.items() if c == 75]
    print(f'\nchecked {len(res)}: {len(res) - len(fails) - len(busy)} pass, {len(fails)} FAIL, {len(busy)} BUSY (machine busy, retry)' + ''.join(f'\n  FAIL {d}' for d in fails) + ''.join(f'\n  BUSY {d}' for d in busy))
    return 1 if fails else 75 if busy else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('since'); ap.add_argument('--worktree', action='store_true'); ap.add_argument('--json', action='store_true')
    ap.add_argument('--run', action='store_true'); ap.add_argument('--all', action='store_true'); ap.add_argument('--quick', action='store_true'); ap.add_argument('--full', action='store_true'); ap.add_argument('--secs', type=int)
    a = ap.parse_args()
    per, why, exact = {}, {}, set()
    for f in changed_files(a.since, a.worktree):
        m = re.match(r'(demos/[^/]+/Demo\d+_[^/]+)/', f)
        targets = {m.group(1)} if m else set()
        if f.startswith('demos/shared/') or '/_kit/' in f: targets = users_of(f)
        elif f == 'device.js': targets = {os.path.relpath(os.path.dirname(p), ROOT) for p in glob.glob(os.path.join(ROOT, 'demos', '*', 'Demo*', 'index.html'))}
        is_wide = f == 'device.js' or f.startswith('demos/shared/')
        ar = areas_of(f) if f != 'device.js' else {'thermal'}
        if m and re.search(r'/(project|assets|scripts|audio)/', f) and not f.endswith('stage.json'):
            ar = ar & {'art', 'mouth'} if '/assets/' in f else set()   # production files: no page change by themselves
        for d in targets:
            if not ar: continue
            per.setdefault(d, set()).update(ar); why.setdefault(d, set()).add(f)
            if not is_wide: exact.add(d)
    if a.run: sys.exit(run_checks(a.since, set(per), set(per) - exact, a))
    if a.json:
        print(json.dumps({d: {'areas': sorted(per[d]), 'files': sorted(why[d])} for d in sorted(per)}, ensure_ascii=False, indent=1)); return
    if not per: print(f'no demo-facing change since {a.since}'); return
    roles = {}
    for d in sorted(per):
        ar = [x for x in AREAS if x in per[d]]
        fs = sorted(why[d]); print(f'{d}: {" / ".join(ar)}   ← {", ".join(fs[:4])}{f" … +{len(fs) - 4}" if len(fs) > 4 else ""}')
        for x in ar: roles.setdefault(ROLES[x], set()).add(d)
    print('\ndispatch (tools/qa/QA_TEAM_BRIEF.md, max 2 browsers at once):')
    for r, ds in roles.items(): print(f'  {r}: {len(ds)} demo(s) — {", ".join(sorted(os.path.basename(x) for x in ds))}')
    print('\nchecks per area:')
    for x in AREAS:
        if any(x in v for v in per.values()): print(f'  {x}: ' + CMDS[x].format(d='<demo>'))


if __name__ == '__main__':
    main()
