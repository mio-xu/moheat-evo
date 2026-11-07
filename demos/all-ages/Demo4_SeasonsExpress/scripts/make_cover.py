"""Cover: background = a rendered frame of the ice/lava tunnel (left ice, right lava), then the ?cover=1 page.

  python3 scripts/make_cover.py     (needs the repo-root server: python3 -m http.server 8765)
Writes project/cover_bg.jpg, media/art/cover_bg.webp, media/cover.jpg and the site menu thumbnail assets/images/demos/Demo4_SeasonsExpress.jpg.
"""
import os, shutil, subprocess, sys
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
T = 68.0                      # ice tunnel left, lava right (film time)


def main():
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "render_mp4.py"), "--at", str(T)], check=True)
    src = os.path.join(ROOT, "video", "clips", "preview", f"{round(T * 30):05d}.jpg")
    shutil.copy(src, os.path.join(ROOT, "project", "cover_bg.jpg"))
    Image.open(src).save(os.path.join(ROOT, "media", "art", "cover_bg.webp"), quality=86)
    raw = os.path.join(ROOT, "media", "cover_raw.png")
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080", "--virtual-time-budget=6000",
                    f"--screenshot={raw}", "http://localhost:8765/demos/all-ages/Demo4_SeasonsExpress/index.html?cover=1"], check=True, capture_output=True)
    im = Image.open(raw).convert("RGB"); os.remove(raw)
    im.save(os.path.join(ROOT, "media", "cover.jpg"), quality=90)
    im.resize((480, 270), Image.LANCZOS).save(os.path.join(SITE, "assets", "images", "demos", "Demo4_SeasonsExpress.jpg"), quality=84)
    print("cover written")


if __name__ == "__main__":
    main()
