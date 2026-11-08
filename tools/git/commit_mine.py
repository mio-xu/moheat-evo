#!/usr/bin/env python3
"""Commit ONLY your own paths / hunks on the shared main (DEMO_DESIGN_GUIDE §6 制作流程 v2 G7, §14; user 2026-11-08 提效标准).

Several sessions share one working tree AND one index: a bare `git commit` takes whatever the others staged. This tool never touches
the shared index for the commit itself: it builds the commit in a private temp index (GIT_INDEX_FILE, unique per call) started from
HEAD, adds only what you name, and moves HEAD forward with an old-value check (`update-ref HEAD <new> <old>`), so it can never take
someone else's staged files and never moves HEAD backwards.

  python3 tools/git/commit_mine.py "<message>" <path> [<path> …]          # whole files / folders as they are on disk (deleted = removed)
  python3 tools/git/commit_mine.py "<message>" --hunks <path> <regex>     # only the hunks of `git diff HEAD -- <path>` whose text matches
  python3 tools/git/commit_mine.py "<message>" --patch my.diff            # a patch against HEAD (e.g. `git diff HEAD -- f > my.diff`, edited)
  python3 tools/git/commit_mine.py -F msg.txt <paths…>                    # message from a file
  MOHEAT_AGENT=<id>: warn when a path is claimed by another agent (tools/git/claim.py, docs/CLAIMS.md)
  options: --dry (show what would go in, commit nothing) · --force-add (add ignored files) · --no-trailer

  --hunks / --patch / paths can be mixed and repeated. Paths may hold spaces (quote them in zsh: "demos/x/My file.md").
  The message gets the Co-Authored-By trailer from $COMMIT_TRAILER if set (or pass it in the message yourself).
After the commit: the shared index entry of every committed path is moved to the new blob ONLY if nobody had staged a different version
(so `git status` does not show a phantom "staged revert"); then `git show --stat HEAD` is printed. Empty commits are refused (exit 3).
If HEAD moved while building (another session committed), it rebuilds on the new HEAD (3 tries).
"""
import argparse, os, re, subprocess, sys, tempfile, uuid

ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()


def git(*a, env=None, inp=None, check=True):
    r = subprocess.run(['git', *a], cwd=ROOT, env=env, input=inp, capture_output=True, text=True)
    if check and r.returncode:
        raise SystemExit(f'git {" ".join(a[:3])} … failed: {r.stderr.strip()[:400]}')
    return r.stdout


def rel(p):
    """Repo-relative path: relative to the caller's cwd if it exists there, else to the repo root (deleted files too)."""
    ap = os.path.abspath(p)
    if not os.path.lexists(ap) and not os.path.isabs(p): ap = os.path.abspath(os.path.join(ROOT, p))
    r = os.path.relpath(ap, ROOT)
    if r.startswith('..'): raise SystemExit(f'{p}: outside the repo')
    return r


def hunks_of(path, pattern):
    """`git diff HEAD -- path` split into header + hunks; keep the hunks whose +/- lines match the regex."""
    d = git('diff', '--no-color', '--no-ext-diff', 'HEAD', '--', path)
    if not d: return '', 0, 0
    head, hs, cur = [], [], None
    for ln in d.splitlines(keepends=True):
        if ln.startswith('@@'):
            cur = [ln]; hs.append(cur)
        elif cur is None: head.append(ln)
        else: cur.append(ln)
    rx = re.compile(pattern)
    keep = [h for h in hs if any(rx.search(l[1:]) for l in h[1:] if l[:1] in '+-')]
    return (''.join(head) + ''.join(''.join(h) for h in keep)) if keep else '', len(keep), len(hs)


def build(old, a, env):
    git('read-tree', old, env=env)
    notes = []
    for p in a.paths:
        if os.path.lexists(os.path.join(ROOT, p)):
            git('add', *(['-f'] if a.force_add else []), '-A', '--', p, env=env)
        else:
            git('rm', '--cached', '-r', '-q', '--ignore-unmatch', '--', p, env=env)
    for path, pat in a.hunks:
        patch, k, n = hunks_of(path, pat)
        notes.append(f'{path}: {k} of {n} hunk(s) match /{pat}/')
        if patch: git('apply', '--cached', '--recount', '--whitespace=nowarn', env=env, inp=patch)
    for pf in a.patch:
        git('apply', '--cached', '--recount', '--whitespace=nowarn', env=env, inp=open(pf).read())
        notes.append(f'patch {pf} applied')
    return git('write-tree', env=env).strip(), notes


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('message', nargs='?')
    ap.add_argument('paths', nargs='*')
    ap.add_argument('-F', dest='msgfile')
    ap.add_argument('--hunks', nargs=2, action='append', default=[], metavar=('PATH', 'REGEX'))
    ap.add_argument('--patch', action='append', default=[])
    ap.add_argument('--dry', action='store_true'); ap.add_argument('--force-add', action='store_true'); ap.add_argument('--no-trailer', action='store_true')
    a = ap.parse_args()
    if a.msgfile:
        if a.message: a.paths.insert(0, a.message)
        a.message = open(a.msgfile).read()
    if not a.message or not a.message.strip(): raise SystemExit('a commit message is required')
    if not (a.paths or a.hunks or a.patch): raise SystemExit('name the paths (or --hunks / --patch) to commit — never everything')
    a.paths = [rel(p) for p in a.paths]
    a.hunks = [(rel(p), r) for p, r in a.hunks]
    a.patch = [os.path.abspath(p) for p in a.patch]
    msg = a.message.rstrip() + '\n'
    tr = os.environ.get('COMMIT_TRAILER')
    if tr and not a.no_trailer and tr.strip() not in msg: msg += '\n' + tr.strip() + '\n'

    agent = os.environ.get('MOHEAT_AGENT')
    if agent:  # docs/CLAIMS.md: warn before committing a path another agent claimed
        r = subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'git', 'claim.py'), 'check', agent, *a.paths, *[h[0] for h in a.hunks]], capture_output=True, text=True)
        if r.returncode: print(r.stdout.rstrip() + '\n  (committing anyway: you named these paths yourself — tell that agent)')
    gitdir = git('rev-parse', '--absolute-git-dir').strip()
    idx = os.path.join(gitdir, f'index.mine.{os.getpid()}.{uuid.uuid4().hex[:8]}')
    env = dict(os.environ, GIT_INDEX_FILE=idx)
    try:
        for attempt in range(3):
            old = git('rev-parse', 'HEAD').strip()
            tree, notes = build(old, a, env)
            for n in notes: print('·', n)
            changed = git('diff-tree', '-r', '--name-status', '--no-renames', old, tree, env=env)
            if not changed.strip():
                print('nothing to commit: the named paths / hunks equal HEAD (empty commit refused)'); sys.exit(3)
            print(changed.rstrip())
            if a.dry: print('(dry run: nothing committed)'); return
            new = git('commit-tree', tree, '-p', old, inp=msg).strip()
            r = subprocess.run(['git', 'update-ref', '-m', 'commit_mine: ' + msg.splitlines()[0][:80], 'HEAD', new, old], cwd=ROOT, capture_output=True, text=True)
            if r.returncode == 0: break
            print(f'HEAD moved while building (another session committed) — rebuilding on the new HEAD ({attempt + 1}/3)')
        else:
            raise SystemExit('HEAD kept moving; nothing committed')
        # keep the shared index in step for the committed paths, unless someone staged a different version there
        for ln in changed.splitlines():
            st, p = ln.split('\t', 1)
            cur = git('ls-files', '-s', '--', p).split()
            oldb = git('ls-tree', old, '--', p).split()
            if (cur[1] if cur else None) != (oldb[2] if oldb else None):
                print(f'  note: {p} has a different version staged by someone else in the shared index — left alone'); continue
            newb = git('ls-tree', new, '--', p).split()
            if newb: git('update-index', '--add', '--cacheinfo', f'{newb[0]},{newb[2]},{p}')
            else: git('update-index', '--force-remove', '--', p)
        print(git('show', '--stat', '--format=%h %s', 'HEAD'))
    finally:
        for f in (idx, idx + '.lock'):
            try: os.remove(f)
            except FileNotFoundError: pass


if __name__ == '__main__':
    main()
