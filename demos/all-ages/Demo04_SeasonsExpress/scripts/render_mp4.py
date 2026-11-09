"""Render the browser player to video/final/final_seasons_express_150s.mp4 (1920×1080, 30 fps, 48 kHz binaural).
Deterministic: headless Chrome steps the timeline frame by frame.

  python3 scripts/render_mp4.py               # full film (≈5–10 min)
  python3 scripts/render_mp4.py --at 10,30,75 # preview stills → video/clips/preview/<frame>.jpg
  python3 scripts/render_mp4.py --at 10 --clean   # same without title cards / cover / thermal glow (Seedance first frames)
"""
import http.server, os, shutil, subprocess, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.dirname(os.path.dirname(os.path.dirname(ROOT)))   # repo root (device.js)
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = int(os.environ.get("RENDER_PORT", 8771))
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
    url = f"http://127.0.0.1:{PORT}/demos/all-ages/{os.path.basename(ROOT)}/index.html?{query}"
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


def film_audio():
    """the binaural mix + the conductor's Japanese voice (user 2026-11-09: every voice is Japanese) → audio/final/film_ja.wav"""
    import json, wave
    import numpy as np
    src = os.path.join(ROOT, "audio", "final", "final_binaural_150s.wav")
    sr = 48000   # the mix is WAVE_FORMAT_EXTENSIBLE (python's wave cannot read it): decode with ffmpeg
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-f", "f32le", "-ac", "2", "-ar", str(sr), "-"], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
    v = open(os.path.join(ROOT, "media", "voice.js"), encoding="utf-8").read(); V = json.loads(v[v.index("{"):v.rindex("}") + 1])
    GAIN = {"holo": (.42, .42), "ear": (.12, .95), "aisle": (.45, .45)}   # hologram speaker in front, whisper at the right ear, in the aisle
    for lid, L in V["lines"].items():
        with wave.open(os.path.join(ROOT, "audio", "voice", f"{lid}.ja.wav")) as w: y = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        y = np.interp(np.arange(int(len(y) * sr / 24000)) * 24000 / sr, np.arange(len(y)), y)
        a = int(L["t"] * sr); n = min(len(y), len(x) - a); gl, gr = GAIN[L["where"]]
        x[a:a + n, 0] += y[:n] * gl; x[a:a + n, 1] += y[:n] * gr
    pk = np.abs(x).max(); x *= min(1, .97 / pk)
    out = os.path.join(ROOT, "audio", "final", "film_ja.wav")
    with wave.open(out, "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype(np.int16).tobytes())
    return out


def main():
    if "--cover" in sys.argv:   # media/cover/art.webp (UI v2 cover art: the split carriage + the conductor), then tools/web/covers.py
        OUT_DIR[0] = os.path.join(ROOT, "video", "clips", "cover"); shutil.rmtree(OUT_DIR[0], ignore_errors=True); os.makedirs(OUT_DIR[0])
        extra = sys.argv[sys.argv.index("--cover") + 1] if len(sys.argv) > sys.argv.index("--cover") + 1 else ""
        run_chrome("coverart=1" + (("&" + extra) if extra else ""), 1)
        from PIL import Image
        os.makedirs(os.path.join(ROOT, "media", "cover"), exist_ok=True)
        Image.open(os.path.join(OUT_DIR[0], "cover_art.png")).convert("RGB").save(os.path.join(ROOT, "media", "cover", "art.webp"), quality=90)
        print("cover art → media/cover/art.webp"); return
    if "--at" in sys.argv:
        at = sys.argv[sys.argv.index("--at") + 1]
        OUT_DIR[0] = os.path.join(ROOT, "video", "clips", "preview"); shutil.rmtree(OUT_DIR[0], ignore_errors=True); os.makedirs(OUT_DIR[0])
        run_chrome(f"render=1&at={at}" + ("&clean=1" if "--clean" in sys.argv else ""), len(at.split(",")))
        print("preview →", OUT_DIR[0]); return
    frames = OUT_DIR[0]
    if "--encode-only" not in sys.argv:   # --encode-only: frames already rendered, only mux the video + soundtrack
        shutil.rmtree(frames, ignore_errors=True); os.makedirs(frames)
        run_chrome("render=1", 4500)
    os.makedirs(os.path.join(ROOT, "video", "final"), exist_ok=True)
    out = os.path.join(ROOT, "video", "final", "final_seasons_express_150s.mp4")
    main_mp4 = out + ".main.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(frames, "%05d.jpg"),
                    "-i", film_audio(), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
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
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools", "qa")); import heavy_lock; heavy_lock.guard("render_mp4 Demo04", browser=True)   # one heavy job at a time
    main()
