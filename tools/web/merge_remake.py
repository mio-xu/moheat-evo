#!/usr/bin/env python3
"""Merge a finished layered remake back into its original demo folder (user, 2026-11-08: a remake REPLACES the original — same folder,
same URL — and the original is backed up outside the repo).

  python3 tools/web/merge_remake.py <original folder> <remake folder> [--dry] [--backup "~/Desktop/MoHeat Evo 备份"]

1. Backs up the whole original (symlinks resolved, assets included) to <backup>/<category>/<original>_<YYYYMMDD-HHMM>/.
2. In the original: the old pictures, face patches and animation go (media/art, media/video, patches.js, prepare_video.py,
   prepare_art.*, web_video_prompts.json, gen_video.log, web_frames, assets/frames, assets/video); the remake's media/art (files the
   remake took from the original by symlink stay), media/layers.js, media/cover.jpg, index.html (its ../<original>/ paths made local,
   the head-loaded l10n line dropped — subs.js loads the folder's own l10n.js), project files, assets and its seedance script
   (→ scripts/seedance_layers.py, importing the folder's own scripts/seedance.py; its log → project/seedance_log_layers.json) come in.
   Story / lines / sound / thermal code, l10n.js and voices stay as they are.
3. Removes the remake folder. Then: README, nav.js / site menu / thumbnails back to the original folder, bump.py, tests.
"""
import argparse, datetime, os, re, shutil, subprocess, sys

ap = argparse.ArgumentParser(); ap.add_argument("orig"); ap.add_argument("remake"); ap.add_argument("--dry", action="store_true")
ap.add_argument("--backup", default="~/Desktop/MoHeat Evo 备份")
a = ap.parse_args()
O, R = os.path.abspath(a.orig), os.path.abspath(a.remake)
on, rn, cat = os.path.basename(O), os.path.basename(R), os.path.basename(os.path.dirname(O))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(O)))
acts = []
do = lambda what, fn=None: (acts.append(what), print(("[dry] " if a.dry else "") + what), (None if a.dry or fn is None else fn()))
rel = lambda p: os.path.relpath(p, REPO)

def rm(p):
    if os.path.islink(p) or os.path.isfile(p): os.remove(p)
    elif os.path.isdir(p): shutil.rmtree(p)

# 1. backup
stamp = datetime.datetime.now().strftime("%Y%m%d-%H%M")
B = os.path.join(os.path.expanduser(a.backup), cat, f"{on}_{stamp}")
do(f"backup {rel(O)} → {B}", lambda: shutil.copytree(O, B, symlinks=False, ignore_dangling_symlinks=True))

# 2a. old pictures / animation out
for sub in ["media/video", "assets/frames", "assets/video", "project/web_frames"]:
    p = os.path.join(O, sub)
    if os.path.exists(p): do(f"remove {rel(p)}", lambda p=p: rm(p))
for sub in ["scripts/prepare_video.py", "scripts/prepare_art.py", "scripts/prepare_art.sh", "project/web_video_prompts.json", "project/gen_video.log"]:
    p = os.path.join(O, sub)
    if os.path.exists(p): do(f"remove {rel(p)}", lambda p=p: rm(p))
oart, rart = os.path.join(O, "media", "art"), os.path.join(R, "media", "art")
keep = set()
for f in os.listdir(rart):
    p = os.path.join(rart, f)
    if os.path.islink(p) and on in os.readlink(p): keep.add(f)          # the remake used the original's own file
for f in sorted(os.listdir(oart)) if os.path.isdir(oart) else []:
    if f not in keep: do(f"remove old media/art/{f}", lambda f=f: rm(os.path.join(oart, f)))

# 2b. the remake's picture layers in
for f in sorted(os.listdir(rart)):
    if f in keep: continue
    s = os.path.join(rart, f)
    if os.path.islink(s): print(f"  note: media/art/{f} is a link to {os.readlink(s)} — copied as a file");
    do(f"add media/art/{f}", lambda s=s, f=f: shutil.copy2(os.path.realpath(s), os.path.join(oart, f)))
for f in ["layers.js", "cover.jpg"]:
    s = os.path.join(R, "media", f)
    if os.path.exists(s) and not os.path.islink(s): do(f"add media/{f}", lambda s=s, f=f: shutil.copy2(s, os.path.join(O, "media", f)))

# 2c. index.html: local paths
s = open(os.path.join(R, "index.html"), encoding="utf-8").read()
s = re.sub(rf'\s*<script src="\.\./{re.escape(on)}/l10n\.js[^"]*"></script>(<!--[^>]*-->)?', "", s)
s = s.replace(f"../{on}/", "")
s = re.sub(rf"<!-- {re.escape(on)}'s story / sound / thermal code by path \(unchanged\); ", "<!-- story / sound / thermal code (unchanged since the first version); ", s)
do("replace index.html with the remake's (paths made local)", lambda: open(os.path.join(O, "index.html"), "w", encoding="utf-8").write(s))

# 2d. scripts / project / assets
rs = os.path.join(R, "scripts", "seedance.py")
if os.path.exists(rs):
    t = open(rs, encoding="utf-8").read()
    t = re.sub(rf"os\.path\.join\(ROOT, '\.\.', '{re.escape(on)}', 'scripts', 'seedance\.py'\)", "os.path.join(ROOT, 'scripts', 'seedance.py')", t)
    t = t.replace("'seedance_log.json'", "'seedance_log_layers.json'")
    do("add scripts/seedance_layers.py (imports the folder's own scripts/seedance.py)", lambda: open(os.path.join(O, "scripts", "seedance_layers.py"), "w", encoding="utf-8").write(t))
# the remake's other scripts (prompt builders, clean-up helpers…): kept, renamed *_layers.py if the original has one of that name
for f in sorted(os.listdir(os.path.join(R, "scripts"))) if os.path.isdir(os.path.join(R, "scripts")) else []:
    if f == "seedance.py" or not f.endswith(".py"): continue
    dst = f if not os.path.exists(os.path.join(O, "scripts", f)) else f[:-3] + "_layers.py"
    do(f"add scripts/{dst}", lambda f=f, dst=dst: shutil.copy2(os.path.join(R, "scripts", f), os.path.join(O, "scripts", dst)))
# a project file of the same name would overwrite the original's (e.g. web_prompts.json: the first version's prompts) → keep it as *_v1
for f in sorted(os.listdir(os.path.join(R, "project"))):
    o_ = os.path.join(O, "project", f)
    if os.path.isfile(o_) and f.endswith(".json") and f != "seedance_log.json" and not os.path.exists(o_[:-5] + "_v1.json"):
        do(f"keep the original's project/{f} as project/{f[:-5]}_v1.json", lambda o_=o_: shutil.copy2(o_, o_[:-5] + "_v1.json"))
for f in sorted(os.listdir(os.path.join(R, "project"))):
    s_ = os.path.join(R, "project", f); dst = "seedance_log_layers.json" if f == "seedance_log.json" else f
    do(f"add project/{dst}", lambda s_=s_, dst=dst: (shutil.copytree(s_, os.path.join(O, "project", dst), dirs_exist_ok=True) if os.path.isdir(s_) else shutil.copy2(s_, os.path.join(O, "project", dst))))
ra = os.path.join(R, "assets")
if os.path.isdir(ra): do(f"merge assets/ (raw art, not in git)", lambda: shutil.copytree(ra, os.path.join(O, "assets"), dirs_exist_ok=True, symlinks=True))

# 3. remake folder out (tracked files via git rm)
def drop():
    subprocess.run(["git", "rm", "-rq", "--cached", "--ignore-unmatch", rel(R)], cwd=REPO, check=True); rm(R)
do(f"remove the remake folder {rel(R)}", drop)
refs = subprocess.run(["grep", "-rIl", "--exclude-dir=.git", "--exclude-dir=assets", rn, REPO], capture_output=True, text=True).stdout.splitlines()   # paths contain spaces
print("\nstill mentioning", rn + ":", *[rel(x) for x in refs if "/.git/" not in x] or ["(none)"], sep="\n  ")
