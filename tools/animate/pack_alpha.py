"""Turn a full-frame character clip (e.g. LivePortrait output) into a character-layer video with alpha.

  ~/ml/layers/bin/python tools/animate/pack_alpha.py <clip.mp4> <still_mask.png> <out.mp4> [--box x,y,w,h]

Each frame is matted (isnet-anime), smoothed over time, cropped to the character box and packed as
colour on top / alpha below in one H.264 MP4 (plays everywhere; the page's WebGL shader rebuilds RGBA).
The still's mask (from split_layers.py) is used outside the face area, so only the moving head is re-matted.
Prints the box (in still pixels) for the page.
"""
import argparse, json, subprocess
import numpy as np, cv2
from PIL import Image
from rembg import remove, new_session

ap = argparse.ArgumentParser()
ap.add_argument("clip"); ap.add_argument("mask"); ap.add_argument("out")
ap.add_argument("--box", default="")
ap.add_argument("--pad", type=int, default=40)
a = ap.parse_args()

m0 = cv2.imread(a.mask, cv2.IMREAD_GRAYSCALE)
H, W = m0.shape
if a.box:
    x, y, w, h = map(int, a.box.split(","))
else:
    ys, xs = np.where(m0 > 8)
    x, y = max(0, xs.min() - a.pad), max(0, ys.min() - a.pad)
    w, h = min(W, xs.max() + a.pad) - x, min(H, ys.max() + a.pad) - y
w -= w % 2; h -= h % 2

# head zone = where the clip differs from the still somewhere (LivePortrait only re-renders the face crop)
probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=r_frame_rate",
                        "-of", "csv=p=0", a.clip], capture_output=True, text=True).stdout.strip()
fps = probe or "24"
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", a.clip, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                     capture_output=True, check=True).stdout
frames = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
var = frames[::6].astype(np.int16).std(axis=0).max(axis=2) > 2
zone = cv2.dilate(var.astype(np.uint8), np.ones((61, 61), np.uint8)).astype(bool)
zone = cv2.GaussianBlur(zone.astype(np.float32), (0, 0), 15)
zy, zx = np.where(zone > 0.01)
zb = (zx.min(), zy.min(), zx.max() + 1, zy.max() + 1)
print("frames", len(frames), "head zone", zb)

# the matte may only change a thin band around the still's outline (head motion is a few px):
# inside = always opaque (the matte sometimes drops holes in faces → background flashes through), far outside = always clear
band = 25
core = cv2.erode((m0 > 250).astype(np.uint8), np.ones((band, band), np.uint8)).astype(np.float32)
core = cv2.GaussianBlur(core, (0, 0), 4) * 255
outer = cv2.GaussianBlur(cv2.dilate((m0 > 8).astype(np.uint8), np.ones((band, band), np.uint8)).astype(np.float32), (0, 0), 4)

sess = new_session("isnet-anime")
enc = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h * 2}",
                        "-r", fps, "-i", "-", "-i", a.clip, "-map", "0:v", "-map", "1:a?", "-c:a", "copy",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-movflags", "+faststart", a.out],
                       stdin=subprocess.PIPE)
prev = None
for k, f in enumerate(frames):
    x0, y0, x1, y1 = zb
    head = np.array(remove(Image.fromarray(f[y0:y1, x0:x1]), session=sess, only_mask=True), np.float32)
    al = m0.astype(np.float32).copy()
    zz = zone[y0:y1, x0:x1]
    al[y0:y1, x0:x1] = al[y0:y1, x0:x1] * (1 - zz) + head * zz
    al = np.maximum(al, core) * outer
    if prev is not None:
        al = 0.6 * al + 0.4 * prev  # damp edge flicker
    prev = al
    al8 = np.clip(al, 0, 255).astype(np.uint8)[y:y + h, x:x + w]
    col = f[y:y + h, x:x + w]
    enc.stdin.write(np.vstack([col, np.repeat(al8[..., None], 3, 2)]).tobytes())
    if k % 24 == 0: print(k)
enc.stdin.close(); enc.wait()
print(json.dumps({"box": [int(x), int(y), int(w), int(h)], "size": [W, H]}))
