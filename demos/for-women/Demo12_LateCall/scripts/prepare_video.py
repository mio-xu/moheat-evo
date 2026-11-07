#!/usr/bin/env python3
"""Demo22 (copied from Demo20_HinataHandshake/scripts/prepare_video.py, stills = media/art WebPs (Demo12)). assets/video/<clip>.mp4 (Seedance web downloads, not in git) → media/video/<clip>.mp4 (1920×1080 H.264 24 fps, no audio).

Handoff §4b: every clip must start and end EXACTLY on its stills, so the player can hard-cut between clips at their ends.
The model drifts (tone a little brighter, a few pixels off) → for each clip (first / last still from project/web_video_prompts.json):
  1. colour: per-channel gain + offset that maps the clip's first frame onto the first still and its last frame onto the last
     still, interpolated over the clip (removes the slow tone drift without touching the motion);
  0. position: the few-pixel offset of the first / last frame (phase correlation), interpolated over the clip;
  2. ends: the first K frames are blended from the first still into the clip, the last K frames from the clip into the last
     still (frame 0 = first still, last frame = last still, pixel for pixel).
  python3 scripts/prepare_video.py [clip ...]
"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageOps

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, FPS, K, KE = 1920, 1080, 24, 6, 10   # K frames blended in from the first still, KE out to the last still
JOBS = json.load(open(os.path.join(ROOT, 'project', 'web_video_prompts.json')))['clips']


def still(name):   # the stills the page shows (media/art/*.jpg, 1920×1080); '<name>_r' = mirrored
    mirror = name.endswith('_r'); base = name[:-2] if mirror else name
    im = Image.open(os.path.join(ROOT, 'media', 'art', base + '.webp')).convert('RGB').resize((W, H), Image.LANCZOS)
    return np.asarray(ImageOps.mirror(im) if mirror else im, np.float32)


def read(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-vf', f'scale={W}:{H}:flags=lanczos,setsar=1,fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def fit(src, dst):   # per-channel gain/offset mapping src's mean/std onto dst's
    s_m, s_s = src.reshape(-1, 3).mean(0), src.reshape(-1, 3).std(0) + 1e-3
    d_m, d_s = dst.reshape(-1, 3).mean(0), dst.reshape(-1, 3).std(0)
    g = d_s / s_s; return g, d_m - g * s_m


def shift(frame, ref):   # integer (dx, dy) that moves `frame` onto `ref` (phase correlation on luminance)
    a = frame.astype(np.float32).mean(2); b = ref.mean(2)
    R = np.fft.fft2(b - b.mean()) * np.conj(np.fft.fft2(a - a.mean())); r = np.fft.ifft2(R / (np.abs(R) + 1e-9)).real
    y, x = np.unravel_index(r.argmax(), r.shape)
    return (x - W if x > W // 2 else x), (y - H if y > H // 2 else y)


def move(x, dx, dy):     # translate with edge padding
    if dx == 0 and dy == 0: return x
    p = np.pad(x, ((abs(dy),) * 2, (abs(dx),) * 2, (0, 0)), mode='edge')
    return p[abs(dy) - dy:abs(dy) - dy + H, abs(dx) - dx:abs(dx) - dx + W]


def main(names):
    enc_args = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart']
    os.makedirs(os.path.join(ROOT, 'media', 'video'), exist_ok=True)
    for n in names:
        src_p = os.path.join(ROOT, 'assets', 'video', n + '.mp4')
        if not os.path.exists(src_p): print('missing', n); continue
        job = JOBS[n]; a, b = still(job['first']), still(job['last'])
        fr = read(src_p); N = len(fr)
        s0, s1 = shift(fr[0], a), shift(fr[-1], b)          # the model's frames sit a few px off the stills
        g0, o0 = fit(move(fr[0], *s0).astype(np.float32), a); g1, o1 = fit(move(fr[-1], *s1).astype(np.float32), b)
        out = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', *enc_args,
                                os.path.join(ROOT, 'media', 'video', n + '.mp4')], stdin=subprocess.PIPE)
        d_first = d_last = 0
        for i, f in enumerate(fr):
            u = i / max(1, N - 1)
            f = move(f, round((1 - u) * s0[0] + u * s1[0]), round((1 - u) * s0[1] + u * s1[1]))
            x = f.astype(np.float32) * ((1 - u) * g0 + u * g1) + ((1 - u) * o0 + u * o1)
            if i < K: w = 1 - i / K; x = x * (1 - w) + a * w                         # i = 0 → exactly the first still
            if i > N - 1 - KE: w = 1 - (N - 1 - i) / KE; x = x * (1 - w) + b * w       # i = N−1 → exactly the last still
            x = np.clip(x, 0, 255)
            if i == 0: d_first = np.abs(x - a).mean()
            if i == N - 1: d_last = np.abs(x - b).mean()
            out.stdin.write(x.astype(np.uint8).tobytes())
        out.stdin.close(); out.wait()
        al0 = np.abs(move(fr[0], *s0).astype(np.float32) * g0 + o0 - a).mean(); al1 = np.abs(move(fr[-1], *s1).astype(np.float32) * g1 + o1 - b).mean()
        print(f'{n}: {N} frames · shift {s0} / {s1} · aligned ends vs stills {al0:.1f} / {al1:.1f} → exact {d_first:.1f} / {d_last:.1f}')


if __name__ == '__main__':
    main(sys.argv[1:] or list(JOBS))
