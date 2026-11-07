"""python3 scripts/web_take_v2.py <name> — like web_take.py, but for round 4 (new places): the newest website download →
assets/art/v2/<name>.png, plus a JPG copy for later uploads (assets/art/v2/web/)."""
import glob, os, sys, time
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V2 = os.path.join(ROOT, 'assets', 'art', 'v2')
name = sys.argv[1]
for _ in range(30):
    fs = [f for f in glob.glob(os.path.expanduser('~/Downloads/seedance2-5-image-*')) if time.time() - os.path.getmtime(f) < 120 and not f.endswith('download')]
    if fs: break
    time.sleep(1)
else: sys.exit('no new download')
f = max(fs, key=os.path.getmtime); im = Image.open(f); im.load()
os.makedirs(os.path.join(V2, 'web'), exist_ok=True)
im.convert('RGB').save(os.path.join(V2, name + '.png')); os.remove(f)
j = im.convert('RGB'); j.thumbnail((2048, 2048)); j.save(os.path.join(V2, 'web', name + '.jpg'), quality=90)
print(name, im.size)
