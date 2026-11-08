#!/usr/bin/env python3
"""Commit ONLY your own paths / hunks on the shared main (DEMO_DESIGN_GUIDE §6 制作流程 v2 G7, §14; user 2026-11-08 提效标准).

Several sessions share one working tree AND one index: a bare `git commit` takes whatever the others staged. This tool never touches
the shared index for the commit itself: it builds the commit in a private temp index (GIT_INDEX_FILE, unique per call) started from
HEAD, adds only what you name, and moves HEAD forward with an old-value check (`update-ref HEAD <new> <old>`), so it can never take
someone else's staged files and never moves HEAD backwards.

  python3 tools/git/commit_mine.py "<message>" <path> [<path> …]          # whole files / folders as they are on disk (deleted = removed)
  python3 tools/git/commit_mine.py "<message>" --hunks <path> <regex>     # only YOUR change blocks of <path> (= --match <path> <regex>)
  python3 tools/git/commit_mine.py "<message>" --lines <path> 120-140     # only the change blocks at these working-file lines
  python3 tools/git/commit_mine.py "<message>" --patch my.diff            # a patch against HEAD (e.g. `git diff HEAD -- f > my.diff`, edited)
  python3 tools/git/commit_mine.py -F msg.txt <paths…>                    # message from a file
  MOHEAT_AGENT=<id>: warn when a path is claimed by another agent (tools/git/claim.py, docs/CLAIMS.md)
  options: --dry / --dry-run (show what would go in, commit nothing) · --force-add (add ignored files) · --no-trailer

Exact hunk selection (2026-11-08: twice the old --hunks swept a neighbour's WORKLOG entry / guide edit into another agent's commit,
because `git diff` merges edits ≤ 6 lines apart into ONE hunk with 3 lines of context): the file is diffed against HEAD with
`-U0`, so every contiguous block of changed lines is its own block. A block is selected when one of its +/- lines matches a
--match / --hunks regex or lies in a --lines range (working-file line numbers; a pure removal counts at the line where it was).
Every selected block is printed. If a selected block also holds a changed line that matches NO selector, nothing is committed
(exit 4): that line may be someone else's — widen the selector if it is yours, or commit a hand-made --patch. The commit then
gets HEAD's file with only the selected blocks replaced by the working-file lines (no `git apply`, no context to drift).

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


def gitb(*a, env=None, inp=None):
    r = subprocess.run(['git', *a], cwd=ROOT, env=env, input=inp, capture_output=True)
    if r.returncode: raise SystemExit(f'git {" ".join(a[:3])} … failed: {r.stderr.decode(errors="replace").strip()[:400]}')
    return r.stdout


HH = re.compile(rb'^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@')


def blocks_of(path, old='HEAD'):
    """`git diff -U0 HEAD -- path` → [(a, b, c, d, [(sign, new_line_no, text)])]: HEAD lines a..a+b-1 became working lines c..c+d-1."""
    d = gitb('diff', '-U0', '--inter-hunk-context=0', '--no-color', '--no-ext-diff', '--no-textconv', '--no-renames', old, '--', path)
    out, cur = [], None
    for ln in d.split(b'\n'):
        m = HH.match(ln)
        if m:
            a, b, c, dd = int(m[1]), int(m[2] if m[2] is not None else 1), int(m[3]), int(m[4] if m[4] is not None else 1)
            cur = (a, b, c, dd, []); out.append(cur); n = c
        elif cur is not None and ln[:1] in (b'+', b'-'):
            if ln[:1] == b'+': cur[4].append(('+', n, ln[1:].decode('utf-8', 'replace'))); n += 1
            else: cur[4].append(('-', max(cur[2], 1) if cur[3] == 0 else cur[2], ln[1:].decode('utf-8', 'replace')))
    return out


def select(path, sels, old='HEAD'):
    """sels = [('match', regex) | ('lines', (lo, hi))]. Returns (new file bytes or None, report lines). Exit 4 on a mixed block."""
    rx = any(k == 'match' for k, _ in sels)

    def direct(n, text):
        return any((k == 'match' and re.search(v, text)) or (k == 'lines' and v[0] <= n <= v[1]) for k, v in sels)
    bl = blocks_of(path, old)
    if not bl:
        if not subprocess.run(['git', 'cat-file', '-e', f'{old}:{path}'], cwd=ROOT, capture_output=True).returncode: return None, [f'{path}: no changes against HEAD']
        raise SystemExit(f'{path}: not in HEAD (new file) — commit it as a whole path, not --hunks / --lines')
    keep, mixed, rep = [], [], []
    for blk in bl:
        a, b, c, d, lines = blk
        real = [direct(n, t) for _, n, t in lines]
        if not any(real): continue
        # the old text of a line you rewrote never holds your new marker: in a block that ADDS lines, its removed lines count as
        # yours under a --match selector (the added lines decide); a pure removal must match itself; --lines judges every line
        adds = any(sg == '+' for sg, _, _ in lines)
        hit = [h or (sg == '-' and adds and rx) for h, (sg, _, _) in zip(real, lines)]
        keep.append(blk)
        rep.append(f'  ── {path} block @@ -{a},{b} +{c},{d} @@ (selected)')
        for (sg, n, t), h in zip(lines, hit):
            rep.append(f'  {"  " if h else "✗ "}{sg}{n:>5} {t[:150]}')
        if not all(hit): mixed.append(f'{path} @@ -{a},{b} +{c},{d} @@: {hit.count(False)} changed line(s) match no selector (✗)')
    sd = ' | '.join(f'/{v}/' if k == 'match' else f'lines {v[0]}-{v[1]}' for k, v in sels)
    rep.insert(0, f'· {path}: {len(keep)} of {len(bl)} change block(s) selected by {sd}')
    if mixed:
        print('\n'.join(rep))
        _refuse(mixed)
    if not keep: return None, rep
    head = gitb('cat-file', 'blob', f'{old}:{path}').splitlines(keepends=True)
    work = open(os.path.join(ROOT, path), 'rb').read().splitlines(keepends=True)
    res, i = [], 0   # i = next HEAD line (0-based) not yet copied
    for a, b, c, d, _ in keep:
        start = a - 1 if b else a          # b == 0: pure insertion AFTER HEAD line a
        res += head[i:start]; res += work[c - 1:c - 1 + d] if d else []; i = start + b
    res += head[i:]
    return b''.join(res), rep


def _refuse(mixed):
    print('refused — a selected block also holds changed lines that match no selector (✗; maybe another agent\'s edit):\n  ' + '\n  '.join(mixed)
          + '\n  widen --match / --lines if those lines are yours, or commit a hand-made --patch. Nothing committed.')
    sys.exit(4)


def build(old, a, env):
    git('read-tree', old, env=env)
    notes = []
    for p in a.paths:
        if os.path.lexists(os.path.join(ROOT, p)):
            git('add', *(['-f'] if a.force_add else []), '-A', '--', p, env=env)
        else:
            git('rm', '--cached', '-r', '-q', '--ignore-unmatch', '--', p, env=env)
    for path, sels in a.sel.items():
        data, rep = select(path, sels, old)
        notes.extend(rep)
        if data is not None:
            mode = (git('ls-tree', old, '--', path).split() or ['100644'])[0]
            sha = gitb('hash-object', '-w', '--stdin', inp=data).decode().strip()
            git('update-index', '--add', '--cacheinfo', f'{mode},{sha},{path}', env=env)
    for pf in a.patch:
        git('apply', '--cached', '--recount', '--whitespace=nowarn', env=env, inp=open(pf).read())
        notes.append(f'patch {pf} applied')
    return git('write-tree', env=env).strip(), notes


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('message', nargs='?')
    ap.add_argument('paths', nargs='*')
    ap.add_argument('-F', dest='msgfile')
    ap.add_argument('--hunks', '--match', dest='hunks', nargs=2, action='append', default=[], metavar=('PATH', 'REGEX'))
    ap.add_argument('--lines', nargs=2, action='append', default=[], metavar=('PATH', 'A-B'))
    ap.add_argument('--patch', action='append', default=[])
    ap.add_argument('--dry', '--dry-run', dest='dry', action='store_true'); ap.add_argument('--force-add', action='store_true'); ap.add_argument('--no-trailer', action='store_true')
    a = ap.parse_intermixed_args()   # paths may follow --hunks / --patch
    if a.msgfile:
        if a.message: a.paths.insert(0, a.message)
        a.message = open(a.msgfile).read()
    if not a.message or not a.message.strip(): raise SystemExit('a commit message is required')
    if not (a.paths or a.hunks or a.lines or a.patch): raise SystemExit('name the paths (or --hunks / --lines / --patch) to commit — never everything')
    a.paths = [rel(p) for p in a.paths]
    a.sel = {}
    for p, r in a.hunks: re.compile(r); a.sel.setdefault(rel(p), []).append(('match', r))
    for p, r in a.lines:
        m = re.fullmatch(r'(\d+)(?:-(\d+))?', r.strip())
        if not m: raise SystemExit(f'--lines {p} {r}: give A-B (working-file line numbers)')
        a.sel.setdefault(rel(p), []).append(('lines', (int(m[1]), int(m[2] or m[1]))))
    a.hunks = list(a.sel.items())
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
            for n in notes: print(n)
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
