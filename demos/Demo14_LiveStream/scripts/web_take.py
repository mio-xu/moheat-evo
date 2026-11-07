"""python3 scripts/web_take.py <name> — move the newest ~/Downloads/seedance2-5-image-*.png (saved in the last 90 s by the
website's Download button) to assets/art/<name>.png, plus a JPG copy for the next uploads (assets/art/web/)."""
import glob, os, sys, time
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
name = sys.argv[1]
for _ in range(30):
    fs = [f for f in glob.glob(os.path.expanduser('~/Downloads/seedance2-5-image-*')) if time.time() - os.path.getmtime(f) < 90 and not f.endswith('download')]
    if fs: break
    time.sleep(1)
else: sys.exit('no new download')
f = max(fs, key=os.path.getmtime); im = Image.open(f); im.load()
im.convert('RGB').save(os.path.join(ROOT, 'assets', 'art', name + '.png')); os.remove(f)
j = im.convert('RGB'); j.thumbnail((2048, 2048)); os.makedirs(os.path.join(ROOT, 'assets', 'art', 'web'), exist_ok=True); j.save(os.path.join(ROOT, 'assets', 'art', 'web', name + '.jpg'), quality=90)
print(name, im.size)
