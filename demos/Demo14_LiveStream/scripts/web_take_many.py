"""python3 scripts/web_take_many.py name1 name2 ... — the website's Download button saved these in this order (a few seconds
apart): map the newest N ~/Downloads/seedance2-5-image-* files (oldest first) to the names, like web_take.py."""
import glob, os, sys, time
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
names = sys.argv[1:]
for _ in range(30):
    fs = sorted([f for f in glob.glob(os.path.expanduser('~/Downloads/seedance2-5-image-*')) if time.time() - os.path.getmtime(f) < 600 and not f.endswith('download')], key=os.path.getmtime)
    if len(fs) >= len(names): break
    time.sleep(1)
fs = fs[-len(names):]
if len(fs) != len(names): sys.exit(f'only {len(fs)} downloads for {len(names)} names')
for f, name in zip(fs, names):
    im = Image.open(f); im.load()
    im.convert('RGB').save(os.path.join(ROOT, 'assets', 'art', name + '.png')); os.remove(f)
    j = im.convert('RGB'); j.thumbnail((2048, 2048)); j.save(os.path.join(ROOT, 'assets', 'art', 'web', name + '.jpg'), quality=90)
    print(name, im.size)
