"""assets/art/<name>_vN.png (raw Seedance 2K, not in git) → media/art/<name>.jpg (1920x1080, q86) for the page.
The chosen version of each still is listed in PICK (user-approved)."""
import os
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PICK = {'wake_bed': 'v1', 'window_sill': 'v2', 'kitchen_fridge': 'v1', 'laundry_pile': 'v1', 'laundry_inside': 'v1', 'sofa_chest': 'v1'}
out = os.path.join(ROOT, 'media', 'art'); os.makedirs(out, exist_ok=True)
for n, v in PICK.items():
    im = Image.open(os.path.join(ROOT, 'assets', 'art', f'{n}_{v}.png')).convert('RGB').resize((1920, 1080), Image.LANCZOS)
    im.save(os.path.join(out, n + '.jpg'), quality=86, optimize=True, progressive=True)
    print(n, os.path.getsize(os.path.join(out, n + '.jpg')) // 1024, 'KB')
