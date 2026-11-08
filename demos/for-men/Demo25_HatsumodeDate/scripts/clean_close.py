#!/usr/bin/env python3
"""The 'close' pose was drawn with "your" head and neck at the top right. A rectangular "erase" in stage.json removed them but also cut a
square out of your coat shoulder, so the coat stopped in mid-air with a step (user 2026-11-08: "the body is incomplete"). Here only the head
and neck are painted with the studio green along their real outline → assets/art/tsubaki_close_clean.png (stage.json poses.close.src);
the coat shoulder stays complete and runs out of the frame.
  python3 demos/for-men/Demo25_HatsumodeDate/scripts/clean_close.py   then the masked edit tsubaki_close_hair (project/web_prompts.json: her hair tips,
  which ended in a straight line where the neck covered them, redrawn on the green) → python3 tools/art/build_stage.py demos/for-men/Demo25_HatsumodeDate
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
# source px, measured on a 25 px grid: her hair's edge (3 px into it, to take the neck's outline too), the neck's lower line, the coat's top line (2 px above it)
EDGE = [(2289, 0), (2295, 50), (2301, 100), (2308, 200), (2319, 300), (2333, 380), (2338, 405), (2354, 428), (2376, 443), (2401, 446), (2436, 451),
        (2438, 576), (2480, 556), (2520, 540), (2560, 527)]
im = Image.open(os.path.join(ART, 'tsubaki_close.png')).convert('RGB'); a = np.asarray(im)
green = tuple(int(v) for v in np.median(np.concatenate([a[:40, :400].reshape(-1, 3)]), 0))
m = Image.new('L', im.size, 0); ImageDraw.Draw(m).polygon(EDGE + [(2560, 0)], fill=255); m = m.filter(ImageFilter.GaussianBlur(.8))
ImageDraw.Draw(m).rectangle((2402, 440, 2442, 458), fill=255)   # the neck's lower outline left of the polygon
im.paste(Image.new('RGB', im.size, green), (0, 0), m)
im.save(os.path.join(ART, 'tsubaki_close_clean.png')); print('wrote tsubaki_close_clean.png, studio', green)

