"""Render the browser player to video/final/final_seasons_express_150s.mp4 (1920×1080, 30 fps, 48 kHz binaural).
Deterministic: headless Chrome steps the timeline frame by frame.

  python3 scripts/render_mp4.py               # full film (≈5–10 min)
  python3 scripts/render_mp4.py --at 10,30,75 # preview stills → video/clips/preview/<frame>.jpg
  python3 scripts/render_mp4.py --at 10 --clean   # same without title cards / cover / thermal glow (Seedance first frames)
"""
import http.server, os, shutil, subprocess, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(os.path.dirname(ROOT))   # repo root (device.js)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 8770
done = threading.Event()
OUT_DIR = [os.path.join(ROOT, "video", "clips", "frames")]


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=SITE, **k)
    def log_message(self, *a): pass
    def do_PUT(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        if self.path.startswith("/frame/"):
            with open(os.path.join(OUT_DIR[0], os.path.basename(self.path)), "wb") as f: f.write(body)
        elif self.path == "/done":
            done.set()
        self.send_response(204); self.end_headers()


def run_chrome(query, total):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}/demos/Demo4_SeasonsExpress/index.html?{query}"
    prof = os.path.join(ROOT, "video", "clips", ".chrome")
    chrome = subprocess.Popen([CHROME, "--headless=new", "--hide-scrollbars", "--window-size=1920,1080", "--autoplay-policy=no-user-gesture-required",
                               "--user-data-dir=" + prof, url], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    try:
        while not done.wait(5):
            print(f"  {len(os.listdir(OUT_DIR[0]))} / {total} frames  ({time.time() - t0:.0f} s)", flush=True)
            if time.time() - t0 > 3600: raise TimeoutError
    finally:
        chrome.terminate(); srv.shutdown(); shutil.rmtree(prof, ignore_errors=True)


def main():
    if "--at" in sys.argv:
        at = sys.argv[sys.argv.index("--at") + 1]
        OUT_DIR[0] = os.path.join(ROOT, "video", "clips", "preview"); shutil.rmtree(OUT_DIR[0], ignore_errors=True); os.makedirs(OUT_DIR[0])
        run_chrome(f"render=1&at={at}" + ("&clean=1" if "--clean" in sys.argv else ""), len(at.split(",")))
        print("preview →", OUT_DIR[0]); return
    frames = OUT_DIR[0]; shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
    run_chrome("render=1", 4500)
    os.makedirs(os.path.join(ROOT, "video", "final"), exist_ok=True)
    out = os.path.join(ROOT, "video", "final", "final_seasons_express_150s.mp4")
    main_mp4 = out + ".main.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(frames, "%05d.jpg"),
                    "-i", os.path.join(ROOT, "audio", "final", "final_binaural_150s.wav"), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", main_mp4], check=True)
    cover = os.path.join(ROOT, "media", "cover.jpg")
    if os.path.exists(cover):   # embed the cover as the file thumbnail (separate pass: a 1-frame stream must not affect -shortest)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", main_mp4, "-i", cover, "-map", "0", "-map", "1", "-c", "copy",
                        "-c:v:1", "mjpeg", "-disposition:v:1", "attached_pic", "-movflags", "+faststart", out], check=True)
        os.remove(main_mp4)
    else:
        os.replace(main_mp4, out)
    shutil.rmtree(frames, ignore_errors=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
