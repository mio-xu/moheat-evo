#!/usr/bin/env python3
"""assets/video/*.mp4 (Seedance, 1344×768, not in git) → media/video/*.mp4 (1280×720 H.264 24 fps, no audio).

Loops: Seedance's last frame drifts a little in tone from the first, so the loop is rebuilt frame by frame: the clip starts X frames
in, and its last X frames are blended into the first X frames of the original — the final output frame IS original frame X−1 and
the loop wraps to original frame X: one natural step, no pop. Transitions (v_take_hand, v_lean_in) are only re-encoded."""
import os, subprocess, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H, X = 1280, 720, 12           # X frames = 0.5 s at 24 fps
ONCE = {'v_take_hand', 'v_lean_in'}


def read(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-vf', f'scale={W}:{H},setsar=1,fps=24', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def write(frames, p):
    enc = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', p], stdin=subprocess.PIPE)
    for f in frames: enc.stdin.write(np.ascontiguousarray(f, np.uint8).tobytes())
    enc.stdin.close(); enc.wait()


os.makedirs(os.path.join(ROOT, 'media', 'video'), exist_ok=True)
for fn in sorted(os.listdir(os.path.join(ROOT, 'assets', 'video'))):
    if not fn.endswith('.mp4'): continue
    n = fn[:-4]; src = read(os.path.join(ROOT, 'assets', 'video', fn)); N = len(src)
    if n in ONCE: out = list(src)
    else:
        out = []
        for i in range(X, N):
            if i >= N - X:                       # tail → head blend
                w = (i - (N - X) + 1) / X
                out.append(src[i].astype(np.float32) * (1 - w) + src[i - (N - X)].astype(np.float32) * w)
            else: out.append(src[i])
    write(out, os.path.join(ROOT, 'media', 'video', fn))
    seam = np.abs(out[-1].astype(float) - out[0].astype(float)).mean()
    print(f'{n}: {N} → {len(out)} frames, loop seam {seam:.2f}' if n not in ONCE else f'{n}: {N} frames (transition)')
