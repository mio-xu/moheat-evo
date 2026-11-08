"""Cover: the ?cover=1 page (genkan still pushed right, title on the left, title on the left) → media/cover.jpg + the site menu thumbnail.
  python3 scripts/make_cover.py     (needs the repo-root server: python3 -m http.server 8765)"""
import os, subprocess
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
raw = os.path.join(ROOT, "media", "cover_raw.png")
subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080", "--virtual-time-budget=6000",
                f"--screenshot={raw}", "http://localhost:8765/demos/healing/Demo29_FamilyVisit/index.html?cover=1"], check=True, capture_output=True)
im = Image.open(raw).convert("RGB"); os.remove(raw)
im.save(os.path.join(ROOT, "media", "cover.jpg"), quality=90)
im.resize((480, 270), Image.LANCZOS).save(os.path.join(SITE, "assets", "images", "demos", "Demo29_FamilyVisit.jpg"), quality=84)
print("cover written")
