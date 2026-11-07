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

--stage: other Claude sessions may have uncommitted edits in the same pages. With --stage the same bump is applied to the
staged (index) copy of each file, so `git commit` takes exactly these changes and none of theirs. Commit right after staging:
another session's `git commit` would otherwise take your staged changes into its own commit.
"""
import os, re, subprocess, sys

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


def bump_text(path, text, targets, names):
    base, hits = base_of(path, text), []

    def sub(m):
        ref, n = m.group(1), int(m.group(3))
        name = os.path.basename(ref)
        if name in names or os.path.normpath(os.path.join(base, ref)) in targets:
            hits.append(f'{ref}?v={n} → {n + 1}')
            return f'{ref}?v={n + 1}'
        return m.group(0)

    return re.sub(r'([\w./-]*[\w-]+\.(js|css|json))\?v=(\d+)', sub, text), hits


def main():
    args = sys.argv[1:]
    dry, stage = '--dry' in args, '--stage' in args
    names, targets, it = set(), set(), iter([a for a in args if a not in ('--dry', '--stage')])
    for a in it:
        if a == '--name': names.add(next(it))
        else: targets.add(os.path.normpath(os.path.join(os.getcwd(), a)))
    if not names and not targets:
        print(__doc__); sys.exit(1)
    total = 0
    for path in site_files():
        text = open(path, encoding='utf-8').read()          # read first, then write (never open for writing before reading)
        new, hits = bump_text(path, text, targets, names)
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
            staged, _ = bump_text(path, r.stdout.decode('utf-8'), targets, names)
            sha = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=staged.encode('utf-8'), capture_output=True, check=True).stdout.decode().strip()
            subprocess.run(['git', 'update-index', '--cacheinfo', f'100644,{sha},{rel}'], cwd=ROOT, check=True)
    print(f'{total} reference(s) {"would be " if dry else ""}bumped' + (' and staged' if stage and not dry else ''))


if __name__ == '__main__':
    main()
