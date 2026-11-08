"""python3 scripts/web_take.py <name> — the newest Seedance website download (~/Downloads/seedance2-5-image-*) → assets/art/<name>.png,
plus a JPG under 4 MB in assets/art/web/ (to upload it as the base of its own variants). Used when the API cannot upload (guide §5.3)."""
import glob, os, sys, time
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, 'assets', 'art')
name = sys.argv[1]
for _ in range(60):
    fs = [f for f in glob.glob(os.path.expanduser('~/Downloads/seedance2-5-image-*')) if time.time() - os.path.getmtime(f) < 180 and not f.endswith(('download', '.crdownload'))]
    if fs: break
    time.sleep(1)
else: sys.exit('no new download')
f = max(fs, key=os.path.getmtime); im = Image.open(f); im.load(); im = im.convert('RGB')
im.save(os.path.join(ART, name + '.png')); os.remove(f)
os.makedirs(os.path.join(ART, 'web'), exist_ok=True); im.save(os.path.join(ART, 'web', name + '.jpg'), quality=92)
print(name, im.size)
