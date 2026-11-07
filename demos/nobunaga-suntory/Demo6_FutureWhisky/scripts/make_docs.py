"""storyboard/script_150s.md from scripts/whisky.py + audio/voice_timing.json.   python3 scripts/make_docs.py"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import whisky as WK
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WHO = {"N": "信長", "I": "家康", "Y": "あなた (text only)", "C": "❄ cold", "-": "—"}


def where(who, t):
    az, d = (float(v[0]) for v in WK.positions(np.array([t + .3]))[who])
    return f"{'left' if az < -15 else 'right' if az > 15 else 'front'} {az:+.0f}°, {d:.2f} m" + (" — AT THE EAR" if d < .3 else "")


def main():
    tm = json.load(open(os.path.join(ROOT, "audio", "voice_timing.json")))
    out = [f"# {WK.TITLE['ja']} / {WK.TITLE['en']} — 150 s script & cue sheet", "",
           "You have slipped back 400 years to Azuchi Castle with three bottles of Suntory whisky. Nobunaga (front-left) and Ieyasu "
           "(front-right) taste them with you. Your own lines are subtitles only (no voice). Generated from `scripts/whisky.py`.", ""]
    for (t0, n, ja, en), nxt in zip(WK.SCENES, [s[0] for s in WK.SCENES[1:]] + [WK.DURATION]):
        out += [f"## {n}　{ja} / {en}  ({t0:.0f}–{nxt:.0f} s)", "", "| t (s) | dur | who | kind | emotion | delivery | position | 日本語 | English |", "|---|---|---|---|---|---|---|---|---|"]
        for c, x in zip(WK.CUES, tm):
            if not (t0 <= c["t"] < nxt): continue
            pos = where(c["who"], c["t"]) if c["who"] in "NI" else (f"az {c['az']:+.0f}°, {c['d']} m" if c["who"] == "C" else "")
            info = c.get("name", "") if c["kind"] == "bottle" else c.get("tone", "")
            out.append(f"| {c['t']:.1f} | {x['dur']:.1f} | {WHO.get(c['who'], c['who'])} | {c['kind']} | "
                       f"{c['emo'] if c['kind'] in ('say', 'whisper', 'laugh') else ''} | {info} | {pos} | {c.get('ja', '')} | {c.get('en', '')} |")
        out.append("")
    os.makedirs(os.path.join(ROOT, "storyboard"), exist_ok=True)
    open(os.path.join(ROOT, "storyboard", "script_150s.md"), "w").write("\n".join(out)); print("wrote storyboard/script_150s.md")


if __name__ == "__main__":
    main()
