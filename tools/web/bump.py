#!/usr/bin/env python3
"""Bump the ?v=N cache number of every reference to the given files (DEMO_DESIGN_GUIDE §7.2), so browsers and GitHub Pages
fetch the new version. One command instead of hand-edited sed over 26 pages.

  python3 tools/web/bump.py demos/shared/subs.js demos/shared/series.css      # every page / loader that uses them
  python3 tools/web/bump.py --name l10n.js                                     # every reference to any file of that name
  python3 tools/web/bump.py --stage demos/shared/nav.js                        # also stage ONLY these edits (see below)
  python3 tools/web/bump.py --dry demos/shared/interact.js                     # show, change nothing

How references are found: in every .html / .js file of the site (repo root + demos/), `<something>/<name>?v=N` is resolved
against the file's folder (or its <base href> for pages like Demo17–19 / Demo16); it is bumped when it points at one of the
given files. Loader strings inside shared JS (nav.js loading 'subs.js?v=N', subs.js loading 'l10n_common.js?v=N') resolve
the same way. --name ignores the folder (for per-demo files such as l10n.js / main.js loaded relative to each page).

--auto: content-hash versions (user 2026-11-08 提效标准「?v 按内容自动」): every reference gets ?v=<first 8 hex of the file's
sha1>, so a version can never be forgotten or stale — run it after editing; unchanged files keep the same value (no churn).
  python3 tools/web/bump.py --auto demos/shared/nav.js        # only references to these files
  python3 tools/web/bump.py --auto                            # every ?v= reference of the site (numbers become hashes)
  python3 tools/web/bump.py --check                           # list stale references (hash ≠ content, or a number lower than
                                                              # another page's number for the same file); exit 1 if any
Commit the page edits with `python3 tools/git/commit_mine.py "<msg>" --hunks <page> '\?v='` (only the version hunks).

--stage: other Claude sessions may have uncommitted edits in the same pages. With --stage the same bump is applied to the
staged (index) copy of each file, so `git commit` takes exactly these changes and none of theirs. Commit right after staging:
another session's `git commit` would otherwise take your staged changes into its own commit.
"""
import hashlib, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SKIP_DIRS = {'.git', 'node_modules', '__pycache__', 'assets', 'audio', 'video', 'output', 'project', 'scripts', 'art', 'analysis',
             'storyboard', 'thermal', 'production', 'tools', 'animation', 'local'}


def site_files():
    for top in [ROOT, os.path.join(ROOT, 'demos')]:
        for dp, dn, fn in os.walk(top):
            dn[:] = [d for d in dn if d not in SKIP_DIRS and not (top == ROOT and d == 'demos')]
            rel = os.path.relpath(dp, ROOT)
            if '/media' in '/' + rel + '/' and not rel.endswith('media'):   # media/ holds generated data, never references
                continue
            for f in fn:
                if f.endswith(('.html', '.js')):
                    yield os.path.join(dp, f)


def base_of(path, text):
    m = re.search(r'<base\s+href="([^"]+)"', text) if path.endswith('.html') else None
    return os.path.normpath(os.path.join(os.path.dirname(path), m.group(1))) if m else os.path.dirname(path)


REF = re.compile(r'([\w./-]*[\w-]+\.(js|css|json))\?v=([0-9a-f]{6,12}\b|\d+)')
_H = {}


def chash(p):
    """Short content hash used as ?v= (8 hex of sha1)."""
    if p not in _H: _H[p] = hashlib.sha1(open(p, 'rb').read()).hexdigest()[:8]
    return _H[p]


def bump_text(path, text, targets, names, auto=False):
    base, hits = base_of(path, text), []

    def sub(m):
        ref, v = m.group(1), m.group(3)
        name, q = os.path.basename(ref), os.path.normpath(os.path.join(base, ref))
        if not (name in names or q in targets or (auto and not targets and not names)): return m.group(0)
        if auto or not v.isdigit():
            if not os.path.isfile(q): return m.group(0)
            h = chash(q)
            if h == v: return m.group(0)
            hits.append(f'{ref}?v={v} → {h}'); return f'{ref}?v={h}'
        hits.append(f'{ref}?v={v} → {int(v) + 1}')
        return f'{ref}?v={int(v) + 1}'

    return REF.sub(sub, text), hits


def check():
    """Stale ?v=: a hash that is not the file's content hash, or a number lower than another reference's number to the same file."""
    refs = []
    for path in site_files():
        text = open(path, encoding='utf-8').read(); base = base_of(path, text)
        for m in REF.finditer(text):
            q = os.path.normpath(os.path.join(base, m.group(1)))
            if os.path.isfile(q): refs.append((os.path.relpath(path, ROOT), m.group(1), m.group(3), q))
    top = {}
    for _, _, v, q in refs:
        if v.isdigit(): top[q] = max(top.get(q, 0), int(v))
    bad = []
    for page, ref, v, q in refs:
        if not v.isdigit() and v != chash(q): bad.append(f'{page}: {ref}?v={v} — content is now {chash(q)}')
        elif v.isdigit() and int(v) < top[q]: bad.append(f'{page}: {ref}?v={v} — another page uses ?v={top[q]}')
    for b in bad: print(b)
    n_hash = sum(1 for r in refs if not r[2].isdigit())
    print(f'{len(bad)} stale of {len(refs)} reference(s) ({n_hash} content-hash, {len(refs) - n_hash} numbered)')
    return 1 if bad else 0


def main():
    args = sys.argv[1:]
    if '--check' in args: sys.exit(check())
    dry, stage, auto = '--dry' in args, '--stage' in args, '--auto' in args
    names, targets, it = set(), set(), iter([a for a in args if a not in ('--dry', '--stage', '--auto')])
    for a in it:
        if a == '--name': names.add(next(it))
        else: targets.add(os.path.normpath(os.path.join(os.getcwd(), a)))
    if not names and not targets and not auto:
        print(__doc__); sys.exit(1)
    total = 0
    for path in site_files():
        text = open(path, encoding='utf-8').read()          # read first, then write (never open for writing before reading)
        new, hits = bump_text(path, text, targets, names, auto)
        if not hits: continue
        total += len(hits)
        rel = os.path.relpath(path, ROOT)
        print(f'{rel}: ' + ', '.join(hits))
        if dry: continue
        with open(path, 'w', encoding='utf-8') as f: f.write(new)
        if stage:
            r = subprocess.run(['git', 'show', f':{rel}'], cwd=ROOT, capture_output=True)
            if r.returncode != 0:                            # new file: stage it as it is
                subprocess.run(['git', 'add', rel], cwd=ROOT, check=True); continue
            staged, _ = bump_text(path, r.stdout.decode('utf-8'), targets, names, auto)
            sha = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=staged.encode('utf-8'), capture_output=True, check=True).stdout.decode().strip()
            subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{sha},{rel}'], cwd=ROOT, check=True)
    print(f'{total} reference(s) {"would be " if dry else ""}bumped' + (' and staged' if stage and not dry else ''))


if __name__ == '__main__':
    main()
