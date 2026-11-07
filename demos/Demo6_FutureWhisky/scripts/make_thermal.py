"""Demo 6 thermal control (4 channels, 20 Hz) — the Sengoku demo's controller, loaded by path.

  python3 scripts/make_thermal.py      (after make_audio.py)

  N voice → HEAT at Nobunaga's position (front-left / LEFT ear)  → mostly L_Heat
  I voice → HEAT at Ieyasu's position (front-right / RIGHT ear)  → mostly R_Heat
  C cool  → COOL at the ice / highball / chilled glass's own side (mostly the opposite ear)
Laugh > speech > whisper (one loudness scale per character); device lead, per-ear arbitration (0 same-ear conflicts),
8 s dose limit, PWM.  Writes media/thermal.csv (= thermal/thermal_4ch.csv), thermal/{intent,mapping_config,checks,overview}.
"""
import csv, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import whisky as WK
from sengoku import TH as T5, ROOT
T1 = T5.T1
OUT, MEDIA, STEMS = os.path.join(ROOT, "thermal"), os.path.join(ROOT, "media"), os.path.join(ROOT, "audio", "stems")
T5.TH, T5.BQ = OUT, WK                     # its checks() / plot() write here and read this timeline
CFG = dict(T5.CFG)
CFG.update(GAIN=dict(N=1.0, I=1.0, C=1.0), WHISPER_BOOST=1.5,   # whispers are quiet; at the ear they should still be clearly felt
           SOURCES=dict(N="N_voice.wav (Nobunaga dry voice)", I="I_voice.wav (Ieyasu dry voice)", C="C_cool.wav (ice + highball fizz + chilled glass)"))


def run(cfg=CFG):
    os.makedirs(OUT, exist_ok=True)
    rate = cfg["RATE"]
    times = np.arange(int(WK.DURATION * rate)) / rate          # 3000 points, 0 … 149.95 s
    pos = WK.positions(times)
    srcs = {}
    for who, stem in (("N", "N_voice.wav"), ("I", "I_voice.wav"), ("C", "C_cool.wav")):
        sr, x = T1.read_mono(os.path.join(STEMS, stem))
        voice = who in "NI"
        lv, dbs, ref = T5.level(x, sr, times, cfg, cfg["VOICE_REF_PCT"] if voice else cfg["REF_PCT"], cfg["VOICE_CURVE"] if voice else cfg["AMB_CURVE"])
        az, d = pos[who]
        wl, wr = T5.ear_weights(az, d, cfg)
        g = lv * T5.proximity(d, cfg) * cfg["GAIN"][who]
        if voice:
            for c in WK.CUES:
                if c["who"] == who and c["kind"] == "whisper":
                    m = (times >= c["t"] - .3) & (times <= c["t"] + 6.0) & (d < .35)
                    g[m] *= cfg["WHISPER_BOOST"]
        srcs[who] = dict(L=g * wl, R=g * wr, level=lv, db=dbs, ref=ref, az=az, d=d)
    srcs["F"] = dict(L=np.zeros_like(times), R=np.zeros_like(times), level=np.zeros_like(times), db=np.full_like(times, -120.0),
                     az=np.zeros_like(times), d=np.full_like(times, 3.0))          # no warm ambience in this demo
    cap = lambda v: np.minimum(v, 1.0) * cfg["CAP"]
    soft_or = lambda *v: 1 - np.prod([1 - np.clip(a, 0, 1) for a in v], axis=0)
    hL = cap(T1.lead(soft_or(srcs["N"]["L"], srcs["I"]["L"]), cfg["HEAT_LEAD"], rate))
    hR = cap(T1.lead(soft_or(srcs["N"]["R"], srcs["I"]["R"]), cfg["HEAT_LEAD"], rate))
    cL, cR = (cap(T1.lead(srcs["C"][s], cfg["COOL_LEAD"], rate)) for s in "LR")
    Lc, Lh = T1.resolve_ear(cL, hL, cfg)
    Rc, Rh = T1.resolve_ear(cR, hR, cfg)
    Lc, Lh, Rc, Rh = (T1.dose_limit(v, cfg) for v in (Lc, Lh, Rc, Rh))
    for v in (Lc, Lh, Rc, Rh): v[-int(rate * 1.5):] *= np.linspace(1, 0, int(rate * 1.5))
    off = cfg["OFF_BELOW"]
    for v in (Lc, Lh, Rc, Rh): v[v <= off] = 0.0
    pLc, pRc = T1.to_pwm(Lc, cfg["COOL_PWM"], off), T1.to_pwm(Rc, cfg["COOL_PWM"], off)
    pLh, pRh = T1.to_pwm(Lh, cfg["HEAT_PWM"], off), T1.to_pwm(Rh, cfg["HEAT_PWM"], off)

    def cmd(i):
        if not (pLc[i] or pLh[i] or pRc[i] or pRh[i]): return "stop"
        return " ".join(f"{s}C{c}" if c else f"{s}H{h}" for s, c, h in (("L", pLc[i], pLh[i]), ("R", pRc[i], pRh[i])))

    rows = [["time_s", "L_cool", "R_cool", "L_heat", "R_heat", "L_cool_pwm", "R_cool_pwm", "L_heat_pwm", "R_heat_pwm", "command"]]
    rows += [[f"{t:.2f}", f"{Lc[i]:.3f}", f"{Rc[i]:.3f}", f"{Lh[i]:.3f}", f"{Rh[i]:.3f}", pLc[i], pRc[i], pLh[i], pRh[i], cmd(i)] for i, t in enumerate(times)]
    for p in (os.path.join(MEDIA, "thermal.csv"), os.path.join(OUT, "thermal_4ch.csv")):
        with open(p, "w", newline="") as f: csv.writer(f).writerows(rows)
    with open(os.path.join(OUT, "thermal_intent.csv"), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["time_s"] + [f"{k}_{c}" for k in "NIC" for c in ("rms_db", "level", "az", "d", "L", "R")])
        for i, t in enumerate(times):
            w.writerow([f"{t:.2f}"] + [f"{srcs[k]['db'][i]:.1f}" if c == "rms_db" else f"{srcs[k][c][i]:.3f}" for k in "NIC" for c in ("rms_db", "level", "az", "d", "L", "R")])
    json.dump(cfg, open(os.path.join(OUT, "mapping_config.json"), "w"), indent=1, ensure_ascii=False)
    T5.checks(times, Lc, Rc, Lh, Rh, srcs, rate)
    plot(times, Lc, Rc, Lh, Rh, srcs)


def plot(times, Lc, Rc, Lh, Rh, srcs):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(3, 1, figsize=(16, 8), sharex=True)
    for k, col, lab in (("N", "#c0392b", "Nobunaga voice"), ("I", "#2e7d5b", "Ieyasu voice"), ("C", "#3a8dde", "ice / highball / chilled glass")):
        ax[0].plot(times, srcs[k]["level"], color=col, label=lab, lw=1)
    ax[0].legend(loc="upper right", ncol=3); ax[0].set_ylabel("drive")
    for a, c, h, name in ((ax[1], Lc, Lh, "LEFT"), (ax[2], Rc, Rh, "RIGHT")):
        a.fill_between(times, 0, -c, color="#3a8dde", alpha=.85); a.fill_between(times, 0, h, color="#e0582a", alpha=.85)
        a.set_ylim(-1, 1); a.set_ylabel(name); a.axhline(0, color="k", lw=.5)
    for k, (t, *_r) in enumerate(WK.SCENES):
        for a in ax: a.axvline(t, color="#888", lw=.6, ls=":")
        ax[0].text(t + .5, 1.02, f"S{k + 1}", fontsize=10)
    ax[2].set_xlabel("time (s) — cooling below the axis, heating above; already shifted by the device lead")
    fig.tight_layout(); fig.savefig(os.path.join(OUT, "thermal_overview.png"), dpi=90)


if __name__ == "__main__":
    run()
