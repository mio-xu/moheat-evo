"""Render the browser player to video/final/final_future_whisky_150s.mp4 (1920×1080, 30 fps, ja/en subtitles burned in,
48 kHz binaural mix).  Deterministic: headless Chrome steps the timeline frame by frame.

  python3 scripts/render_mp4.py        (≈5–10 min)

This is the final film of the demo.
"""
import http.server, os, shutil, subprocess, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))   # repo root (device.js)
FRAMES = os.path.join(ROOT, "video", "frames")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = 8770
done = threading.Event()


class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=SITE, **k)
    def log_message(self, *a): pass
    def do_PUT(self):
        n = int(self.headers.get("Content-Length", 0)); body = self.rfile.read(n)
        if self.path.startswith("/frame/"):
            with open(os.path.join(FRAMES, os.path.basename(self.path)), "wb") as f: f.write(body)
        elif self.path == "/done":
            done.set()
        self.send_response(204); self.end_headers()


def main():
    shutil.rmtree(FRAMES, ignore_errors=True); os.makedirs(FRAMES)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{PORT}/demos/nobunaga-suntory/Demo6_FutureWhisky/index.html?render=1"
    chrome = subprocess.Popen([CHROME, "--headless=new", "--hide-scrollbars", "--window-size=1920,1080",
                               "--user-data-dir=" + os.path.join(ROOT, "video", ".chrome"), url],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    t0 = time.time()
    try:
        while not done.wait(10):
            print(f"  {len(os.listdir(FRAMES))} / 4500 frames  ({time.time() - t0:.0f} s)", flush=True)
    finally:
        chrome.terminate(); srv.shutdown()
    os.makedirs(os.path.join(ROOT, "video", "final"), exist_ok=True); out = os.path.join(ROOT, "video", "final", "final_future_whisky_150s.mp4")
    main_mp4 = out + ".main.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(FRAMES, "%05d.jpg"),
                    "-i", os.path.join(ROOT, "audio", "final", "mix_48k.wav"), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
                    "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest", "-movflags", "+faststart", main_mp4], check=True)
    cover = os.path.join(ROOT, "media", "cover.jpg")
    if os.path.exists(cover):   # embed the cover as the file thumbnail (separate pass: a 1-frame stream must not affect -shortest)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", main_mp4, "-i", cover, "-map", "0", "-map", "1", "-c", "copy",
                        "-c:v:1", "mjpeg", "-disposition:v:1", "attached_pic", "-movflags", "+faststart", out], check=True)
        os.remove(main_mp4)
    else:
        os.replace(main_mp4, out)
    shutil.rmtree(FRAMES, ignore_errors=True); shutil.rmtree(os.path.join(ROOT, "video", ".chrome"), ignore_errors=True)
    print("wrote", out)


if __name__ == "__main__":
    main()
