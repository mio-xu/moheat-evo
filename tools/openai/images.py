#!/usr/bin/env python3
"""OpenAI image API (gpt-image-2) for demo art — edits with reference images and text-to-image, no browser, no Seedance upload limit.

  python3 tools/openai/images.py <demo folder> <job> [<job> …] [--size 2560x1440] [--quality high] [--model gpt-image-2] [--force]

Jobs come from <demo>/project/web_prompts.json ({job: {ref, prompt}}, written by the demo's scripts/seedance.py prompts):
  ref = "dXX:<still>" → <demo>/assets/art/web/dXX_<still>.jpg (an original demo's picture), a job name → <demo>/assets/art/<job>.png,
        null → text-to-image; a LIST of refs sends several reference images (e.g. a wide shot + a close-up to lock the look, Demo31).
--mask "cx,cy,rx,ry;…" (or "mask" in the job): only those ellipses may change — use it for mouth / blink variants so the
face around them stays pixel-identical. Writes <demo>/assets/art/<job>.png (+ assets/art/web/<job>.jpg) and appends usage to <demo>/project/openai_log.json.
Key: ~/.openai_key (one line, chmod 600) or OPENAI_API_KEY. Pillow only (multipart built by hand).
"""
import argparse, base64, io, json, os, sys, time, urllib.error, urllib.request, uuid
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("demo"); ap.add_argument("jobs", nargs="+")
ap.add_argument("--size", default="2560x1440"); ap.add_argument("--quality", default="high"); ap.add_argument("--model", default="gpt-image-2")
ap.add_argument("--force", action="store_true")
ap.add_argument("--mask", default="", help="cx,cy,rx,ry[;…] ellipses (reference-image px) the model may change; the rest stays pixel-identical")
a = ap.parse_args()
D = os.path.abspath(a.demo); ART = os.path.join(D, "assets", "art"); os.makedirs(os.path.join(ART, "web"), exist_ok=True)
KEY = os.environ.get("OPENAI_API_KEY") or open(os.path.expanduser("~/.openai_key")).read().strip()
P = json.load(open(os.path.join(D, "project", "web_prompts.json")))
LOG = os.path.join(D, "project", "openai_log.json")


def ref_path(ref):
    if not ref: return None
    if ":" in ref:
        pre, still = ref.split(":", 1); return os.path.join(ART, "web", f"{pre}_{still}.jpg")
    return os.path.join(ART, ref + ".png")


def png_bytes(path, max_side=2560):
    im = Image.open(path).convert("RGB"); im.thumbnail((max_side, max_side))
    b = io.BytesIO(); im.save(b, "PNG"); return b.getvalue()


def call(path, fields, files=()):
    url = "https://api.openai.com/v1/images/" + path
    if files:
        bnd = uuid.uuid4().hex; body = b""
        for k, v in fields.items(): body += f"--{bnd}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode()
        for k, (fn, data) in files: body += f"--{bnd}\r\nContent-Disposition: form-data; name=\"{k}\"; filename=\"{fn}\"\r\nContent-Type: image/png\r\n\r\n".encode() + data + b"\r\n"
        body += f"--{bnd}--\r\n".encode(); ctype = f"multipart/form-data; boundary={bnd}"
    else:
        body = json.dumps(fields).encode(); ctype = "application/json"
    req = urllib.request.Request(url, data=body, method="POST", headers={"Authorization": "Bearer " + KEY, "Content-Type": ctype})
    for i in range(4):
        try: return json.load(urllib.request.urlopen(req, timeout=600))
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:600]
            if e.code in (429, 500, 502, 503) and i < 3: print(f"  {e.code}, retry in {20 * (i + 1)}s: {msg[:120]}", flush=True); time.sleep(20 * (i + 1)); continue
            raise SystemExit(f"HTTP {e.code}: {msg}")


log = json.load(open(LOG)) if os.path.exists(LOG) else {}
for job in a.jobs:
    dst = os.path.join(ART, job + ".png")
    if os.path.exists(dst) and not a.force: print("exists", job); continue
    j = P[job]; refs = j.get("ref"); refs = refs if isinstance(refs, list) else [refs] if refs else []   # ref may be a list (several references)
    rps = [ref_path(r) for r in refs]; rp = rps[0] if rps else None
    fields = {"model": a.model, "prompt": j["prompt"], "size": a.size, "quality": a.quality, "n": 1}
    t0 = time.time(); print(f"[{job}] {'edit ← ' + os.path.basename(rp) if rp else 'text-to-image'} {a.size} {a.quality}", flush=True)
    files = [("image[]", (os.path.basename(q).rsplit('.', 1)[0] + ".png", png_bytes(q))) for q in rps]
    mk = a.mask or j.get("mask", "")
    if mk and rp:   # only the masked area may change (user: the open mouth must sit exactly where the closed one was)
        from PIL import ImageDraw
        base = Image.open(rp); mask = Image.new("RGBA", base.size, (0, 0, 0, 255)); dr = ImageDraw.Draw(mask)
        for e in mk.split(";"):
            cx, cy, rx, ry = [float(v) for v in e.split(",")]; dr.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(0, 0, 0, 0))
        mask.thumbnail((2560, 2560)); bm = io.BytesIO(); mask.save(bm, "PNG"); files.append(("mask", ("mask.png", bm.getvalue())))
    r = call("edits", {k: str(v) for k, v in fields.items()}, files) if rp \
        else call("generations", fields)
    im = Image.open(io.BytesIO(base64.b64decode(r["data"][0]["b64_json"]))).convert("RGB")
    im.save(dst); im.save(os.path.join(ART, "web", job + ".jpg"), quality=92)
    log = json.load(open(LOG)) if os.path.exists(LOG) else {}   # re-read: parallel runs on the same demo share this log
    prev = log.get(job) or {}   # a re-run keeps the earlier spend (tools/report/balances.py budget per demo)
    log[job] = {"model": a.model, "size": a.size, "quality": a.quality, "seconds": round(time.time() - t0), "usage": r.get("usage"), "out": list(im.size),
                **({"prior_usage": (prev.get("prior_usage") or []) + [prev.get("usage")]} if prev else {})}
    json.dump(log, open(LOG + ".tmp", "w"), indent=1); os.replace(LOG + ".tmp", LOG)
    print(f"  saved {job} {im.size} in {time.time() - t0:.0f}s usage {r.get('usage')}", flush=True)
