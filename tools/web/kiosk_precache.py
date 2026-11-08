#!/usr/bin/env python3
"""Offline file list for the exhibition kiosk (DEMO_DESIGN_GUIDE §7.4; docs/kiosk.md "离线").

  python3 tools/web/kiosk_precache.py            # writes kiosk/precache.json (run after adding / changing demos, then commit it)
  python3 tools/web/kiosk_precache.py --check    # exit 1 when kiosk/precache.json is out of date (missing / extra files)

The staff panel's "Save all demos for offline" sends the shared files + the files of the demos currently offered to /kiosk-sw.js,
which stores them in Cache Storage; with no network the service worker answers from there. Only git-tracked, deployed files:
no production folders (scripts/ project/ production/ analysis/ storyboard/ thermal/ tools/ output/ assets/ audio/), no .py / .md / .csv.
"""
import json, os, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'kiosk', 'precache.json')
SKIP_DIRS = {'scripts', 'project', 'production', 'analysis', 'storyboard', 'thermal', 'tools', 'output', 'assets', 'audio'}
SKIP_EXT = {'.py', '.md', '.csv', '.command', '.txt', '.sh', '.psd'}


def files():
    out = subprocess.run(['git', 'ls-files', 'demos', 'kiosk', 'assets/images/demos', 'device.js', 'index.html', 'styles.css', 'script.js', 'credits.html'],
                         cwd=ROOT, capture_output=True, text=True).stdout.split('\n')
    out += subprocess.run(['git', 'ls-files', '--others', '--exclude-standard', 'kiosk'], cwd=ROOT, capture_output=True, text=True).stdout.split('\n')   # new kiosk files before their commit
    shared, demos = [], {}
    for f in filter(None, out):
        parts = f.split('/')
        if os.path.splitext(f)[1].lower() in SKIP_EXT or 'README' in f or f.endswith('precache.json'): continue
        if f.startswith('demos/') and len(parts) > 3 and parts[2].startswith('Demo'):
            if any(p in SKIP_DIRS for p in parts[3:-1]): continue
            demos.setdefault(parts[2], []).append(f)
        elif f.startswith('assets/images/demos/'):
            d = parts[-1].split('.')[0]; demos.setdefault(d, []).append(f)
        elif f.startswith('demos/') and any(p in SKIP_DIRS for p in parts[1:-1]): continue
        else: shared.append(f)
    size = lambda fs: sum(os.path.getsize(os.path.join(ROOT, x)) for x in fs if os.path.exists(os.path.join(ROOT, x)))
    return {'note': 'written by tools/web/kiosk_precache.py — paths relative to the site root', 'shared': sorted(shared),
            'demos': {k: sorted(v) for k, v in sorted(demos.items())}, 'mb': round((size(shared) + sum(size(v) for v in demos.values())) / 1048576)}


if __name__ == '__main__':
    data = files()
    if '--check' in sys.argv:
        try: old = json.load(open(OUT, encoding='utf-8'))
        except Exception: old = {}
        same = old.get('shared') == data['shared'] and old.get('demos') == data['demos']
        print('kiosk/precache.json', 'up to date' if same else 'OUT OF DATE — run python3 tools/web/kiosk_precache.py'); sys.exit(0 if same else 1)
    tmp = OUT + '.tmp'; json.dump(data, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=0); os.replace(tmp, OUT)
    print(f"kiosk/precache.json: {len(data['shared'])} shared + {sum(len(v) for v in data['demos'].values())} demo files, ~{data['mb']} MB")
