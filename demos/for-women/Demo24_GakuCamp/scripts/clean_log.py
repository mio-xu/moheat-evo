#!/usr/bin/env python3
"""The 'log' pose was drawn with the campfire's flames in its lower-right corner (the plate has its own fire). A rectangular "erase"
in stage.json cut a notch out of the hand and the log (QA 2026-11-08, assets/motion_check/log_notch.jpg), so instead the flames right
of the hand / log outline are painted over with the studio grey here → assets/art/gaku_log_clean.png (stage.json poses.log.src).
  python3 demos/for-women/Demo24_GakuCamp/scripts/clean_log.py   then   python3 tools/art/build_stage.py demos/for-women/Demo24_GakuCamp
"""
import os
from PIL import Image, ImageDraw, ImageFilter
ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
# right outline of the hand + log (source px, measured on a 25 px grid), 4 px outside the drawn line
EDGE = [(2300, 1040), (2322, 1072), (2339, 1112), (2350, 1124), (2355, 1170), (2367, 1215), (2360, 1242), (2334, 1273), (2302, 1289),
        (2272, 1304), (2245, 1309), (2240, 1330), (2227, 1370), (2215, 1410), (2205, 1440)]
im = Image.open(os.path.join(ART, 'gaku_log.png')).convert('RGB')
m = Image.new('L', im.size, 0); ImageDraw.Draw(m).polygon(EDGE + [(2560, 1440), (2560, 1040)], fill=255)
m = m.filter(ImageFilter.GaussianBlur(1.2))
im.paste(Image.new('RGB', im.size, (182, 179, 180)), (0, 0), m)
im.save(os.path.join(ART, 'gaku_log_clean.png')); print('wrote assets/art/gaku_log_clean.png')
