"""production/02_script.md — full Japanese script + Chinese/English, timing, position and thermal intent.  python3 tools/docs.py"""
import json, os, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fanmeeting as FM

def where(az, d):
    a = abs(az)
    side = "前" if a < 25 else "後ろ" if a > 150 else ("右" if az > 0 else "左") + ("前" if a < 70 else "後" if a > 110 else "")
    return f"{side}・{'耳元' if d < .3 else '近く' if d < .8 else '中距離' if d < 1.8 else '遠く'} ({az:+.0f}°, {d:.2f} m)"

def main():
    timing = json.load(open(os.path.join(ROOT, "output", "voice_timing.json")))
    out = ["# キミだけのスペシャルファンミーティング — 台本 / 剧本 / Script", "",
           "Generated from `tools/fanmeeting.py`. Heat = Ayane's voice at her position; cool = the cooling SFX at their own position.", ""]
    for i, (t0, n, ja, zh, en) in enumerate(FM.SCENES):
        t1 = FM.SCENES[i + 1][0] if i + 1 < len(FM.SCENES) else FM.DURATION
        out += [f"## {n}  {int(t0 // 60)}:{t0 % 60:04.1f}–{int(t1 // 60)}:{t1 % 60:04.1f}　{ja} / {zh} / {en}", "",
                "| 时间 | 类型 | 日本語 | 中文 | English | 位置 | 冷热 |", "|---|---|---|---|---|---|---|"]
        for c, tm in zip(FM.CUES, timing):
            if not (t0 <= c["t"] < t1) or c["kind"] in ("jingle", "bgm", "steps"): continue
            src = "C" if c["kind"] in ("fan", "swish", "ice", "coolbreath", "magic") else "A"
            az, d = (float(v[0]) for v in FM.positions(np.array([c["t"] + .3]))[src])
            mode = "❄ cool" if src == "C" else "🔥 heat"
            ear = "双耳" if abs(np.sin(np.radians(az))) < .5 else ("右耳" if az > 0 else "左耳")
            ja = c["ja"] or {"fan": "（扇子パタパタ）", "swish": "（ひゅっ・魔法の風）", "ice": "（氷カラン・シュワ）", "magic": "（ひんやり魔法）"}.get(c["kind"], "")
            out.append(f"| {int(c['t'] // 60)}:{c['t'] % 60:04.1f} ({tm['dur']:.1f}s) | {c['kind']} | {ja} | {c['zh']} | {c['en']} | {where(az, d)} | {mode} · {ear} |")
        out.append("")
    open(os.path.join(ROOT, "production", "02_script.md"), "w").write("\n".join(out)); print("production/02_script.md written")

if __name__ == "__main__":
    main()
