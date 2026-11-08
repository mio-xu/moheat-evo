#!/usr/bin/env python3
"""Task claim table: who is editing which files right now (docs/CLAIMS.md; user 2026-11-08 提效标准「任务认领表」).

Several sessions share ONE working tree, so the live table sits in the clone itself (.git/moheat-claims.json — every session sees it
at once, nothing to commit, no merge noise). A claim on a folder covers everything under it.

  python3 tools/git/claim.py claim   <agent> <path…> [--note "what for"]   # warns (exit 1) when someone else holds one of them
  python3 tools/git/claim.py release <agent> [<path…>]                      # no paths = release everything this agent holds
  python3 tools/git/claim.py list    [<agent>]                              # the table (stale > 12 h marked)
  python3 tools/git/claim.py check   <agent> <path…>                        # exit 1 if another agent holds one of them (commit_mine.py runs this)
  python3 tools/git/claim.py scratch <agent> <scratchpad dir>               # make + print the agent's own scratch folder <dir>/<agent>/

<agent> = a short unique id per session, e.g. "ui-shell", "lp-mouths", "demo43", "workflow". Set MOHEAT_AGENT=<id> in your shell and
`commit_mine.py` warns before committing a path that another agent claimed.
Scratchpad rule (2026-11-08: two agents' same-named commit.sh in one shared scratchpad → a wrong commit): every temp script / file goes
under <scratchpad>/<agent>/ (the `scratch` command), never a bare commit.sh / tmp.py at the scratchpad root.
"""
import fcntl, json, os, subprocess, sys, time

ROOT = subprocess.run(['git', 'rev-parse', '--show-toplevel'], capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))).stdout.strip()
GITDIR = subprocess.run(['git', 'rev-parse', '--absolute-git-dir'], capture_output=True, text=True, cwd=ROOT).stdout.strip()
DB = os.path.join(GITDIR, 'moheat-claims.json')
STALE = 12 * 3600


def norm(p):
    ap = os.path.abspath(p)
    if not os.path.lexists(ap) and not os.path.isabs(p): ap = os.path.join(ROOT, p)
    return os.path.relpath(ap, ROOT).rstrip('/')


def covers(a, b):
    return a == b or b.startswith(a + '/') or a.startswith(b + '/')


class Table:
    def __enter__(self):
        self.lock = open(DB + '.lock', 'w'); fcntl.flock(self.lock, fcntl.LOCK_EX)
        try: self.rows = json.load(open(DB))
        except (FileNotFoundError, ValueError): self.rows = []
        return self

    def save(self):
        tmp = DB + f'.{os.getpid()}.tmp'
        json.dump(self.rows, open(tmp, 'w'), ensure_ascii=False, indent=1); os.replace(tmp, DB)

    def __exit__(self, *e):
        fcntl.flock(self.lock, fcntl.LOCK_UN); self.lock.close()


def conflicts(rows, agent, paths):
    return [(p, r) for p in paths for r in rows if r['agent'] != agent and covers(r['path'], p) and time.time() - r['t'] < STALE]


def show(rows):
    if not rows: print('(no claims)'); return
    print(f'{"agent":14} {"since":16} path · note')
    for r in sorted(rows, key=lambda r: (r['agent'], r['path'])):
        age = time.time() - r['t']
        print(f'{r["agent"]:14} {time.strftime("%m-%d %H:%M", time.localtime(r["t"])):16} {r["path"]}' + (f' · {r["note"]}' if r.get('note') else '') + (' (STALE >12 h)' if age > STALE else ''))


def main(argv):
    if not argv or argv[0] in ('-h', '--help'): print(__doc__); return 0
    cmd, rest = argv[0], argv[1:]
    note = ''
    if '--note' in rest: i = rest.index('--note'); note = rest[i + 1]; rest = rest[:i] + rest[i + 2:]
    if cmd == 'list':
        with Table() as T: show([r for r in T.rows if not rest or r['agent'] == rest[0]])
        return 0
    if cmd == 'scratch':
        if len(rest) != 2: raise SystemExit('usage: claim.py scratch <agent> <scratchpad dir>')
        d = os.path.join(rest[1], rest[0]); os.makedirs(d, exist_ok=True); print(d); return 0
    if not rest: raise SystemExit(__doc__)
    agent, paths = rest[0], [norm(p) for p in rest[1:]]
    with Table() as T:
        if cmd == 'check':
            c = conflicts(T.rows, agent, paths)
            for p, r in c: print(f'⚠ {p} is claimed by {r["agent"]} since {time.strftime("%H:%M", time.localtime(r["t"]))}' + (f' ({r["note"]})' if r.get('note') else ''))
            return 1 if c else 0
        if cmd == 'claim':
            if not paths: raise SystemExit('name the paths to claim')
            c = conflicts(T.rows, agent, paths)
            for p, r in c: print(f'⚠ {p} is already claimed by {r["agent"]} ({r.get("note", "")}) — talk to them before editing')
            for p in paths:
                T.rows = [r for r in T.rows if not (r['agent'] == agent and r['path'] == p)]
                T.rows.append({'agent': agent, 'path': p, 't': time.time(), 'note': note})
            T.save(); show([r for r in T.rows if r['agent'] == agent]); return 1 if c else 0
        if cmd == 'release':
            n = len(T.rows)
            T.rows = [r for r in T.rows if not (r['agent'] == agent and (not paths or r['path'] in paths))]
            T.save(); print(f'released {n - len(T.rows)} claim(s) of {agent}'); return 0
    raise SystemExit(f'unknown command {cmd}\n' + __doc__)


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
