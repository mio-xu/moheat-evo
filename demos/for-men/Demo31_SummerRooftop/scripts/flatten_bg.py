#!/usr/bin/env python3
"""A "plain" background that came back as a gradient (warm glow on one side) defeats build_stage.py's colour key, and its
"matte": "ai" fills the gaps inside the hair. This repaints everything OUTSIDE the anime matting model's outline with flat #c8c8c8
→ <name>_flat.png; build_stage's normal colour key then cuts it cleanly (hair gaps included). Uses ~/ml/layers (rembg isnet-anime).

  python3 scripts/flatten_bg.py nagisa_sparkler [nagisa_sparkler_talk …]     # assets/art/<name>.png → <name>_flat.png
"""
import os, subprocess, sys, tempfile
import numpy as np
from PIL import Image, ImageFilter

ART = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets', 'art')
for name in sys.argv[1:]:
    src = os.path.join(ART, name + '.png'); tmp = tempfile.mktemp(suffix='.png')
    subprocess.run([os.path.expanduser('~/ml/layers/bin/python'), '-c',
                    "import sys; from rembg import remove, new_session; from PIL import Image; "
                    "remove(Image.open(sys.argv[1]).convert('RGB'), session=new_session('isnet-anime'), only_mask=True).save(sys.argv[2])",
                    src, tmp], check=True, capture_output=True)
    m = Image.open(tmp).convert('L'); os.remove(tmp)
    im = Image.open(src).convert('RGB')
    flat = Image.new('RGB', im.size, (200, 200, 200))
    # keep only what the model is sure is figure: its soft edge still holds the old gradient → a light halo (tried > 40 and a 9 / 3 px margin)
    out = Image.composite(im, flat, m.point(lambda v: 255 if v > 200 else 0))
    out.save(os.path.join(ART, name + '_flat.png')); print('wrote', name + '_flat.png')
