#!/usr/bin/env python3
"""Identify downloaded Seedance clips by their first / last frames — no need to open each video (saves time and tokens).

  python3 tools/seedance/ident_clips.py <demo dir> [video files…]        # default: ~/Downloads/video_batch_*.mp4, oldest first
  python3 tools/seedance/ident_clips.py demos/for-women/Demo22_ShionRain --rename   # also move them to <demo>/assets/video/<clip>.mp4

Reads <demo>/project/web_video_prompts.json ({"clips": {name: {"first": still, "last": still}}}) and the stills
<demo>/media/art/<still>.jpg ('<still>_r' = mirrored). Each file's first / last frame is matched to the closest still; the clip whose
(first, last) pair matches is the answer. Loops of the same view (talk / idle) share a pair: those are listed as candidates and resolved
in submit order (the order of names in the JSON; files are taken oldest download first, or reversed with --newest-first when the
Download buttons were clicked from the top of the newest-first history) — check those few by eye if the order is unsure. --rename only renames unambiguous ones
and ambiguous ones whose submit order resolves them.
"""
import glob, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageOps

args = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = os.path.abspath(args[0]); files = args[1:]
if not files: files = sorted(glob.glob(os.path.expanduser('~/Downloads/video_batch_*.mp4')), key=os.path.getmtime)
JOBS = json.load(open(os.path.join(ROOT, 'project', 'web_video_prompts.json')))['clips']


def small(im): return np.asarray(im.convert('RGB').resize((96, 54)), np.float32)


def still(name):
    base = name[:-2] if name.endswith('_r') else name
    p = next((q for q in (os.path.join(ROOT, 'media', 'art', base + e) for e in ('.jpg', '.png', '.webp')) if os.path.exists(q)), None)
    im = Image.open(p); return small(ImageOps.mirror(im) if name.endswith('_r') else im)


STILLS = {n: still(n) for n in {j[k] for j in JOBS.values() for k in ('first', 'last')}}


def frame(p, last):
    a = ['ffmpeg', '-loglevel', 'error'] + (['-sseof', '-0.1'] if last else []) + ['-i', p, '-frames:v', '1', '-vf', 'scale=96:54', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    return np.frombuffer(subprocess.run(a, capture_output=True).stdout, np.uint8).reshape(54, 96, 3).astype(np.float32)


def best(f): return min(STILLS, key=lambda n: np.abs(STILLS[n] - f).mean())


used, out = set(), []
# the web history lists newest first: if you clicked Download from the top, pass --newest-first so same-pair loops resolve right
for p in (files[::-1] if '--newest-first' in sys.argv else files):
    pair = (best(frame(p, 0)), best(frame(p, 1)))
    cands = [n for n, j in JOBS.items() if (j['first'], j['last']) == pair]
    pick = next((n for n in cands if n not in used), None)
    if pick: used.add(pick)
    out.append((p, pair, cands, pick))
    print(f'{os.path.basename(p)}: first={pair[0]} last={pair[1]} → {pick or "?"}' + (f'  (candidates {cands})' if len(cands) > 1 else ''))
missing = [n for n in JOBS if n not in used]
if missing: print('not found:', missing)
if '--rename' in sys.argv:
    os.makedirs(os.path.join(ROOT, 'assets', 'video'), exist_ok=True)
    for p, _, _, pick in out:
        if pick: shutil.move(p, os.path.join(ROOT, 'assets', 'video', pick + '.mp4')); print('moved', pick)
