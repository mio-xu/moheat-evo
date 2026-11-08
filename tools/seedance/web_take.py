"""python3 tools/seedance/web_take.py <demo folder> <name> — the newest Seedance website download (~/Downloads/seedance2-5-image-*)
→ <demo>/assets/art/<name>.png, plus a JPG under 4 MB in <demo>/assets/art/web/ (to upload it as the base of its own variants).
Used when the API cannot upload (DEMO_DESIGN_GUIDE §5.3, §6 标准制作流程). Page helpers: tools/seedance/web_helpers.js."""
import glob, os, sys, time
from PIL import Image
demo, name = os.path.abspath(sys.argv[1]), sys.argv[2]
ART = os.path.join(demo, 'assets', 'art')
for _ in range(60):
    fs = [f for f in glob.glob(os.path.expanduser('~/Downloads/seedance2-5-image-*')) if time.time() - os.path.getmtime(f) < 180 and not f.endswith(('download', '.crdownload'))]
    if fs: break
    time.sleep(1)
else: sys.exit('no new download')
f = max(fs, key=os.path.getmtime); im = Image.open(f); im.load(); im = im.convert('RGB')
os.makedirs(os.path.join(ART, 'web'), exist_ok=True)
im.save(os.path.join(ART, name + '.png')); os.remove(f); im.save(os.path.join(ART, 'web', name + '.jpg'), quality=92)
print(name, im.size)
