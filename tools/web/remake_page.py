#!/usr/bin/env python3
"""Page for a layered remake of an existing demo (DEMO_DESIGN_GUIDE §6 标准制作流程; first used for Demo27 ← Demo24).

  python3 tools/web/remake_page.py <original folder> <new folder> [--skip-video REGEX]

Writes <new>/index.html from the original's: the original's own files (style.css, lines.js, audio.js, main.js, l10n.js, …) are
loaded BY PATH (unchanged, never copied); its old face-patch data (media/art/patches.js) is dropped (the new art has its own patches);
media/layers.js + ../../shared/layers.js are inserted before main.js, with MOHEAT_LAYERS.skipVideo so the old clips are never
requested; the credits line gets " · layered stills". Also: <new>/l10n.js (a stub — subs.js loads l10n.js next to the page; the
translations come from the original's l10n.js loaded in <head>) and the symlink media/voice → the original's voices.
Run tools/art/build_stage.py for the art, then test (?auto=1 / ?auto=1&alt=1, ?sub=…) and make media/cover.jpg (?cover=1).
"""
import argparse, os, re

ap = argparse.ArgumentParser(); ap.add_argument("orig"); ap.add_argument("new"); ap.add_argument("--skip-video", default="media/video/")
a = ap.parse_args()
O, N = os.path.abspath(a.orig), os.path.abspath(a.new)
on = os.path.basename(O)
s = open(os.path.join(O, "index.html"), encoding="utf-8").read()

def local(path):   # a page-relative file of the original (not ../, not http, not #)
    return not re.match(r"(https?:|//|\.\./|#|data:|mailto:)", path) and not path.startswith("/")

# <link href> / <script src> of the original's own files → by path; its old face patches are dropped
s = re.sub(r'\s*<script src="media/art/patches\.js[^"]*"></script>', "", s)
def fix(m):
    attr, path = m.group(1), m.group(2)
    return f'{attr}="../{on}/{path}"' if local(path) and not path.startswith("media/") else m.group(0)
s = re.sub(r'(href|src)="([^"]+\.(?:css|js)(?:\?[^"]*)?)"', fix, s)
# the original's translations, then the layers before its main.js
s = s.replace("</head>", f'  <script src="../{on}/l10n.js?v=3"></script><!-- the original\'s languages (same page text) -->\n</head>', 1)
mm = re.search(rf'<script src="\.\./{re.escape(on)}/main\.js[^"]*"></script>', s)
assert mm, "no main.js script tag"
s = s[:mm.start()] + (f'<!-- {on}\'s story / sound / thermal code by path (unchanged); shared/layers.js draws the layered art in place of its stills -->\n'
                      f'  <script src="media/layers.js?v=1"></script>\n  <script>MOHEAT_LAYERS.skipVideo = {a.skip_video!r};</script>\n'
                      f'  <script src="../../shared/layers.js?v=1"></script>\n  ') + s[mm.start():]
s = re.sub(r'(art|art and animation|animation) (made )?with Seedance( video)?', lambda m: 'art made with Seedance', s)   # no video in a remake
s = re.sub(r'(<p class="draft" id="credits">[^<]*?)(</p>)', lambda m: m.group(1) + ("" if "layered stills" in m.group(1) else " · layered stills") + m.group(2), s, 1)
os.makedirs(os.path.join(N, "media", "art"), exist_ok=True)
open(os.path.join(N, "index.html"), "w", encoding="utf-8").write(s)
open(os.path.join(N, "l10n.js"), "w").write(f"// Languages of this page for ../../shared/subs.js come from ../{on}/l10n.js (loaded by index.html: same page text);\n"
                                           "// subs.js still loads this file, so it must exist. The credits line (.draft) stays English on every demo by design.\n")
v = os.path.join(N, "media", "voice")
if os.path.isdir(os.path.join(O, "media", "voice")) and not os.path.lexists(v): os.symlink(f"../../{on}/media/voice", v)
print("wrote", os.path.relpath(os.path.join(N, "index.html")))
