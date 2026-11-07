#!/usr/bin/env python3
"""Periodic clean-up report for the repo (DEMO_DESIGN_GUIDE.md §12). Lists local files that are no longer needed, by category,
with sizes. Nothing is deleted unless you pass --trash <category …>, and even then files only go to the macOS Trash (recoverable).

  python3 tools/cleanup/audit.py                     # report only
  python3 tools/cleanup/audit.py --list auditions    # every path in a category
  python3 tools/cleanup/audit.py --trash junk auditions   # move those categories to ~/.Trash (ask the user first)

Categories
  junk       .DS_Store, __pycache__, *.part, stray download leftovers inside the repo
  auditions  voice audition takes for characters whose voice is already chosen (VOICEVOX-era takes, ElevenLabs previews of
             confirmed characters). Never ElevenLabs line caches (they cost characters to rebuild).
  rejected   art / video candidates the user did not choose (unchosen designs and styles, alternates, the relit test, frame copies)
  obsolete   retired workspaces and one-off kits: the idol design workspace (Demo16_HandshakeEvent, finished as Demo20–22),
             debug crops, Seedance / ChatGPT upload kits, art packs already imported into assets/, refs for paused plans
  rebuild    big intermediates that the build scripts regenerate (binaural stems, spatialized audio). Only the final MP4 / mix and
             the inputs are needed to keep a demo; trash these only when disk space matters.
Never listed: anything tracked by git, final films (video/final, output/final_*.mp4), media/, ElevenLabs caches, raw art that the
page's media/ is made from, and folders other sessions are working in (KEEP below).
"""
import glob, json, os, shutil, subprocess, sys, time

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(REPO, 'demos')
KEEP = []   # folders another session is still working in (add while it runs; Demo16_HandshakeEvent was retired 2026-11-08)


def g(*pats):
    out = []
    for p in pats: out += glob.glob(os.path.join(REPO, p), recursive=True)
    return out


def confirmed_eleven():
    try: cast = json.load(open(os.path.join(REPO, 'tools', 'eleven', 'cast.json')))
    except Exception: return []
    return [os.path.join(REPO, 'tools', 'eleven', 'out', k) for k, v in cast.items() if not k.startswith('_') and isinstance(v, dict) and v.get('voice_id')]


CATS = {
    'junk': lambda: g('**/.DS_Store', '**/__pycache__', '**/*.part', 'demos/**/image_batch_*.png', 'demos/**/video_batch_*.mp4'),
    'auditions': lambda: g('demos/*/*/output/audition', 'demos/*/*/audio/audition', 'demos/*/*/audio/audition[0-9]*', 'demos/*/*/audio/eleven_audition',
                           'demos/*/*/audio/audition.log') + confirmed_eleven(),
    'rejected': lambda: g('demos/for-women/Demo12_LateCall/assets/art/design_[B-E]_*.png', 'demos/for-women/Demo12_LateCall/assets/art/x_style*',
                          'demos/for-women/Demo12_LateCall/assets/art/style_[124-8]_*.png',
                          'demos/for-women/Demo21_JinLounge/assets/video_alt', 'demos/for-women/Demo21_JinLounge/assets/art/jin_whisper_[abc].png',
                          'demos/all-ages/Demo4_SeasonsExpress/video/swirl_candidates', 'demos/for-women/Demo22_ShionRain/assets/frames',
                          'demos/**/*_relit.png'),
    'obsolete': lambda: g('demos/for-women/Demo16_HandshakeEvent', 'demos/for-men/Demo14_LiveStream/project/box_*.jpg',
                          'demos/*/*/assets/kit', 'demos/all-ages/Demo4_SeasonsExpress/project/generated_art',
                          'demos/all-ages/Demo4_SeasonsExpress/project/chatgpt_layout_refs', 'demos/all-ages/Demo4_SeasonsExpress/project/art_render',
                          'demos/all-ages/Demo4_SeasonsExpress/project/seedance_refs'),
    'rebuild': lambda: g('demos/all-ages/Demo3_ShiningSmileConcert/audio/stems', 'demos/all-ages/Demo3_ShiningSmileConcert/assets/music_edited',
                         'demos/all-ages/Demo4_SeasonsExpress/audio/source_stems', 'demos/all-ages/Demo1_SnowFoxfire/output/stems', 'demos/all-ages/Demo2_FanMeeting/output/stems',
                         'demos/all-ages/Demo4_SeasonsExpress/audio/spatialized', 'demos/nobunaga-suntory/*/audio/stems'),
}


def tracked(p):
    r = subprocess.run(['git', '-C', REPO, 'ls-files', '--error-unmatch', os.path.relpath(p, REPO)], capture_output=True)
    if r.returncode == 0: return True
    if os.path.isdir(p):   # a directory with any tracked file inside
        return bool(subprocess.run(['git', '-C', REPO, 'ls-files', os.path.relpath(p, REPO)], capture_output=True, text=True).stdout.strip())
    return False


def size(p):
    if os.path.isfile(p): return os.path.getsize(p)
    return sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(p) for f in fs if os.path.exists(os.path.join(r, f)))


def collect(cat):
    paths = sorted(set(CATS[cat]()))
    paths = [p for p in paths if os.path.exists(p) and not any(os.path.relpath(p, REPO).startswith(k) for k in KEEP) and '/.git/' not in p]
    return [p for p in paths if not tracked(p)]


def mb(n): return f'{n / 1e6:8.1f} MB'


args = sys.argv[1:]
if '--trash' in args:
    cats = [a for a in args[args.index('--trash') + 1:] if a in CATS]
    trash = os.path.expanduser('~/.Trash'); stamp = time.strftime('%Y%m%d-%H%M%S')
    for c in cats:
        for p in collect(c):
            if not os.path.exists(p): continue   # already moved with its parent folder
            dst = os.path.join(trash, f'moheat-{stamp}-' + os.path.relpath(p, REPO).replace('/', '__'))
            shutil.move(p, dst)
        print('trashed', c)
    sys.exit()
show = args[args.index('--list') + 1] if '--list' in args else None
total = 0
for c in CATS:
    ps = collect(c); s = sum(size(p) for p in ps); total += s
    print(f'{c:10s} {mb(s)}  {len(ps)} paths')
    if show == c:
        for p in sorted(ps, key=size, reverse=True): print('   ', mb(size(p)), os.path.relpath(p, REPO))
print(f'{"total":10s} {mb(total)}')
