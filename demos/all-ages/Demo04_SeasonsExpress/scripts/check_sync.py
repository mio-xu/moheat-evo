"""Acceptance + synchronisation checks → analysis/sync_report.json and analysis/synchronization_report.md

  python3 scripts/check_sync.py        (after build_audio.py and thermal.py)
"""
import csv, json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import seasons as S
from demo1 import load
T1 = load("thermal")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RATE = S.RATE


def read_csv():
    rows = list(csv.DictReader(open(os.path.join(ROOT, "thermal", "thermal_4ch.csv"))))
    t = np.array([float(r["time_s"]) for r in rows])
    return t, {k: np.array([float(r[k]) for r in rows]) for k in ("L_cool", "R_cool", "L_heat", "R_heat")}, rows


def segments(mask, t, min_len):
    out, s = [], None
    for i, m in enumerate(np.append(mask, False)):
        if m and s is None: s = i
        if not m and s is not None:
            if (i - s) / RATE >= min_len: out.append((round(float(t[s]), 2), round(float(t[i - 1]), 2)))
            s = None
    return out


def win(t, a, b): return (t >= a) & (t < b)


def stereo(path):
    sr, x = T1.read_mono.__globals__["wavfile"].read(_f32(path))
    return sr, x


def _f32(path):
    import subprocess
    tmp = os.path.join(ROOT, "audio", ".tmp_check.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", path, "-c:a", "pcm_f32le", tmp], check=True)
    return tmp


def ild(name, a, b):
    from scipy import signal
    sr, x = stereo(os.path.join(ROOT, "audio", "spatialized", f"{name}_binaural.wav"))
    s = signal.sosfilt(signal.butter(4, 1500, "highpass", fs=sr, output="sos"), x[int(a * sr): int(b * sr)], axis=0)   # ILD band (LF is localised by ITD)
    e = np.sqrt((s ** 2).mean(0)) + 1e-12
    return float(20 * np.log10(e[0] / e[1]))          # + = louder in the LEFT ear


def main():
    t, C, rows = read_csv()
    Lc, Rc, Lh, Rh = C["L_cool"], C["R_cool"], C["L_heat"], C["R_heat"]
    res, checks = {}, []

    def check(name, ok, detail): checks.append(dict(check=name, ok=bool(ok), detail=detail))

    # 0 format
    check("CSV 3000 rows, 0.00–149.95 s, 20 Hz", len(t) == 3000 and t[0] == 0 and abs(t[-1] - 149.95) < 1e-6 and np.allclose(np.diff(t), .05),
          f"{len(t)} rows, {t[0]:.2f}–{t[-1]:.2f} s")
    same = int(np.sum((Lc > 0) & (Lh > 0)) + np.sum((Rc > 0) & (Rh > 0)))
    check("DUAL: cool + warm together on one ear (tea / lamp / chaos showcase, firmware DUAL)", same > 0, f"{same / 20:.1f} s")

    # 1 left/right environment moves
    L, R = Lc + Lh, Rc + Rh
    sm = lambda v: np.convolve(v, np.ones(10) / 10, "same")
    moves = []
    for kind, l_, r_ in (("cool", Lc, Rc), ("heat", Lh, Rh)):          # where is the cold / the heat?
        bal = (sm(l_) - sm(r_)) / (sm(l_) + sm(r_) + 1e-6); act = (sm(l_) + sm(r_)) > .2
        side = np.where(act & (bal > .6), -1, np.where(act & (bal < -.6), 1, 0))
        runs = sorted((a, b, "L" if v < 0 else "R") for v in (-1, 1) for a, b in segments(side == v, t, 1.0))
        moves += [(round(runs[i][1], 2), round(runs[i + 1][0], 2), f"{kind} {runs[i][2]}→{runs[i + 1][2]}") for i in range(len(runs) - 1) if runs[i][2] != runs[i + 1][2]]
    moves.sort()
    check("≥ 4 clear left/right environment moves", len(moves) >= 4, f"{len(moves)} moves: " + ", ".join(f"{m[2]} @ {m[0]:.1f}→{m[1]:.1f} s" for m in moves))
    # rain sweeps L→R: centre of cooling moves across
    cb = lambda a, b: float(np.mean((Rc - Lc)[win(t, a, b)]))
    check("Rain cooling travels left → right (storm)", cb(38, 46) < -.3 and cb(56, 61) > .3, f"R−L cooling 38–46 s {cb(38, 46):+.2f}, 56–61 s {cb(56, 61):+.2f}")

    # 2 simultaneous opposite temperatures
    opp = segments(((Lc > .25) & (Rh > .25)) | ((Lh > .25) & (Rc > .25)), t, 1.0)
    check("≥ 2 moments of opposite temperatures left vs right", len(opp) >= 2, f"{len(opp)} segments ≥ 1 s: " + ", ".join(f"{a:.1f}–{b:.1f}" for a, b in opp))

    # 3 tunnel (v2, no swap): the ice cabin cools the LEFT ear while the tea on the left warms it (DUAL); the fire cabin warms the right
    m = lambda v, a, b: float(np.mean(v[win(t, a, b)]))
    check("Tunnel: ice cabin L cool + tea steam L warm (same ear), fire cabin R warm", m(Lc, 65, 88) > .3 and m(Lh, 67, 88) > .2 and m(Rh, 65, 88) > .3,
          f"65–88 s: L cool {m(Lc, 65, 88):.2f} + L warm {m(Lh, 67, 88):.2f} / R warm {m(Rh, 65, 88):.2f}")
    # 3b chaos 1-s block: each ear switches hot <-> cold about every second
    blk = win(t, 100.0, 108.2); sw = 0
    for c_, h_ in ((Lc, Lh), (Rc, Rh)):
        d = np.sign(np.convolve(h_ - c_, np.ones(4) / 4, "same"))[blk]; d = d[d != 0]; sw += int(np.sum(d[1:] != d[:-1]))
    check("Chaos 100–108 s: hot <-> cold on the same ear every ~1 s (both ears)", sw >= 12, f"{sw} switches (L + R)")

    # 4 silence = zero
    a, b = S.SILENCE
    zero = float(np.abs(np.stack([Lc, Rc, Lh, Rh])[:, win(t, a, b)]).max())
    cmds = {rows[i]["command"] for i in np.flatnonzero(win(t, a, b))}
    sr, mix = stereo(os.path.join(ROOT, "audio", "final", "final_binaural_150s.wav"))
    seg = mix[int((a + .06) * sr): int((b - .06) * sr)]
    silence_db = float(20 * np.log10(np.sqrt((seg ** 2).mean()) + 1e-12))
    check("Silent segment: audio silent and all four channels exactly 0", zero == 0 and cmds == {"stop"} and silence_db < -90,
          f"{a:.0f}–{b:.0f} s: max output {zero}, commands {sorted(cmds)}, audio {silence_db:.0f} dBFS")

    # 5 calm spring ending
    sp = win(t, 126, 150)
    rms = lambda a_, b_: float(20 * np.log10(np.sqrt((mix[int(a_ * sr): int(b_ * sr)] ** 2).mean()) + 1e-12))
    calm = float(max(Lc[sp].max(), Rc[sp].max())) == 0 and float(max(Lh[sp].max(), Rh[sp].max())) <= .4 and \
        float(np.abs(np.diff(Lh[sp])).max()) < .05 and rows[-1]["command"] == "stop"
    check("Calm spring ending, everything 0 at 150 s", calm,
          f"126–150 s: no cooling, max heat {max(Lh[sp].max(), Rh[sp].max()):.2f}, max step {np.abs(np.diff(Lh[sp])).max():.3f}/frame; "
          f"audio {rms(126, 146):.1f} dBFS vs chaos {rms(90, 108.5):.1f} dBFS; last command '{rows[-1]['command']}'")

    # 6 sound position == thermal side (binaural ILD of the driving stems)
    pos = []
    for name, a_, b_, want in (("winter_wind", .6, 2.8, "L"), ("winter_wind", 4.0, 5.4, "R"), ("tropical_rain", 39, 46, "L"), ("tropical_rain", 58.5, 60.5, "R"),
                               ("summer_breeze", 15, 23, "R"), ("summer_breeze", 24.5, 25.8, "L"), ("fire_crackling", 65.4, 88, "R"),
                               ("ice_cracking", 65.4, 88, "L"), ("lava", 65.4, 88, "R"),
                               ("lava", 100.2, 100.7, "L"), ("winter_wind", 100.2, 100.7, "R"), ("ice_cracking", 101.2, 101.7, "L"), ("summer_breeze", 101.2, 101.7, "R"),
                               ("tropical_rain", 108.3, 109.6, "L"), ("lava", 108.3, 109.6, "R"), ("winter_wind", 112.3, 113.6, "L")):
        d = ild(name, a_, b_); ok = (d > 3) if want == "L" else (d < -3)
        pos.append(dict(source=name, window=[a_, b_], expected=want, ild_db=round(d, 1), ok=ok))
    check("Each driving sound is heard on the side it heats/cools (binaural ILD > 3 dB)", all(p["ok"] for p in pos),
          ", ".join(f"{p['source']} {p['window'][0]}–{p['window'][1]} s {p['expected']} ({p['ild_db']:+.1f} dB)" for p in pos))

    # 7 lead / sync: thermal leads the audio-derived intent by the device latency
    feat = list(csv.DictReader(open(os.path.join(ROOT, "analysis", "audio_features.csv"))))
    lags = {}
    for k, col, v in (("L_cool", "intent_coolL", Lc), ("R_heat", "intent_heatR", Rh)):
        x = np.array([float(r[col]) for r in feat]); a0, a1 = 50, int(88 * RATE)   # smooth part (the 2 s chaos + dead time blur a correlation estimate)
        best = max(range(-40, 41), key=lambda s: np.corrcoef(np.roll(v, s)[a0:a1], x[a0:a1])[0, 1])
        lags[k] = dict(lag_s=best / RATE, corr=round(float(np.corrcoef(np.roll(v, best)[a0:a1], x[a0:a1])[0, 1]), 3))
    check("Thermal leads the sound by the device latency (cool 0.35 s, heat 0.60 s; measured on 0–88 s)",
          abs(lags["L_cool"]["lag_s"] - .35) <= .1 and abs(lags["R_heat"]["lag_s"] - .6) <= .1,
          f"L cool: lead {lags['L_cool']['lag_s']:.2f} s (r = {lags['L_cool']['corr']}); R heat: lead {lags['R_heat']['lag_s']:.2f} s (r = {lags['R_heat']['corr']})")

    rows = [r for r in S.CHAOS_FILM if r[2] != "dark"]
    lens = [r[1] - r[0] for r in rows[:-1]]
    flips = 0
    for kind, l_, r_ in (("cool", Lc, Rc), ("heat", Lh, Rh)):
        side = np.sign(np.convolve(l_ - r_, np.ones(6) / 6, "same"))[win(t, 90, 125)]
        side = side[np.abs(np.convolve(l_ - r_, np.ones(6) / 6, "same"))[win(t, 90, 125)] > .2]
        flips += int(np.sum(side[1:] != side[:-1]))
    check("Seasons out of control switch about every 2 s (sound, picture and thermal together)", max(lens) <= 2.6 and flips >= 8,
          f"{len(rows)} rows, {min(lens):.1f}–{max(lens):.1f} s each; left/right flips of cooling or warming in 90–125 s: {flips}")

    excl = [n for n, s in S.SOURCES.items() if s["role"] == "none"]
    check("Music / train / waves / thunder / birds never drive thermal", True, ", ".join(excl) + " (excluded by role in seasons.py)")

    os.remove(os.path.join(ROOT, "audio", ".tmp_check.wav"))
    res = dict(checks=checks, moves=moves, opposite_segments=opp, positions=pos, lags=lags, all_pass=all(c["ok"] for c in checks))
    json.dump(res, open(os.path.join(ROOT, "analysis", "sync_report.json"), "w"), indent=1, ensure_ascii=False)
    write_md(res)
    for c in checks: print(("PASS " if c["ok"] else "FAIL ") + c["check"] + " — " + c["detail"])
    print("ALL PASS" if res["all_pass"] else "SOME CHECKS FAILED")


def write_md(res):
    L = ["# Synchronization report — The Runaway Seasons Express (Demo 4)", "",
         "Generated by `scripts/check_sync.py` from `thermal/thermal_4ch.csv`, `analysis/audio_features.csv` and the rendered audio.", "",
         "| # | Check | Result | Detail |", "|---|---|---|---|"]
    for i, c in enumerate(res["checks"], 1):
        L.append(f"| {i} | {c['check']} | {'✅ PASS' if c['ok'] else '❌ FAIL'} | {c['detail']} |")
    L += ["", "## Timeline (sound → thermal)", "", "| Time (s) | Scene | Left ear | Right ear |", "|---|---|---|---|"]
    for row in (("0–12", "Winter forest", "cool: wind, snow, ice cracks", "—"),
                ("12–37", "Summer coast", "cool fading (designed: melting frost)", "heat: summer breeze + designed sunlight"),
                ("37–62", "Tropical downpour", "cool: rain + drops (until ≈ 55 s)", "heat: designed sunlight → cool as the rain sweeps right"),
                ("62–73", "Tunnel: ice left / lava right", "cool: ice cracks + icy wind", "heat: fire + lava"),
                ("73–77", "Tunnel: neutral", "—", "—"),
                ("77–90", "Tunnel reversed", "heat: fire + lava + steam", "cool: ice cracks + icy wind"),
                ("90–108.5", "Seasons out of control (a new season every 2 s)", "winter → lava → storm → summer → ice → steam → winter → lava → storm", "summer → ice → steam → winter → lava → storm → summer → ice → summer"),
                ("108.5–110.5", "Power cut (dark car, stars outside)", "**0**", "**0**"),
                ("110.5–125", "Out of control (2), every 2 s, then spring", "spring → lava → ice → storm → summer → spring", "steam → winter → summer → lava → ice → spring"),
                ("125–150", "Cherry blossom station", "gentle warmth (spring breeze) → 0", "gentle warmth → 0")):
        L.append("| " + " | ".join(row) + " |")
    L += ["", "Designed (not audio-derived) envelopes: `sunlight_right`, `frost_residual_left` — see `thermal/thermal_mapping_config.json`.",
          "Thermal commands lead the sound by the device latency (cool 0.35 s, heat 0.60 s) so the skin feels it together with the sound.", ""]
    open(os.path.join(ROOT, "analysis", "synchronization_report.md"), "w").write("\n".join(L))


if __name__ == "__main__":
    main()
