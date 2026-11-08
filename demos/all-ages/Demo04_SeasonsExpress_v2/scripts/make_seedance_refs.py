"""First / last frame references for the Seedance shots (see project/prompts_seedance.md) → project/seedance_refs/S##_{start,end}.jpg

  python3 scripts/make_seedance_refs.py
Clean renders of the current player (no title cards, cover or thermal glow) at each shot boundary, so the generated
clips keep the same car, the same windows and the same season on each side as the sound and the thermal track.
"""
import os, shutil, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# shot: (start, end or None) in film time — must match the table in project/prompts_seedance.md
SHOTS = {"S01": (0.3, None), "S02": (10, 20), "S03": (20, None), "S04": (30, 40), "S05": (40, None), "S06": (50, None),
         "S07": (60, 70), "S08": (70, 80), "S09": (80, None), "S10": (90.2, None), "S11": (100, None), "S12": (112.0, None),
         "S13": (121.5, 131.5), "S14": (131.5, None), "S15": (141.5, 149.5)}


def main():
    want = {}
    for s, (a, b) in SHOTS.items():
        want[f"{s}_start"] = a
        if b is not None: want[f"{s}_end"] = b
    times = sorted(set(want.values()))
    subprocess.run([sys.executable, os.path.join(ROOT, "scripts", "render_mp4.py"), "--at", ",".join(str(t) for t in times), "--clean"], check=True)
    out = os.path.join(ROOT, "project", "seedance_refs"); shutil.rmtree(out, ignore_errors=True); os.makedirs(out)
    for name, t in sorted(want.items()):
        shutil.copy(os.path.join(ROOT, "video", "clips", "preview", f"{round(t * 30):05d}.jpg"), os.path.join(out, f"{name}.jpg"))
    print(f"{len(want)} reference frames → {out}")


if __name__ == "__main__":
    main()
