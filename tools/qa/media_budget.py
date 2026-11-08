#!/usr/bin/env python3
"""Media budget: flag oversized files in a demo (user 2026-11-08: "switching demos is slow — probably full-size images every time";
TASKS #51 ⑧ media budget). check_demo.py runs it (G5 media row); standalone:

  python3 tools/qa/media_budget.py <demo folder> [--json]          # report
  python3 tools/qa/media_budget.py <demo folder> --fix [--dry]     # re-encode oversized stills / layers in place (same size in px,
                                                                    #   so layers.js placement and patches stay valid); audio / video: prints the ffmpeg line

Measured 2026-11-08 (tools: own headless Chrome, cache off): the cover showed after 0.8–2.8 s on broadband and 20–22 s on Fast 3G
because every flat still, layer and the 3.8 MB mix.m4a loaded before it (3.4–11.8 MB). The fix for that is loading order (cover_art
first, the rest after the cover — shared cover template); this check keeps each file inside a size that makes the background load fast.

Budgets (per file, KB) — edit BUDGET, not the code:
"""
import json, os, re, subprocess, sys

BUDGET = [   # (pattern on the path inside the demo, limit KB, what / how)
    (r'media/cover_art\.(webp|avif|jpg)$', 220, 'cover art (shown first): webp q80 at ≤ 1920 px wide'),
    (r'media/cover\.jpg$', 300, 'og:image / thumbnail source: jpg q82'),
    (r'media/art/bg_[^/]+\.(webp|jpg|png)$', 450, 'background plate: webp q80, ≤ 2560 px'),
    (r'media/art/char_[^/]+\.(webp|png)$', 350, 'character layer: webp q85 (alpha), ≤ 1700 px'),
    (r'media/art/[^/]+_(mouth\d?|eyes)\.(webp|png)$', 60, 'face patch: webp, only the patch rectangle'),
    (r'media/art/[^/]+\.(jpg|jpeg)$', 300, 'flat still (fallback): jpg q80 — or "small": true in stage.json (960×540)'),
    (r'media/art/[^/]+\.(webp|png)$', 400, 'other art: webp q80'),
    (r'\.(m4a|mp3|aac|ogg|opus)$', 2500, 'audio: AAC 96 kb/s mono for voice, 128 kb/s stereo for a mix (≈ 1 MB / min)'),
    (r'\.(mp4|webm)$', 4000, 'video clip: H.264 CRF 26, ≤ 1080p, ≤ 1 MB / s'),
    (r'\.(png)$', 500, 'png: use webp'),
]
TOTAL_KB = 15000   # whole media/ folder of one demo (everything a full play-through may load)
SKIP = re.compile(r'(^|/)(assets|project|scripts|audio/src|\.git)/')


def files(D):
    """what the site serves = the git-tracked files of the demo (local masters in output/ / assets/ are not published)"""
    out = subprocess.run(['git', '-C', D, 'ls-files', '-z', '.'], capture_output=True, text=True).stdout.split('\0')
    for rel in filter(None, out):
        p = os.path.join(D, rel)
        if SKIP.search(rel) or not os.path.isfile(p): continue
        yield rel.replace(os.sep, '/'), os.path.getsize(p)


def check(D):
    over, total = [], 0
    for rel, size in files(D):
        if not rel.startswith('media/') and not re.search(r'\.(m4a|mp3|mp4|webm)$', rel): continue
        total += size
        for rx, kb, how in BUDGET:
            if re.search(rx, rel):
                if size > kb * 1024: over.append((rel, size // 1024, kb, how))
                break
    return sorted(over, key=lambda x: -x[1]), total // 1024


def fix(D, over, dry):
    from PIL import Image
    for rel, kb, lim, how in over:
        p = os.path.join(D, rel); ext = rel.rsplit('.', 1)[-1].lower()
        if ext in ('jpg', 'jpeg', 'webp'):
            im = Image.open(p); alpha = im.mode in ('RGBA', 'LA')
            for q in ((82, 76, 70) if ext != 'webp' or not alpha else (85, 80, 75)):
                tmp = p + '.tmp'
                (im if alpha else im.convert('RGB')).save(tmp, 'JPEG' if ext in ('jpg', 'jpeg') else 'WEBP', quality=q, method=6) if ext == 'webp' else im.convert('RGB').save(tmp, 'JPEG', quality=q, optimize=True, progressive=True)
                if os.path.getsize(tmp) <= lim * 1024 or q == 70 or q == 75: break
            new = os.path.getsize(tmp) // 1024
            print(f'{rel}: {kb} → {new} KB' + (' (dry)' if dry else ''))
            if dry or new >= kb: os.remove(tmp)
            else: os.replace(tmp, p)
        elif ext in ('m4a', 'mp3', 'aac'):
            print(f'{rel}: {kb} KB — ffmpeg -i {rel} -c:a aac -b:a 128k -ac 2 out.m4a (mix) / -b:a 96k -ac 1 (voice)')
        elif ext in ('mp4', 'webm'):
            print(f'{rel}: {kb} KB — ffmpeg -i {rel} -c:v libx264 -crf 26 -preset slow -vf scale=-2:1080 -an out.mp4')


if __name__ == '__main__':
    D = os.path.abspath(sys.argv[1])
    over, total = check(D)
    if '--json' in sys.argv: print(json.dumps({'over': over, 'total_kb': total, 'total_limit_kb': TOTAL_KB})); sys.exit(0)
    for rel, kb, lim, how in over: print(f'OVER  {rel}: {kb} KB > {lim} KB — {how}')
    print(f'media total {total} KB (limit {TOTAL_KB} KB); {len(over)} file(s) over budget')
    if '--fix' in sys.argv: fix(D, over, '--dry' in sys.argv)
