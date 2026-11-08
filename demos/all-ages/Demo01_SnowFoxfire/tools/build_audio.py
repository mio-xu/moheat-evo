"""Stage 3 + 5: draft voices, breaths, magic SFX, foley, binaural mix (48 kHz).

  python3 tools/build_audio.py           # everything (TTS is cached in output/cache)
  python3 tools/build_audio.py --lang ja|en|zh [--count]   # dubbed per-line takes for comparison (see dub() at the end)

Writes
  output/stems/{K,H}_{voice,breath,magic,foley}.wav   dry mono sub-stems (48 kHz)
  output/stems/{K,H}_dry.wav       voice+breath+magic  → the ONLY input of the thermal controller
  output/stems/{K,H}_binaural.wav  spatialised character stems
  output/stems/ambience_binaural.wav   wind / irori fire / door (never drives thermal)
  output/mix_48k.wav               final binaural ASMR mix, 48 kHz / 24-bit stereo
  media/mix.m4a                    web copy for the demo
  output/voice_timing.json         measured length of every line
"""
import hashlib, importlib.util, json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

sys.path.insert(0, os.path.dirname(__file__))
import story as S
import tts_voicevox as VV

# Voice backend: VOICEVOX (emotional anime voices) when its engine is running, otherwise macOS Kyoko (draft).
BACKEND = "eleven"   # 2026-11-08 (user): ElevenLabs; before: "voicevox" if VV.available() else "kyoko"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT, MEDIA = os.path.join(ROOT, "output"), os.path.join(ROOT, "media")
CACHE, STEMS = os.path.join(OUT, "cache"), os.path.join(OUT, "stems")
SR, N = S.SR, int(S.DURATION * S.SR)
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- helpers
def db(x): return 10 ** (x / 20)

def sos_bp(lo, hi, order=2): return signal.butter(order, [lo, hi], "bandpass", fs=SR, output="sos")
def sos_lp(f, order=2): return signal.butter(order, f, "lowpass", fs=SR, output="sos")
def sos_hp(f, order=2): return signal.butter(order, f, "highpass", fs=SR, output="sos")
def filt(sos, x): return signal.sosfilt(sos, x)

def active_rms(x):
    """RMS over the loudest 60 % of 20 ms frames (ignores silence)."""
    f = len(x) // 960
    if f < 1: return np.sqrt(np.mean(x ** 2) + 1e-12)
    e = np.sqrt(np.mean(x[: f * 960].reshape(f, 960) ** 2, axis=1))
    e = np.sort(e)[int(f * 0.4):]
    return np.sqrt(np.mean(e ** 2) + 1e-12)

def norm_to(x, target_db):
    return x * (db(target_db) / active_rms(x))

def env_follow(x, hz=30):
    return filt(sos_lp(hz, 1), np.abs(x)) * 1.6

def adsr(n, a, r):
    e = np.ones(n)
    na, nr = min(n, int(a * SR)), min(n, int(r * SR))
    if na: e[:na] = np.sin(np.linspace(0, np.pi / 2, na)) ** 2
    if nr: e[-nr:] *= np.cos(np.linspace(0, np.pi / 2, nr)) ** 2
    return e

def place(track, t, x):
    i = int(round(t * SR))
    j = min(len(track), i + len(x))
    if j > i: track[i:j] += x[: j - i]

def write_wav(path, x):
    """Float → 24-bit PCM via ffmpeg."""
    tmp = path + ".f32.wav"
    wavfile.write(tmp, SR, x.astype(np.float32))
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:a", "pcm_s24le", path], check=True)
    os.remove(tmp)

# ---------------------------------------------------------------- voices (draft TTS)
# ElevenLabs (2026-11-08, user's picks in tools/eleven/cast.json): K = koyuki r1_b, H = homura r1_c, A = ayane r1_a (Demo 2 calls tts(.., "A")).
_EL = []
EL_CAST = {"K": "koyuki", "H": "homura", "A": "ayane"}
EL_TAG = {"determined": "[determined]", "happy": "[happy]", "laugh": "[laughs]", "pout": "[pouting]", "shy": "[shy]", "smug": "[smug]",
          "surprise": "[surprised]", "sleepy": "[sleepy]", "playful": "[playful]", "magic": "[excited]"}
EL_SMILE = {"K": "[softly]", "H": "[cheerful]", "A": "[cheerful]"}


def el():
    if not _EL:
        import importlib.util
        sp = importlib.util.spec_from_file_location("eleven", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools", "eleven", "tts.py"))
        m = importlib.util.module_from_spec(sp); sp.loader.exec_module(m); _EL.append(m)
    return _EL[0]


def el_text(text, who, whisper, expr):
    tag = "[whispers]" + (" " + EL_TAG[expr] if expr in EL_TAG and expr not in ("sleepy",) else "") if whisper else EL_TAG.get(expr, EL_SMILE.get(who, ""))
    return f"{tag} {text}".strip()


def tts(text, who, whisper=False, expr="smile"):
    if BACKEND == "eleven":
        E = el(); vid = E.voice(EL_CAST[who]); txt = el_text(text, who, whisper, expr)
        key = hashlib.md5(f"el|{vid}|{E.MODEL}|{E.SEED}|{txt}".encode()).hexdigest()[:12]
        wav = os.path.join(CACHE, f"el_{key}.wav")
        if not os.path.exists(wav):
            import io
            from scipy.signal import resample_poly
            sr0, y = wavfile.read(io.BytesIO(E.speak(txt, vid)))
            x = resample_poly(y.astype(np.float64) / 32768, SR, sr0)
            wavfile.write(wav, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        sr, x = wavfile.read(wav)
        x = x.astype(np.float64) / 32768.0
        e = env_follow(x, 40); idx = np.where(e > 0.01)[0]
        x = x[max(0, idx[0] - 480): idx[-1] + 2400] if len(idx) else x
        a, b = int(.01 * SR), int(.06 * SR); x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b)
        return x
    if BACKEND == "voicevox":
        cfg = json.dumps(VV.CAST[who], ensure_ascii=False, sort_keys=True)
        key = hashlib.md5(f"vv|{cfg}|{whisper}|{expr}|{text}".encode()).hexdigest()[:12]
        wav = os.path.join(CACHE, f"vv_{key}.wav")
        if not os.path.exists(wav):
            x, style = VV.synth(text, who, "whisper" if whisper else "say", expr, SR)
            wavfile.write(wav, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        sr, x = wavfile.read(wav)
        x = x.astype(np.float64) / 32768.0
        e = env_follow(x, 40); idx = np.where(e > 0.01)[0]
        return x[max(0, idx[0] - 480): idx[-1] + 2400] if len(idx) else x
    ch = S.CHARACTERS[who]
    rate = ch["whisper_rate"] if whisper else ch["rate"]
    key = hashlib.md5(f"{ch['voice']}|{rate}|{ch['pitch']}|{text}".encode()).hexdigest()[:12]
    wav = os.path.join(CACHE, f"tts_{key}.wav")
    if not os.path.exists(wav):
        aiff = wav[:-4] + ".aiff"
        subprocess.run(["say", "-v", ch["voice"], "-r", str(rate), "-o", aiff, text], check=True)
        p = ch["pitch"]
        # raise pitch (asetrate) and restore tempo (atempo) → each character gets her own register
        af = f"asetrate={int(22050 * p)},aresample={SR},atempo={1 / p:.4f}"
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", aiff, "-af", af, "-ac", "1", "-ar", str(SR), wav], check=True)
        os.remove(aiff)
    sr, x = wavfile.read(wav)
    x = x.astype(np.float64) / 32768.0
    # trim TTS silence
    e = env_follow(x, 40)
    idx = np.where(e > 0.01)[0]
    if len(idx): x = x[max(0, idx[0] - 480): idx[-1] + 2400]
    return x

def whisperize(x):
    """Breathy ASMR whisper: keep some voice, add aspiration noise that follows the speech envelope."""
    env = env_follow(x, 35)
    air = filt(sos_bp(1400, 8500), rng.standard_normal(len(x))) * env * 2.2
    voice = filt(sos_hp(220), x) * 0.42
    # soft lip/mouth texture: very sparse clicks on syllable onsets
    y = voice + air
    return y * adsr(len(y), 0.02, 0.12)

def inhale(dur=0.42):
    n = int(dur * SR)
    x = filt(sos_bp(700, 4200), rng.standard_normal(n)) * np.sin(np.linspace(0, np.pi, n)) ** 1.5
    return norm_to(x, -34)

# ---------------------------------------------------------------- breaths & magic
def breath(style, dur, gain):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    wob = 1 + 0.12 * np.sin(2 * np.pi * rng.uniform(4, 6) * np.arange(n) / SR)
    if style == "cold":   # "ふぅー": narrow lips → bright, hissy, a hint of whistle
        x = filt(sos_bp(1800, 7500), noise) + 0.35 * filt(sos_bp(5200, 5600, 2), noise)
        env = adsr(n, 0.12, min(0.6, dur * 0.45)) * np.linspace(1.0, 0.75, n)
    else:                 # "はぁ〜": open mouth → warm, formant-shaped, softer edge
        x = (filt(sos_bp(350, 2600), noise) + 0.8 * filt(sos_bp(700, 1100, 2), noise)
             + 0.5 * filt(sos_bp(1400, 1900, 2), noise))
        env = adsr(n, 0.22, min(0.8, dur * 0.5))
    return norm_to(x * env * wob, -19) * gain

def pant(dur, gain):
    out, t = np.zeros(int(dur * SR) + SR), 0.0
    while t < dur - 0.3:
        b = breath("warm", 0.32, 0.8) * 0.7 + breath("cold", 0.32, 0.5) * 0.3   # out-breath
        place(out, t, b); place(out, t + 0.38, inhale(0.22) * 2.0)
        t += 0.62
    return out[: int(dur * SR)] * gain

def magic(style, dur, gain):
    n = int(dur * SR); t = np.arange(n) / SR
    x = np.zeros(n)
    if style == "ice":     # crystalline chimes + frosty shimmer
        notes = 440 * 2 ** (np.array([0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]) / 12) * 4
        for k in range(int(dur * 7)):
            st = rng.uniform(0, dur - 0.3); f = rng.choice(notes); dec = rng.uniform(0.5, 1.4)
            m = int(min(dur - st, 2.0) * SR); tt = np.arange(m) / SR
            tone = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt / dec * 3)
            place_x = int(st * SR); x[place_x: place_x + m] += tone[: n - place_x] * rng.uniform(0.3, 0.8)
        x += filt(sos_bp(7000, 12000), rng.standard_normal(n)) * 0.25
    elif style == "fire":  # foxfire: crackles + soft roar
        crack = np.zeros(n)
        idx = rng.choice(n, int(dur * 28), replace=False)
        crack[idx] = rng.uniform(0.3, 1.0, len(idx)) * rng.choice([-1, 1], len(idx))
        crack = filt(sos_bp(900, 6000), crack) * 6
        roar = filt(sos_bp(120, 900), rng.standard_normal(n)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * t))
        tone = 0.15 * np.sin(2 * np.pi * (330 + 30 * np.sin(2 * np.pi * 0.5 * t)) * t)
        x = crack + roar + tone
    else:                  # whoosh: fast rising swell
        nz = rng.standard_normal(n)
        x = filt(sos_bp(300, 1800), nz) * (1 - t / dur) + filt(sos_bp(1500, 6000), nz) * (t / dur)
        x *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
        x += 0.2 * np.sin(2 * np.pi * (300 + 900 * t / dur) * t) * np.exp(-((t - dur * 0.6) / (dur * 0.25)) ** 2)
    return norm_to(x * adsr(n, 0.25, min(1.2, dur * 0.4)), -21) * gain

def footsteps(t0, t1, period):
    out = np.zeros(N); t = t0
    while t < t1:
        m = int(0.07 * SR)
        tap = filt(sos_bp(120, 1600), rng.standard_normal(m)) * np.exp(-np.arange(m) / SR / 0.018)
        place(out, t, tap * rng.uniform(0.5, 1.0) * 0.08)
        t += period * rng.uniform(0.9, 1.1)
    return out

# ---------------------------------------------------------------- binaural renderer
HEAD_A, C = 0.0875, 343.0           # head radius (m), speed of sound
W0 = C / HEAD_A
BLOCK = 240                         # 5 ms parameter blocks

def _shadow_coeffs(phi):
    """Brown & Duda (1998) one-pole/one-zero head-shadow filter for incidence angle phi (rad from ear axis)."""
    alpha = (1 + 0.1 / 2) + (1 - 0.1 / 2) * np.cos(phi / np.radians(150) * np.pi)
    k = SR / W0
    b = np.array([1 + alpha * k, 1 - alpha * k]); a = np.array([1 + k, 1 - k])
    return b / a[0], a / a[0]

def _make_ir():
    n = int(0.7 * SR); t = np.arange(n) / SR
    ir = np.zeros((n, 2))
    for c in range(2):
        nz = rng.standard_normal(n) * np.exp(-t / 0.12)
        ir[:, c] = filt(sos_lp(5000), nz)
        for d_ms, g in [(7, 0.5), (11, 0.35), (17, 0.3), (23, 0.22)]:
            ir[int((d_ms + c * 1.7) / 1000 * SR), c] += g
    return ir / np.sqrt(np.sum(ir ** 2) / 2)
ROOM_IR = _make_ir()

def render(x, who=None, az=None, d=None):
    """Spatialise mono x. Position from the story (who) or constant (az, d)."""
    nb = int(np.ceil(len(x) / BLOCK))
    bt = (np.arange(nb) + 0.5) * BLOCK / SR
    if who:
        a, dist = S.positions(bt)[who]
    else:
        a, dist = np.full(nb, float(az)), np.full(nb, float(d))
    th = np.radians(a)
    src = np.stack([dist * np.sin(th), dist * np.cos(th)], 1)
    n = np.arange(len(x))
    out = np.zeros((len(x), 2))
    for e, side in enumerate((-1, 1)):
        cos_phi = np.clip(side * np.sin(th), -1, 1)
        phi = np.arccos(cos_phi)
        itd = np.where(phi < np.pi / 2, HEAD_A / C * (1 - np.cos(phi)), HEAD_A / C * (1 + phi - np.pi / 2))
        dist_e = np.hypot(src[:, 0] - side * HEAD_A, src[:, 1])
        gain = (1.0 / np.maximum(dist_e, 0.08)) ** 0.62
        dly = np.interp(n, bt * SR, itd * SR)
        g = np.interp(n, bt * SR, gain)
        y = np.interp(n - dly, n, x, left=0.0)
        z = np.zeros_like(y); zi = np.zeros(1)
        for i in range(nb):
            b, aa = _shadow_coeffs(phi[i])
            s0, s1 = i * BLOCK, min(len(x), (i + 1) * BLOCK)
            z[s0:s1], zi = signal.lfilter(b, aa, y[s0:s1], zi=zi)
        out[:, e] = z * g
    send = np.interp(n, bt * SR, 0.03 + 0.11 * np.clip(dist / 3.0, 0, 1))
    wet = x * send
    for e in range(2):
        out[:, e] += signal.fftconvolve(wet, ROOM_IR[:, e])[: len(x)]
    return out

# ---------------------------------------------------------------- build
def main():
    os.makedirs(CACHE, exist_ok=True); os.makedirs(STEMS, exist_ok=True); os.makedirs(MEDIA, exist_ok=True)
    tracks = {w: {k: np.zeros(N) for k in ("voice", "breath", "magic", "foley")} for w in "KH"}
    timing = []
    for i, c in enumerate(S.CUES):
        who, kind = c["who"], c["kind"]
        if kind in ("say", "whisper"):
            x = tts(c["tts"], who, whisper=(kind == "whisper"), expr=c["expr"])
            if kind == "whisper":
                # VOICEVOX already whispers (ささやき style): only add a little air; Kyoko needs the full treatment
                x = norm_to(x if BACKEND == "eleven" else x + 0.35 * whisperize(x) if BACKEND == "voicevox" else whisperize(x), -25)
                place(tracks[who]["breath"], c["t"] - 0.55, inhale())
            else:
                x = norm_to(x, -19 if not c.get("duet") else -21)
            place(tracks[who]["voice"], c["t"], x)
            dur = len(x) / SR
        elif kind == "breath":
            x = breath(c["style"], c["dur"], c["gain"]); place(tracks[who]["breath"], c["t"], x); dur = c["dur"]
        elif kind == "pant":
            x = pant(c["dur"], c["gain"]); place(tracks[who]["breath"], c["t"], x); dur = c["dur"]
        elif kind == "magic":
            x = magic(c["style"], c["dur"], c["gain"]); place(tracks[who]["magic"], c["t"], x); dur = c["dur"]
        timing.append(dict(i=i, t=c["t"], who=who, kind=kind, dur=round(dur, 3)))
    for t0, t1 in S.FOOTSTEPS:
        tracks["K"]["foley"] += footsteps(t0, t1, 0.24)
        tracks["H"]["foley"] += footsteps(t0 + 0.1, t1, 0.27)

    # overlap check (same character)
    for w in "KH":
        seq = sorted([x for x in timing if x["who"] == w and x["kind"] in ("say", "whisper")], key=lambda x: x["t"])
        for a, b in zip(seq, seq[1:]):
            if a["t"] + a["dur"] > b["t"] - 0.05:
                print(f"  ! {w}: line at {a['t']}s ({a['dur']:.2f}s) runs into {b['t']}s")
    with open(os.path.join(OUT, "voice_timing.json"), "w") as f: json.dump(timing, f, indent=1)
    with open(os.path.join(MEDIA, "voice.json"), "w") as f:
        json.dump(dict(backend=BACKEND, credits=["ElevenLabs"] if BACKEND == "eleven" else VV.credits() if BACKEND == "voicevox" else ["macOS Kyoko (draft)"]), f, ensure_ascii=False)
    print("voice backend:", BACKEND)

    # stems
    mix = np.zeros((N, 2))
    for w in "KH":
        for k, x in tracks[w].items(): write_wav(os.path.join(STEMS, f"{w}_{k}.wav"), x)
        dry = tracks[w]["voice"] + tracks[w]["breath"] + tracks[w]["magic"]
        write_wav(os.path.join(STEMS, f"{w}_dry.wav"), dry)
        print(f"rendering {w} binaural…", flush=True)
        b = render(dry + tracks[w]["foley"], who=w)
        write_wav(os.path.join(STEMS, f"{w}_binaural.wav"), b)
        mix += b

    # ambience: wind (stereo bed), irori fire (front-right, 1.8 m), shoji door at 1.8 s
    t = np.arange(N) / SR
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.05 * t + 1.0) * np.sin(2 * np.pi * 0.013 * t)
    wind = np.stack([filt(sos_lp(500), rng.standard_normal(N)) for _ in range(2)], 1) * lfo[:, None]
    wind = wind / np.sqrt(np.mean(wind ** 2)) * db(-38)
    crack = np.zeros(N); idx = rng.choice(N, int(S.DURATION * 6), replace=False)
    crack[idx] = rng.uniform(0.2, 1.0, len(idx)); crack = filt(sos_bp(800, 5000), crack) * 0.25
    crack += filt(sos_lp(250), rng.standard_normal(N)) * db(-44)
    amb = wind + render(crack, az=15, d=1.8) * 0.5
    door = np.zeros(int(1.2 * SR))
    door[: int(0.95 * SR)] = filt(sos_bp(250, 2800), rng.standard_normal(int(0.95 * SR))) * (
        0.5 + 0.5 * rng.random(int(0.95 * SR)) ** 4) * adsr(int(0.95 * SR), 0.1, 0.2)
    tt = np.arange(int(0.25 * SR)) / SR
    door[int(0.95 * SR):] = np.sin(2 * np.pi * 170 * tt) * np.exp(-tt / 0.04)
    dt = np.zeros(N); place(dt, S.AMBIENCE_EVENTS[0]["t"], norm_to(door, -24))
    amb += render(dt, az=0, d=3.2)
    fade = np.clip(t / 2.5, 0, 1) * np.clip((S.DURATION - t) / 3.0, 0, 1)
    amb *= fade[:, None]
    write_wav(os.path.join(STEMS, "ambience_binaural.wav"), amb)
    mix += amb

    # master: gentle soft-clip above -3 dBFS, then peak to -1 dBFS
    peak = np.max(np.abs(mix)); mix = mix / peak * db(-0.5)
    thr = db(-3)
    over = np.abs(mix) > thr
    mix[over] = np.sign(mix[over]) * (thr + (1 - thr) * np.tanh((np.abs(mix[over]) - thr) / (1 - thr)))
    mix = mix / np.max(np.abs(mix)) * db(-1.0)
    # loudness: gentle compression + limiter + EBU R128 normalisation (−18 LUFS, −1.5 dBTP).
    # Only the listening mix changes — the thermal controller reads the dry stems.
    pre = os.path.join(OUT, "mix_premaster.wav"); write_wav(pre, mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pre, "-af",
                    "acompressor=threshold=-30dB:ratio=3:attack=5:release=150:makeup=6,"
                    "alimiter=limit=0.84:attack=3:release=60:level=disabled,"
                    "loudnorm=I=-18:TP=-1.5:LRA=8",
                    "-ar", str(SR), "-c:a", "pcm_s24le", os.path.join(OUT, "mix_48k.wav")], check=True)
    os.remove(pre)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(OUT, "mix_48k.wav"),
                    "-c:a", "aac", "-b:a", "192k", os.path.join(MEDIA, "mix.m4a")], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", os.path.join(OUT, "mix_48k.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    summ = r[r.rfind("Summary:"):]
    print("mix loudness:", " ".join(l.strip() for l in summ.splitlines() if l.strip().startswith(("I:", "Peak:"))))

# ---------------------------------------------------------------- dubbed takes (user 2026-11-09, comparison only: the film keeps ja)
# python3 tools/build_audio.py --lang ja|en|zh [--count] → media/voice/<lang>/c<NN>.m4a (NN = index in S.CUES) + index.json, one dry
# mono file per line, same voice / settings / tags / trim / level (say −19, whisper −25 dB) as the film. ja = the film's cached takes
# (no credits); en / zh = the subtitle text with the ja tags moved in (tools/eleven/dub.py). Not mixed into the film.
DUB_NAMES = {"zh": [("小雪", "Koyuki"), ("小焰", "Homura")]}
DUB_OVERRIDE = {("zh", "c19"): "[pouting] Ho、Homura…别挤我嘛…"}  # (lang, cue id) → hand-tagged text (c19: the stutter keeps the name)


def dub(lang, count_only=False):
    E = el()
    sp = importlib.util.spec_from_file_location("dub", os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "..", "tools", "eleven", "dub.py"))
    D = importlib.util.module_from_spec(sp); sp.loader.exec_module(D)
    cues = {f"c{i:02d}": c for i, c in enumerate(S.CUES) if c["kind"] in ("say", "whisper")}
    lines = {}
    for k, c in cues.items():
        tagged = el_text(c["tts"], c["who"], c["kind"] == "whisper", c["expr"])
        if lang == "ja": lines[k] = (E.voice(EL_CAST[c["who"]]), tagged); continue
        sub = c[lang] or next((d[lang] for d in cues.values() if d["ja"] == c["ja"] and d[lang]), "")   # the duet line
        lines[k] = (E.voice(EL_CAST[c["who"]]), DUB_OVERRIDE.get((lang, k)) or D.retag(tagged, D.names(sub, lang, DUB_NAMES), lang))
    print(f"[{lang}] {len(lines)} lines, {D.chars(lines)} chars" + (" (ja = cached film takes, 0 credits)" if lang == "ja" else ""))
    if count_only: return
    out = os.path.join(MEDIA, "voice", lang); os.makedirs(out, exist_ok=True); durs = {}
    for k, c in cues.items():
        vid, text = lines[k]
        if lang == "ja": x = tts(c["tts"], c["who"], whisper=(c["kind"] == "whisper"), expr=c["expr"])
        else:
            wav = os.path.join(CACHE, f"el_{lang}_{D.key(vid, lang, text)}.wav")
            if not os.path.exists(wav):
                import io
                from scipy.signal import resample_poly
                sr0, y = wavfile.read(io.BytesIO(E.speak(text, vid, lang=lang)))
                wavfile.write(wav, SR, (np.clip(resample_poly(y.astype(np.float64) / 32768, SR, sr0), -1, 1) * 32767).astype(np.int16))
                print("voiced", lang, k, text, flush=True)
            x = wavfile.read(wav)[1].astype(np.float64) / 32768.0
            e = env_follow(x, 40); idx = np.where(e > 0.01)[0]
            x = x[max(0, idx[0] - 480): idx[-1] + 2400] if len(idx) else x
            a, b = int(.01 * SR), int(.06 * SR); x[:a] *= np.linspace(0, 1, a); x[-b:] *= np.linspace(1, 0, b)
        x = norm_to(x, -25 if c["kind"] == "whisper" else -19)
        tmp = os.path.join(out, k + ".wav"); wavfile.write(tmp, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", tmp, "-c:a", "aac", "-b:a", "112k", os.path.join(out, k + ".m4a")], check=True)
        os.remove(tmp); durs[k] = round(len(x) / SR, 3)
    json.dump(dict(lang=lang, text={k: v[1] for k, v in lines.items()}, sub={k: c[lang] or c["ja"] for k, c in cues.items()},
                   t={k: c["t"] for k, c in cues.items()}, who={k: c["who"] for k, c in cues.items()}, dur=durs),
              open(os.path.join(out, "index.json"), "w"), ensure_ascii=False, indent=1)
    print(f"[{lang}] {len(durs)} lines, {round(sum(durs.values()), 1)} s")


if __name__ == "__main__":
    if "--lang" in sys.argv: dub(sys.argv[sys.argv.index("--lang") + 1], "--count" in sys.argv)
    else: main()
