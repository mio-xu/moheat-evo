"""Generate production/01_script.md (full ja script + en/zh translation, timing, position, thermal intent)
from tools/story.py and the measured voice timing.   python3 tools/docs.py"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import story as S

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def where(az, d):
    a = abs(az)
    side = "前" if a < 25 else "後ろ" if a > 150 else ("右" if az > 0 else "左") + ("前" if a < 70 else "後" if a > 110 else "")
    dist = "耳元" if d < 0.3 else "近く" if d < 0.8 else "中距離" if d < 1.8 else "遠く"
    return f"{side}・{dist} ({az:+.0f}°, {d:.2f} m)"


def main():
    timing = json.load(open(os.path.join(ROOT, "output", "voice_timing.json")))
    lines = ["# 雪と狐火のひそひそ話 — 台本 / Script / 剧本", "",
             "Generated from `tools/story.py` (`python3 tools/docs.py`). Times are the final 150 s timeline.",
             "Position = where the character is relative to the listener. Thermal = which ear/mode this cue drives (strength follows the cue's loudness).", ""]
    for i, (t0, n, ja, en) in enumerate(S.SCENES):
        t1 = S.SCENES[i + 1][0] if i + 1 < len(S.SCENES) else S.DURATION
        lines += [f"## Scene {n}  {int(t0 // 60)}:{t0 % 60:04.1f}–{int(t1 // 60)}:{t1 % 60:04.1f}　{ja} / {en}", "",
                  "| Time | Who | Japanese | English | 中文 | Position | Thermal |", "|---|---|---|---|---|---|---|"]
        for c, tm in zip(S.CUES, timing):
            if not (t0 <= c["t"] < t1): continue
            az, d = S.positions(np.array([c["t"] + 0.3]))[c["who"]]
            az, d = float(az[0]), float(d[0])
            mode = "cool" if c["who"] == "K" else "warm"
            ear = "both ears" if abs(np.sin(np.radians(az))) < 0.5 else ("right ear" if az > 0 else "left ear")
            who = S.CHARACTERS[c["who"]]["name_ja"] + (" ＆ 焔（同時）" if c.get("duet") and c["who"] == "K" else "")
            if c.get("nosub"): continue
            ja = c["ja"] or f"〈{c['kind']}: {c.get('style', '')}〉"
            kind = {"whisper": " *(whisper)*", "breath": " *(breath)*", "pant": " *(breath)*", "magic": " *(magic SFX)*"}.get(c["kind"], "")
            lines.append(f"| {int(c['t'] // 60)}:{c['t'] % 60:04.1f} ({tm['dur']:.1f}s) | {who} | {ja}{kind} | {c['en']} | {c['zh']} | {where(az, d)} | {mode} · {ear} |")
        lines.append("")
    open(os.path.join(ROOT, "production", "01_script.md"), "w").write("\n".join(lines))
    print("production/01_script.md written")


if __name__ == "__main__":
    main()
