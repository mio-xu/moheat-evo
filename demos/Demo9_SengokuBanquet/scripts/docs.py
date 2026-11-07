"""Writes storyboard/script_150s.md from scripts/banquet.py + audio/voice_timing.json.   python3 scripts/docs.py"""
import json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banquet as BQ

WHO = {"N": "信長", "I": "家康", "Y": "あなた (subtitle only)", "C": "❄ cold", "F": "🔥 warm", "-": "—"}
TO = {"you": "you (viewer)", "I": "Ieyasu", "N": "Nobunaga"}


def where(who, t):
    az, d = (float(v[0]) for v in BQ.positions(np.array([t + .3]))[who])
    side = "left" if az < -15 else "right" if az > 15 else "front"
    return f"{side} {az:+.0f}°, {d:.2f} m" + (" — AT THE EAR" if d < .3 else "")


def main():
    tm = json.load(open(os.path.join(ROOT, "audio", "voice_timing.json")))
    out = ["# 安土最後の酒宴 — 150 s script & cue sheet", "",
           "Generated from `scripts/banquet.py` (single source of truth). Times = start of the performance; the timeline was laid out "
           "*after* the takes were generated, so every line keeps its natural length.", "",
           "Voices (locked): 信長 = VOICEVOX 青山龍星, −1.5 st post shift · 家康 = VOICEVOX 黒沢冴白, −2 st post shift. "
           "Each line has 3 takes in `audio/takes/` (pick via `TAKE` in `scripts/voice.py`).", ""]
    for (t0, n, ja, en), nxt in zip(BQ.SCENES, [s[0] for s in BQ.SCENES[1:]] + [BQ.DURATION]):
        out += [f"## {n}　{ja} / {en}  ({t0:.0f}–{nxt:.0f} s)", "",
                "| t (s) | dur | who | kind | emotion | delivery | position | to | 日本語 | English |", "|---|---|---|---|---|---|---|---|---|---|"]
        for c, x in zip(BQ.CUES, tm):
            if not (t0 <= c["t"] < nxt): continue
            pos = where(c["who"], c["t"]) if c["who"] in "NICF" and c["who"] != "-" else ""
            if c["who"] in "CF": pos = f"az {c['az']:+.0f}°" + (f" → {c['az1']:+.0f}°" if c.get("az1") is not None else "") + f", {c['d']} m"
            out.append(f"| {c['t']:.1f} | {x['dur']:.1f} | {WHO[c['who']]} | {c['kind']} | {c.get('emo', '') if c['kind'] in ('say', 'whisper', 'laugh') else ''} | "
                       f"{c.get('tone', '')} | {pos} | {TO.get(c.get('to'), '') if c['kind'] in ('say', 'whisper', 'laugh') else ''} | {c.get('ja', '')} | {c.get('en', '')} |")
        out.append("")
    out += ["## Thermal design", "",
            "- 信長's dry voice → heat at his position (front-left, or AT the left ear) → mostly **L_Heat**.",
            "- 家康's dry voice → heat at his position (front-right, or AT the right ear) → mostly **R_Heat**.",
            "- Laugh = hottest, normal speech = medium, whisper = weak but noticeable (one loudness scale per character).",
            "- Warm ambience (hot-sake steam, brazier) → heat at its spot; cold ambience (ice bucket, wind, rain) → cool at its spot.",
            "- Showcase moments: 55–60 s L warm whisper + R ice · 90–96 s L wind + R voice · 97–102 s L voice + R wind · "
            "104–114 s L rain + R brazier → 115–124 s reversal: L warm whisper + R rain.", ""]
    os.makedirs(os.path.join(ROOT, "storyboard"), exist_ok=True)
    open(os.path.join(ROOT, "storyboard", "script_150s.md"), "w").write("\n".join(out))
    print("wrote storyboard/script_150s.md")


if __name__ == "__main__":
    main()
