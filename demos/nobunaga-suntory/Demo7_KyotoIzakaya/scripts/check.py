"""Demo 7 QA → analysis/qa_report.json.   python3 scripts/check.py
Voices distinct · no clipped / same-speaker overlapping lines · your lines are subtitle-only (no audio) · ja + en for every line ·
whispers at the correct ear · heat follows voice energy, laugh > speech > whisper · many left↔right alternations ·
3000 thermal rows, 0 same-ear conflicts, ends at stop · mix exactly 150 s @ 48 kHz."""
import csv, json, os, subprocess, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import izakaya as WK
from sengoku import TH as T5, ROOT


def main():
    rep = {}
    timing = json.load(open(os.path.join(ROOT, "audio", "voice_timing.json")))
    lines = [(c, tm) for c, tm in zip(WK.CUES, timing) if c["kind"] in ("say", "whisper", "laugh")]
    V = {w: T5.T1.read_mono(os.path.join(ROOT, "audio", "stems", f"{w}_voice.wav")) for w in "NI"}
    bad = []
    for c, tm in lines:
        sr, x = V[c["who"]]; i0, i1 = int(c["t"] * sr), int((c["t"] + tm["dur"]) * sr)
        if max(np.max(np.abs(x[i0:i0 + 96])), np.max(np.abs(x[max(i0, i1 - 96):i1]))) > .02: bad.append((c["t"], "edge not silent"))
    for w in "NI":
        seq = [(c["t"], tm["dur"]) for c, tm in lines if c["who"] == w]
        bad += [(a[0], f"overlaps {b[0]}") for a, b in zip(seq, seq[1:]) if a[0] + a[1] > b[0]]
    rep["no_cut_or_overlap"] = dict(problems=bad, ok=not bad)
    you = [c for c in WK.CUES if c["kind"] == "you"]
    yours_silent = all(not any(c["t"] <= v["t"] < c["t"] + c["dur"] and v["who"] == "Y" for v in timing if v["kind"] != "you") for c in you)
    rep["your_lines_text_only"] = dict(count=len(you), ok=yours_silent and all(t["dur"] == c["dur"] for t, c in zip([t for t in timing if t["kind"] == "you"], you)))
    anim = json.load(open(os.path.join(ROOT, "media", "anim.json"))) if os.path.exists(os.path.join(ROOT, "media", "anim.json")) else None
    subs = anim["subs"] if anim else json.loads(open(os.path.join(ROOT, "media", "data.js")).read().split("= ", 1)[1].rstrip(";\n"))["anim"]["subs"]
    rep["subtitles_ja_en"] = dict(lines=len(subs), ok=len(subs) == len(lines) + len(you) and all(s["ja"] and s["en"] for s in subs))
    pos_bad = []
    for c, tm in lines:
        az, d = (np.array(v) for v in WK.positions(np.array([c["t"] + .3, c["t"] + tm["dur"] * .5]))[c["who"]])
        if np.any(np.sign(az) != (-1 if c["who"] == "N" else 1)): pos_bad.append((c["t"], "wrong side"))
        if c["kind"] == "whisper" and (np.any(d > .3) or np.any(np.abs(az) < 80)): pos_bad.append((c["t"], "whisper not at the ear"))
    rep["positions"] = dict(problems=pos_bad, ok=not pos_bad)
    chk = json.load(open(os.path.join(ROOT, "thermal", "thermal_checks.json")))
    hb = chk["heat_by_delivery"]
    rep["heat_vs_voice"] = dict(heat_by_delivery=hb, correlation=chk["voice_heat_correlation"],
                                ok=hb["laugh"] > hb["say"] > hb["whisper"] > .2 and min(chk["voice_heat_correlation"].values()) > .7)
    rep["left_right_alternation"] = dict(side_switches=chk["side_switches"], opposite_temps=len(chk["simultaneous_opposite_temps"]),
                                         ok=chk["side_switches"] >= 20 and len(chk["simultaneous_opposite_temps"]) >= 12)
    rows = list(csv.reader(open(os.path.join(ROOT, "thermal", "thermal_4ch.csv"))))[1:]
    rep["thermal"] = dict(rows=len(rows), same_ear_conflicts=chk["same_ear_conflicts"], ends_at_stop=rows[-1][-1] == "stop",
                          ok=len(rows) == int(WK.DURATION * 20) and chk["same_ear_conflicts"] == 0 and rows[-1][-1] == "stop")
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=duration,sample_rate", "-of", "csv=p=0",
                        os.path.join(ROOT, "audio", "final", "mix_48k.wav")], capture_output=True, text=True).stdout.strip().strip(",").split(",")
    rep["mix"] = dict(sample_rate=r[0], duration_s=r[1], ok=r[0] == "48000" and abs(float(r[1]) - WK.DURATION) < .01)
    ok = all(v["ok"] for v in rep.values())
    os.makedirs(os.path.join(ROOT, "analysis"), exist_ok=True)
    json.dump(dict(all_ok=ok, **rep), open(os.path.join(ROOT, "analysis", "qa_report.json"), "w"), indent=1, ensure_ascii=False, default=str)
    for k, v in rep.items(): print(("PASS " if v["ok"] else "FAIL ") + k, {a: b for a, b in v.items() if a != "ok"})
    print("ALL OK" if ok else "SOME CHECKS FAILED")


if __name__ == "__main__":
    main()
