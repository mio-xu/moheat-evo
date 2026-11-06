"""Music analysis for Demo 3 (numpy / scipy only — no librosa / Demucs needed).

  python3 scripts/music_features.py <audio> <out_prefix>
     e.g. assets/music_original/…mp3 analysis/original   → analysis/original_features.csv, _structure.json, _overview.png

Features at 20 Hz (50 ms grid, t = 0 … duration):
  rms          overall RMS (dBFS)
  vocal        centre-panned harmonic energy 250–3500 Hz  (vocal proxy: mid-channel harmonic part × centre mask)
  bass         harmonic energy 40–200 Hz
  drums        percussive energy (HPSS by median filtering) 40 Hz–12 kHz
  high         energy 4–14 kHz ("bright accompaniment": synth shimmer, bells, hats)
  onset        onset strength (spectral flux)
  left/right   channel RMS (dBFS)
Structure: BPM, beat times, bar (downbeat) times, section boundaries + labels (novelty on a beat-synchronous
self-similarity matrix, labelled by energy / vocal presence).
"""
import json, os, subprocess, sys
import numpy as np
from scipy import ndimage, signal

SR, HOP, NFFT, RATE = 48000, 480, 2048, 20


def load(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)


def stft(x):
    _, _, Z = signal.stft(x, SR, nperseg=NFFT, noverlap=NFFT - HOP, boundary=None, padded=False)
    return Z


def band(freqs, lo, hi): return (freqs >= lo) & (freqs < hi)


def to_db(e): return 10 * np.log10(e + 1e-12)


def analyse(x):
    L, R = x[:, 0], x[:, 1]
    M, S = (L + R) / 2, (L - R) / 2
    ZM, ZS = stft(M), stft(S)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    mag = np.abs(ZM).astype(np.float32)
    # HPSS (Fitzgerald 2010): median along time → harmonic, along frequency → percussive; soft masks
    Hm = ndimage.median_filter(mag, size=(1, 17)); Pm = ndimage.median_filter(mag, size=(17, 1))
    mH = Hm ** 2 / (Hm ** 2 + Pm ** 2 + 1e-12); mP = 1 - mH
    H, P = mag * mH, mag * mP
    centre = np.clip(1 - np.abs(ZS) / (np.abs(ZM) + 1e-9), 0, 1) ** 2      # 1 = centre-panned, 0 = sides
    E = lambda X, lo, hi: np.sum(X[band(freqs, lo, hi)] ** 2, axis=0)
    fr = {
        "vocal": E(H * centre, 250, 3500),
        "bass": E(H, 40, 200),
        "drums": E(P, 40, 12000),
        "high": E(mag, 4000, 14000),
    }
    logm = np.log1p(mag[band(freqs, 30, 16000)] * 100)
    flux = np.maximum(np.diff(logm, axis=1, prepend=logm[:, :1]), 0).sum(0)
    fr["onset"] = flux
    n_fr = mag.shape[1]; t_fr = (np.arange(n_fr) * HOP + NFFT / 2) / SR

    # chroma (beat-synchronous structure)
    cf = band(freqs, 55, 4200)
    pc = (np.round(12 * np.log2(freqs[cf] / 440)) % 12).astype(int)
    chroma = np.zeros((12, n_fr))
    for k in range(12): chroma[k] = H[cf][pc == k].sum(0)
    chroma /= chroma.max(0, keepdims=True) + 1e-9

    # tempo + beats (Ellis 2007 dynamic programming)
    fps = SR / HOP
    on = (flux - ndimage.uniform_filter1d(flux, int(fps))).clip(0); on /= on.std() + 1e-9
    ac = np.correlate(on, on, "full")[len(on) - 1:]
    lags = np.arange(len(ac)); bpm_l = 60 * fps / np.maximum(lags, 1)
    ok = (bpm_l > 70) & (bpm_l < 190)
    weight = np.exp(-.5 * (np.log2(bpm_l / 120) / .9) ** 2)
    lag = lags[ok][np.argmax((ac * weight)[ok])]
    # refine on a finer grid around the best lag
    bpm = 60 * fps / lag
    period = fps * 60 / bpm
    score = on.copy(); back = np.full(len(on), -1)
    for i in range(len(on)):
        lo, hi = int(i - 2 * period), int(i - period / 2)
        if lo < 0: continue
        prev = np.arange(lo, hi)
        cost = -100 * (np.log((i - prev) / period)) ** 2
        j = np.argmax(score[prev] + cost); score[i] = on[i] + score[prev[j]] + cost[j]; back[i] = prev[j]
    i = int(np.argmax(score[-int(period * 2):]) + len(score) - int(period * 2)); beats = []
    while i >= 0: beats.append(i); i = back[i]
    beats = np.array(beats[::-1]); beat_t = t_fr[beats]
    bpm = 60 / np.median(np.diff(beat_t))
    # downbeats: phase of 4 that puts the strongest bass / kick on beat 1
    acc = [np.sum((fr["bass"] + fr["drums"])[beats[k::4]]) for k in range(4)]
    bars = beat_t[int(np.argmax(acc))::4]

    # beat-synchronous features → self-similarity → novelty → boundaries (snapped to bars)
    seg = np.split(np.arange(n_fr), beats[1:])
    feats = []
    for s in seg:
        c = chroma[:, s].mean(1); e = [to_db(fr[k][s].mean()) for k in ("vocal", "bass", "drums", "high")]
        feats.append(np.concatenate([c / (np.linalg.norm(c) + 1e-9), (np.array(e) + 60) / 60]))
    F = np.array(feats); Fn = F / (np.linalg.norm(F, axis=1, keepdims=True) + 1e-9)
    SSM = Fn @ Fn.T
    k = 16; g = np.outer(signal.windows.gaussian(2 * k, k / 2), signal.windows.gaussian(2 * k, k / 2))
    ker = g * np.sign(np.outer(np.r_[-np.ones(k), np.ones(k)], np.r_[-np.ones(k), np.ones(k)]))
    nov = np.zeros(len(F))
    for i in range(k, len(F) - k): nov[i] = np.sum(SSM[i - k:i + k, i - k:i + k] * ker)
    nov = np.clip(nov, 0, None)
    peaks, _ = signal.find_peaks(nov, distance=16, prominence=np.percentile(nov, 70) * .5)
    bounds = sorted({0.0, *[float(bars[np.argmin(np.abs(bars - beat_t[p]))]) for p in peaks]})
    return dict(fr=fr, t_fr=t_fr, bpm=float(bpm), beats=beat_t.tolist(), bars=bars.tolist(), bounds=bounds, LR=(L, R), novelty=nov.tolist())


def grid(fr, t_fr, x, duration):
    times = np.arange(int(round(duration * RATE))) / RATE
    out = {"time_s": times}
    w = int(.05 * SR)
    def win_rms(sig):
        c = np.concatenate([[0], np.cumsum(sig ** 2)]); i = np.clip((times * SR).astype(int), 0, len(sig))
        a, b = np.clip(i - w // 2, 0, len(sig)), np.clip(i + w // 2, 0, len(sig))
        return to_db((c[b] - c[a]) / np.maximum(b - a, 1))
    L, R = x[:, 0], x[:, 1]
    out["rms"] = win_rms((L + R) / 2); out["left"] = win_rms(L); out["right"] = win_rms(R)
    for k in ("vocal", "bass", "drums", "high", "onset"):
        sm = ndimage.uniform_filter1d(fr[k], 5)                       # ≈ 50 ms window at 10 ms hop
        v = np.interp(times, t_fr, sm)
        out[k] = to_db(v) if k != "onset" else v
    return out


def label_sections(bounds, duration, g):
    t = g["time_s"]; secs = []
    edges = bounds + [duration]
    for a, b in zip(edges, edges[1:]):
        m = (t >= a) & (t < b)
        secs.append(dict(start=round(a, 3), end=round(b, 3), energy=float(np.mean(g["rms"][m])), vocal=float(np.mean(g["vocal"][m]))))
    if not secs: return secs
    E = np.array([s["energy"] for s in secs]); V = np.array([s["vocal"] for s in secs])
    eh, vh = np.percentile(E, 66), np.percentile(V, 50)
    for i, s in enumerate(secs):
        if i == 0 and s["vocal"] < vh: s["label"] = "intro"
        elif i == len(secs) - 1 and s["energy"] < eh: s["label"] = "outro"
        elif s["energy"] >= eh and s["vocal"] >= vh: s["label"] = "chorus"
        elif s["vocal"] >= vh: s["label"] = "verse"
        else: s["label"] = "interlude"
    return secs


def save(prefix, x):
    a = analyse(x); duration = len(x) / SR
    g = grid(a["fr"], a["t_fr"], x, duration)
    cols = ["time_s", "rms", "vocal", "bass", "drums", "high", "onset", "left", "right"]
    with open(prefix + "_features.csv", "w") as f:
        f.write(",".join(cols) + "\n")
        for i in range(len(g["time_s"])): f.write(",".join(f"{g[c][i]:.3f}" for c in cols) + "\n")
    secs = label_sections(a["bounds"], duration, g)
    st = dict(duration=duration, bpm=a["bpm"], beats=[round(b, 3) for b in a["beats"]], bars=[round(b, 3) for b in a["bars"]], sections=secs)
    json.dump(st, open(prefix + "_structure.json", "w"), indent=1)
    plot(prefix, g, st)
    print(f"{os.path.basename(prefix)}: {duration:.2f} s, {a['bpm']:.1f} BPM, {len(a['beats'])} beats, {len(a['bars'])} bars")
    for s in secs: print(f"  {s['start']:7.2f}–{s['end']:7.2f}  {s['label']:9s} energy {s['energy']:6.1f} dB  vocal {s['vocal']:6.1f}")
    return g, st


def plot(prefix, g, st):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(4, 1, figsize=(18, 9), sharex=True)
    t = g["time_s"]
    ax[0].plot(t, g["rms"], color="k", lw=.8, label="rms"); ax[0].plot(t, g["left"], lw=.5, alpha=.6, label="L"); ax[0].plot(t, g["right"], lw=.5, alpha=.6, label="R")
    ax[1].plot(t, g["vocal"], color="#e0582a", lw=.8, label="vocal (centre harmonic)"); ax[1].plot(t, g["bass"], color="#7a3", lw=.8, label="bass")
    ax[2].plot(t, g["drums"], color="#555", lw=.6, label="drums (percussive)"); ax[2].plot(t, g["high"], color="#3a8dde", lw=.8, label="high 4–14 kHz")
    ax[3].plot(t, g["onset"], color="#a3a", lw=.5, label="onset")
    for a in ax:
        a.legend(loc="upper right", fontsize=8)
        for b in st["bars"]: a.axvline(b, color="#ddd", lw=.4, zorder=0)
        for s in st["sections"]: a.axvline(s["start"], color="r", lw=1)
    for s in st["sections"]: ax[0].text(s["start"] + .5, ax[0].get_ylim()[1] - 2, s["label"], fontsize=9, color="r")
    ax[3].set_xlabel(f"time (s) — {st['bpm']:.1f} BPM; grey = bars, red = section boundaries")
    fig.tight_layout(); fig.savefig(prefix + "_overview.png", dpi=80)


if __name__ == "__main__":
    save(sys.argv[2], load(sys.argv[1]))
