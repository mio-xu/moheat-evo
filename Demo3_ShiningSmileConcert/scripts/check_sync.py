"""Repeatable sync check for Demo 3 — video, audio and both thermal CSVs on one 150 s timeline.
  python3 scripts/check_sync.py        (exit code 1 if any check fails) → analysis/sync_report.json
"""
import csv, json, os, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import concert as C
import music_features as MF

def dur(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip() or "nan")

def stream(path, sel, entry):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", sel, "-show_entries", f"stream={entry}", "-of", "csv=p=0", path], capture_output=True, text=True)
    return r.stdout.strip().splitlines()[0].strip(",") if r.stdout.strip() else ""

def main():
    res, ok = {}, True
    def check(name, cond, detail):
        nonlocal ok
        res[name] = dict(ok=bool(cond), detail=detail); ok &= bool(cond)
        print(("PASS " if cond else "FAIL ") + f"{name}: {detail}")
    wav = os.path.join(ROOT, "audio", "final", "final_stereo_150s.wav")
    mp4 = os.path.join(ROOT, "video", "final", "final_concert_150s.mp4")
    d_wav = dur(wav); check("audio duration", abs(d_wav - 150) < .002, f"{d_wav:.4f} s, {stream(wav, 'a:0', 'sample_rate')} Hz, {stream(wav, 'a:0', 'channels')} ch")
    if os.path.exists(mp4):
        d_mp4 = dur(mp4); fps = stream(mp4, "v:0", "r_frame_rate"); nfr = stream(mp4, "v:0", "nb_frames")
        check("video duration / fps", abs(d_mp4 - 150) < .05 and fps == "30/1" and nfr == "4500", f"{d_mp4:.3f} s, {fps} fps, {nfr} frames, {stream(mp4, 'v:0', 'width')}×{stream(mp4, 'v:0', 'height')}")
        check("video audio = 48 kHz stereo", stream(mp4, "a:0", "sample_rate") == "48000" and stream(mp4, "a:0", "channels") == "2", "AAC in MP4")
    else:
        check("video exists", False, "render scripts/render_mp4.py first")
    for mode in ("A", "B"):
        rows = list(csv.DictReader(open(os.path.join(ROOT, "thermal", f"thermal_mode_{mode}.csv"))))
        t = np.array([float(r["time_s"]) for r in rows])
        check(f"CSV mode {mode}: 3000 samples, 0 … 149.95 s, 20 Hz", len(t) == 3000 and t[0] == 0 and abs(t[-1] - 149.95) < 1e-6 and np.allclose(np.diff(t), .05),
              f"{len(t)} rows, {t[0]:.2f} … {t[-1]:.2f}")
        L = {k: np.array([float(r[k]) for r in rows]) for k in ("L_cool", "R_cool", "L_heat", "R_heat")}
        check(f"CSV mode {mode}: one mode per ear", not np.any((L["L_cool"] > 0) & (L["L_heat"] > 0)) and not np.any((L["R_cool"] > 0) & (L["R_heat"] > 0)), "firmware rule")
        check(f"CSV mode {mode}: ends at zero", all(L[k][-1] == 0 for k in L), "last sample 0 on all channels")
        if mode == "B":
            pos = C.positions(t); az = pos["A"][0]
            heat_side = np.sign(L["R_heat"] - L["L_heat"]); stage_side = np.sign(np.sin(np.radians(az)))
            # compare 0.6 s later in the stage position (the CSV is sent earlier by the heat lead)
            lead = int(.6 * 20); m = (np.abs(L["R_heat"] - L["L_heat"]) > .15) & (np.abs(az) > 12)
            agree = np.mean(heat_side[m][:-lead] == stage_side[m][lead:]) if m.sum() > lead else 1.0
            check("Mode B: heat side follows Ayane's stage side", agree > .85, f"{agree:.0%} of clearly one-sided heat samples")
            cue = np.zeros(len(t), bool)
            for c in C.cool_cues(): cue |= (t >= c["t"]) & (t <= c["t"] + c["dur"])
            caz = pos["C"][0]; m2 = cue & (np.abs(L["R_cool"] - L["L_cool"]) > .15) & (np.abs(caz) > 20)
            agree2 = np.mean(np.sign(L["R_cool"] - L["L_cool"])[m2] == np.sign(np.sin(np.radians(caz)))[m2]) if m2.sum() else 1.0
            check("Mode B: cooling side follows the ice FX", agree2 > .8, f"{agree2:.0%} of clearly one-sided cooling samples during ice cues")
    feats = list(csv.DictReader(open(os.path.join(ROOT, "analysis", "music_features.csv"))))
    check("features grid = 3000 × 50 ms", len(feats) == 3000, f"{len(feats)} rows")
    # the analysed file IS the final music: re-measure RMS from the final WAV and correlate
    x = MF.load(wav)
    rms_final = np.array([20 * np.log10(np.sqrt(np.mean(x[int(i * 2400): int(i * 2400) + 2400] ** 2)) + 1e-9) for i in range(3000)])
    rms_feat = np.array([float(r["rms"]) for r in feats])
    lag = max(range(-10, 11), key=lambda k: np.corrcoef(rms_final[10:-10], np.roll(rms_feat, k)[10:-10])[0, 1])
    check("music features aligned with the final audio", abs(lag) <= 1, f"best lag {lag * 50} ms")
    rows = list(csv.DictReader(open(os.path.join(ROOT, "thermal", "drive_features.csv"))))
    heat = np.array([float(r["heat_drive"]) for r in rows]); voc = np.array([float(r["vocal_n"]) for r in rows])
    check("heat follows real music energy", np.corrcoef(heat, voc)[0, 1] > .5, f"corr(heat drive, vocal) = {np.corrcoef(heat, voc)[0, 1]:.2f}")
    json.dump(res, open(os.path.join(ROOT, "analysis", "sync_report.json"), "w"), indent=1, ensure_ascii=False)
    print("ALL PASS" if ok else "SOME CHECKS FAILED"); sys.exit(0 if ok else 1)

if __name__ == "__main__":
    main()
