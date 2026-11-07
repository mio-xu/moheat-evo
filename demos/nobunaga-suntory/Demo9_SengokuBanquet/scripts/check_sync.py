"""Demo 9 QA — the checklist from the voice brief, measured.   python3 scripts/check_sync.py → analysis/qa_report.json

  1 two voices distinguishable (mean F0 / spectral centroid)     5 positions: ear lines at the right ear, seated lines on his side
  2 no clipped / truncated lines, no same-speaker overlap         6 heat follows voice energy; laugh > speech > whisper > 0
  3 every line has ja + en subtitles, no Chinese track            7 thermal: 3000 rows, 0 same-ear conflicts, ends at zero
  4 lip sync: mouth envelope active during every line             8 mix exactly 150.000 s at 48 kHz
"""
import csv, json, os, subprocess, sys
import numpy as np
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banquet as BQ
STEMS = os.path.join(ROOT, "audio", "stems")


def mono(path):
    tmp = path + ".qa.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-ac", "1", "-c:a", "pcm_f32le", tmp], check=True)
    sr, x = wavfile.read(tmp); os.remove(tmp); return sr, x.astype(np.float64)


def f0(x, sr):
    """Median F0 of voiced 40 ms frames (autocorrelation, 60–300 Hz)."""
    out, n = [], int(.04 * sr)
    for i in range(0, len(x) - n, n):
        f = x[i:i + n]
        if np.sqrt(np.mean(f ** 2)) < .02: continue
        f = f - f.mean(); ac = np.correlate(f, f, "full")[n - 1:]
        lo, hi = int(sr / 300), int(sr / 60)
        k = lo + np.argmax(ac[lo:hi])
        if ac[k] > .45 * ac[0]: out.append(sr / k)
    return float(np.median(out)) if out else 0.0


def main():
    rep, ok = {}, True
    timing = json.load(open(os.path.join(ROOT, "audio", "voice_timing.json")))
    lines = [(c, tm) for c, tm in zip(BQ.CUES, timing) if c["kind"] in ("say", "whisper", "laugh")]
    V = {w: mono(os.path.join(STEMS, f"{w}_voice.wav")) for w in "NI"}
    # 1 voices
    sp = {}
    for w in "NI":
        sr, x = V[w]
        segs = np.concatenate([x[int(c["t"] * sr): int((c["t"] + tm["dur"]) * sr)] for c, tm in lines if c["who"] == w and c["kind"] == "say"])
        mag = np.abs(np.fft.rfft(segs[: sr * 20])); fr = np.fft.rfftfreq(min(len(segs), sr * 20), 1 / sr)
        sp[w] = dict(f0_hz=round(f0(segs, sr), 1), centroid_hz=round(float(np.sum(fr * mag) / np.sum(mag)), 0))
    rep["1_voices"] = dict(**sp, ok=abs(sp["N"]["centroid_hz"] - sp["I"]["centroid_hz"]) > 80 or abs(sp["N"]["f0_hz"] - sp["I"]["f0_hz"]) > 6)
    # 2 truncation / overlap
    bad = []
    for c, tm in lines:
        sr, x = V[c["who"]]
        i0, i1 = int(c["t"] * sr), int((c["t"] + tm["dur"]) * sr)
        edge = max(np.max(np.abs(x[i0: i0 + 96])), np.max(np.abs(x[max(i0, i1 - 96): i1])))
        if edge > .02: bad.append((c["t"], "edge not silent", round(float(edge), 3)))
        if c["t"] + tm["dur"] > BQ.DURATION - .5: bad.append((c["t"], "runs past the end"))
    for w in "NI":
        seq = [(c["t"], tm["dur"]) for c, tm in lines if c["who"] == w]
        bad += [(a[0], f"overlaps {b[0]}") for a, b in zip(seq, seq[1:]) if a[0] + a[1] > b[0]]
    rep["2_no_cut_or_overlap"] = dict(problems=bad, ok=not bad)
    # 3 subtitles
    anim = json.load(open(os.path.join(ROOT, "media", "anim.json")))
    you = [c for c in BQ.CUES if c["kind"] == "you"]                     # your own lines: subtitles only
    subs_ok = len(anim["subs"]) == len(lines) + len(you) and all(s["ja"] and s["en"] for s in anim["subs"]) and not os.path.exists(os.path.join(ROOT, "media", "subs_zh.vtt"))
    you_clash = [c["t"] for c in you if any(l["t"] - .2 < c["t"] < l["t"] + tm["dur"] - .2 for l, tm in lines)]   # yours should sit in the gaps
    rep["3_subtitles_ja_en"] = dict(lines=len(anim["subs"]), voiced=len(lines), yours=len(you), yours_over_a_voice=you_clash, ok=subs_ok)
    # 4 lip sync
    lip = []
    for c, tm in lines:
        env = np.array(anim["chars"][c["who"]]["env"]); a, b = int(c["t"] * 30), int((c["t"] + tm["dur"]) * 30)
        lip.append(float(np.mean(env[a:b] > .15)))
    rep["4_lip_sync"] = dict(min_fraction_of_line_with_mouth_open=round(min(lip), 2), ok=min(lip) > .3)
    # 5 positions
    pos_bad = []
    for c, tm in lines:
        az, d = (np.array(v) for v in BQ.positions(np.array([c["t"] + .3, c["t"] + tm["dur"] * .5]))[c["who"]])
        side = -1 if c["who"] == "N" else 1
        if np.any(np.sign(az) != side): pos_bad.append((c["t"], "wrong side"))
        if c["kind"] == "whisper" and np.any(d > .3): pos_bad.append((c["t"], "whisper not at the ear"))
        if c["kind"] == "whisper" and np.any(np.abs(az) < 80): pos_bad.append((c["t"], "whisper not beside the ear"))
    rep["5_positions"] = dict(problems=pos_bad, ok=not pos_bad)
    # 6 / 7 thermal
    chk = json.load(open(os.path.join(ROOT, "thermal", "thermal_checks.json")))
    hb = chk["heat_by_delivery"]
    rep["6_heat_vs_voice"] = dict(heat_by_delivery=hb, correlation=chk["voice_heat_correlation"],
                                  ok=hb["laugh"] > hb["say"] > hb["whisper"] > .15 and min(chk["voice_heat_correlation"].values()) > .7)
    rows = list(csv.reader(open(os.path.join(ROOT, "thermal", "thermal_4ch.csv"))))[1:]
    last = rows[-1]
    rep["7_thermal"] = dict(rows=len(rows), first=rows[0][0], last=last[0], same_ear_conflicts=chk["same_ear_conflicts"],
                            opposite_temps=len(chk["simultaneous_opposite_temps"]), side_switches=chk["side_switches"], ends_at_zero=last[-1] == "stop",
                            ok=len(rows) == int(BQ.DURATION * 20) and chk["same_ear_conflicts"] == 0 and last[-1] == "stop")
    # 8 duration
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=duration,sample_rate", "-of", "csv=p=0",
                        os.path.join(ROOT, "audio", "final", "mix_48k.wav")], capture_output=True, text=True).stdout.strip().strip(",").split(",")
    rep["8_mix"] = dict(sample_rate=r[0], duration_s=r[1], ok=r[0] == "48000" and abs(float(r[1]) - BQ.DURATION) < .01)
    ok = all(v["ok"] for v in rep.values())
    os.makedirs(os.path.join(ROOT, "analysis"), exist_ok=True)
    json.dump(dict(all_ok=ok, **rep), open(os.path.join(ROOT, "analysis", "qa_report.json"), "w"), indent=1, ensure_ascii=False, default=str)
    for k, v in rep.items(): print(("PASS " if v["ok"] else "FAIL ") + k, {a: b for a, b in v.items() if a != "ok"})
    print("ALL OK" if ok else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()
