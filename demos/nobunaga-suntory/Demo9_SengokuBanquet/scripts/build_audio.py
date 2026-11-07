"""Demo 9 audio: two dialogue voices (locked VOICEVOX personas), warm ambience (sake steam, charcoal brazier),
cold ambience (ice bucket, night wind, rain), foley, koto, night insects → HRTF binaural → 48 kHz master.
Reuses Demo 1's helpers + binaural renderer (Demo1_SnowFoxfire/tools/build_audio.py, loaded by path).

  python3 scripts/build_audio.py
Outputs: audio/stems/{N_voice,I_voice,F_warm,C_cool}.wav (dry, read by thermal/export/QA),
         audio/final/mix_48k.wav ; media/mix.m4a ; audio/voice_timing.json
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import banquet as BQ
import voice as V
B = V.B
B.S = BQ                                   # renderer reads positions from Demo 9's timeline
SR, N = BQ.SR, int(BQ.DURATION * BQ.SR)
AUD, MEDIA = os.path.join(ROOT, "audio"), os.path.join(ROOT, "media")
STEMS, FINAL = os.path.join(AUD, "stems"), os.path.join(AUD, "final")
rng = np.random.default_rng(1582)
db, filt, place, norm_to, adsr = B.db, B.filt, B.place, B.norm_to, B.adsr
LEVEL = {"say": -19.0, "whisper": -23.5, "laugh": -16.0}    # active RMS (dBFS) per delivery → laugh > speech > whisper


def noise(n): return rng.standard_normal(n)


# ---------------------------------------------------------------- warm sources (HEAT)
def steam(dur):
    """Warm sake: pour gurgle, then a soft steam hiss and tiny simmer bubbles."""
    n = int(dur * SR); tt = np.arange(n) / SR
    hiss = filt(B.sos_bp(2500, 9000), noise(n)) * (.55 + .45 * np.sin(2 * np.pi * .4 * tt) ** 2)
    bub = np.zeros(n)
    for t0 in np.sort(rng.uniform(0, dur - .1, int(dur * 9))):
        m = int(.03 * SR); k = np.arange(m) / SR; f = rng.uniform(500, 1400)
        place(bub, t0, np.sin(2 * np.pi * f * k * (1 + 4 * k)) * np.exp(-k / .008) * rng.uniform(.2, .6))
    return norm_to((hiss * .7 + bub) * adsr(n, .8, 1.6), -28)


def brazier(dur):
    """Charcoal brazier: embers crackle + soft low roar + a breath of airflow."""
    n = int(dur * SR); tt = np.arange(n) / SR
    crack = np.zeros(n); idx = rng.choice(n, int(dur * 22), replace=False)
    crack[idx] = rng.uniform(.2, 1, len(idx)) * rng.choice([-1, 1], len(idx))
    crack = filt(B.sos_bp(1200, 7000), crack) * 7
    roar = filt(B.sos_bp(90, 600), noise(n)) * (.7 + .3 * np.sin(2 * np.pi * .3 * tt))
    return norm_to((crack + roar) * adsr(n, .6, 1.4), -27)


# ---------------------------------------------------------------- cold sources (COOL)
def ice(dur):
    """Ice cubes shifting in a wooden bucket + a tokkuri lifted out (wet clinks)."""
    n = int(dur * SR); out = np.zeros(n); t = .1
    while t < dur - .3:
        m = int(.3 * SR); k = np.arange(m) / SR
        tone = sum(a * np.sin(2 * np.pi * f * k) * np.exp(-k / d) for f, a, d in
                   [(rng.uniform(1700, 2300), 1, .06), (rng.uniform(3100, 3800), .6, .04), (rng.uniform(900, 1100), .5, .09)])
        click = filt(B.sos_hp(2500), noise(m)) * np.exp(-k / .003) * .7
        place(out, t, (tone + click) * rng.uniform(.3, 1)); t += rng.uniform(.07, .35)
    water = filt(B.sos_bp(400, 3000), noise(n)) * .04 * (1 + np.sin(2 * np.pi * 1.3 * np.arange(n) / SR))
    return norm_to((out + water) * adsr(n, .05, .6), -29)


def wind(dur, gusty=True):
    """Night wind through the shoji: low rumble + band-passed howl with a slowly moving centre + gusts."""
    n = int(dur * SR); tt = np.arange(n) / SR
    gust = .45 + .55 * np.clip(np.sin(np.pi * tt / dur) ** .7 * (1 + .35 * np.sin(2 * np.pi * .55 * tt + 1)), 0, 1.3)
    nz = noise(n)
    howl = np.zeros(n); blk = SR // 20
    for i in range(0, n, blk):   # time-varying band (whistle centre 500–1100 Hz)
        fc = 500 + 600 * (.5 + .5 * np.sin(2 * np.pi * .23 * i / SR + 2))
        howl[i:i + blk] = filt(B.sos_bp(fc * .8, fc * 1.25), nz[max(0, i - 2048): i + blk])[-len(nz[i:i + blk]):]
    body = filt(B.sos_lp(380), nz) * 1.6 + filt(B.sos_bp(1500, 5000), nz) * .25
    rattle = np.zeros(n)
    for t0 in rng.uniform(.3, dur - .2, int(dur * 1.5)):   # shoji paper / frame rattles
        m = int(.06 * SR); k = np.arange(m) / SR
        place(rattle, t0, filt(B.sos_bp(300, 2500), noise(m)) * np.exp(-k / .015) * rng.uniform(.3, .8))
    return norm_to((body + howl * 1.3 + rattle * .5) * gust * adsr(n, .9, 1.6), -28)


def rain(dur, fade_in=1.5, fade_out=2.5):
    """Rain on the roof and garden: dense filtered drops + hiss."""
    n = int(dur * SR)
    drops = np.zeros(n); idx = rng.choice(n, int(dur * 900), replace=False)
    drops[idx] = rng.uniform(.1, 1, len(idx)) * rng.choice([-1, 1], len(idx))
    drops = filt(B.sos_bp(1500, 9000), drops) * 3 + filt(B.sos_bp(300, 1500), drops) * 1.5
    hiss = filt(B.sos_bp(800, 7000), noise(n)) * .5
    return norm_to((drops + hiss) * adsr(n, fade_in, fade_out), -29)


# ---------------------------------------------------------------- foley & music (no thermal)
def clink(dur=1.0):
    n = int(dur * SR); k = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * k) * np.exp(-k / d) for f, a, d in [(2650, 1, .25), (4100, .5, .15), (6200, .3, .08), (1320, .4, .35)])
    x2 = np.roll(x, int(.045 * SR)) * .6
    return norm_to(x + x2, -22)


def pour(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    g = np.zeros(n)
    for t0 in np.arange(.05, dur - .1, .045):
        m = int(.05 * SR); k = np.arange(m) / SR; f = 350 + 500 * (t0 / dur) + rng.uniform(-40, 40)
        place(g, t0, np.sin(2 * np.pi * f * k) * np.exp(-k / .012) * rng.uniform(.4, 1))
    return norm_to((g + filt(B.sos_bp(600, 4000), noise(n)) * .15) * adsr(n, .1, .4), -24)


def thunder(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    x = filt(B.sos_lp(140), noise(n)) * np.exp(-tt / 1.4) * (1 + .6 * np.sin(2 * np.pi * 1.7 * tt) ** 2)
    x += filt(B.sos_bp(150, 700), noise(n)) * np.exp(-((tt - .25) / .35) ** 2) * .5
    return norm_to(x * adsr(n, .25, 1.0), -24)


def koto_note(hz, dur=2.4):
    """Karplus–Strong plucked string with a slight koto-like bend."""
    n = int(dur * SR); p = int(SR / hz)
    buf = rng.uniform(-1, 1, p); out = np.zeros(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = .5 * (buf[i % p] + buf[(i + 1) % p]) * .996
    return filt(B.sos_hp(80), out)


def koto(dur, outro=False):
    """Sparse miyako-bushi phrase (E F A B C), slow and spacious — Azuchi at night."""
    scale = [329.63, 349.23, 440.0, 493.88, 523.25, 659.26, 698.46]
    phrase = [(0, 4), (1.1, 2), (1.9, 1), (3.2, 0), (5.0, 3), (5.8, 4), (6.6, 6), (8.4, 5), (10.6, 2), (11.4, 1), (12.2, 0),
              (14.4, 4), (15.2, 3), (16.0, 2), (17.6, 0)]
    if outro: phrase = [(0, 4), (.8, 3), (1.6, 2), (2.4, 0)]
    n = int(dur * SR); L_ = np.zeros(n + 3 * SR); R_ = np.zeros(n + 3 * SR)
    for t0, k in phrase:
        if t0 > dur - .2: break
        x = koto_note(scale[k]) * .5; pan = (k - 3) / 8
        place(L_, t0, x * (1 - pan)); place(R_, t0, x * (1 + pan))
    env = adsr(n, .05, 2.5)
    return np.stack([L_[:n] * env, R_[:n] * env], 1)


def insects(level_env):
    """Suzumushi (bell crickets): 4.5 kHz trills, stereo, scattered in the garden."""
    out = np.zeros((N, 2)); t = 0.0
    while t < BQ.DURATION - 1:
        m = int(rng.uniform(.25, .6) * SR); k = np.arange(m) / SR; f = rng.uniform(4200, 4900)
        x = np.sin(2 * np.pi * f * k) * (np.sin(2 * np.pi * rng.uniform(28, 40) * k) > .2) * adsr(m, .02, .08)
        pan = rng.uniform(-1, 1); place(out[:, 0], t, x * (1 - pan) * .5); place(out[:, 1], t, x * (1 + pan) * .5)
        t += rng.uniform(.25, .9)
    return filt(B.sos_bp(3500, 7000), out.T).T * level_env[:, None]


# ---------------------------------------------------------------- build
def main():
    for d in (STEMS, FINAL, MEDIA): os.makedirs(d, exist_ok=True)
    VO = {w: np.zeros(N) for w in "NI"}
    warm, cool, foley = np.zeros(N), np.zeros(N), np.zeros(N)
    music = np.zeros((N, 2)); bed = np.zeros(N)
    timing = []
    for i, c in enumerate(BQ.CUES):
        k = c["kind"]
        if k in ("say", "whisper", "laugh"):
            x = V.perform(c, V.TAKE.get(i, 0))
            x = norm_to(x, LEVEL[k] + (2.0 if c["emo"] == "excited" else 0) - (2.0 if c["emo"] == "earlaugh" else 0))
            if k == "whisper": place(VO[c["who"]], c["t"] - .45, B.inhale() * .7)
            place(VO[c["who"]], c["t"], x); dur = len(x) / SR
        elif k == "steam": x = steam(c["dur"]) * c["gain"]; place(warm, c["t"], x); dur = c["dur"]
        elif k == "brazier": x = brazier(c["dur"]) * c["gain"]; place(warm, c["t"], x); dur = c["dur"]
        elif k == "ice": x = ice(c["dur"]) * c["gain"]; place(cool, c["t"], x); dur = c["dur"]
        elif k == "wind": x = wind(c["dur"]) * c["gain"]; place(cool, c["t"], x); dur = c["dur"]
        elif k == "rain":
            x = rain(c["dur"], 1.5 if c["az"] < 0 else .6, 3.5 if c["az"] > 0 else .6) * c["gain"]
            place(cool, c["t"], x); place(bed, c["t"], rain(c["dur"], 2.0, 3.5) * .35); dur = c["dur"]
        elif k == "clink": place(foley, c["t"], clink(c["dur"])); dur = c["dur"]
        elif k == "pour": place(foley, c["t"], pour(c["dur"])); dur = c["dur"]
        elif k == "thunder": place(foley, c["t"], thunder(c["dur"])); dur = c["dur"]
        elif k == "koto":
            x = koto(c["dur"], c.get("outro", False)); i0 = int(c["t"] * SR); music[i0:i0 + len(x)] += x[:N - i0]; dur = c["dur"]
        elif k == "you": dur = c["dur"]            # your own line: subtitle only, no sound
        else: dur = c.get("dur", 0.0)
        timing.append(dict(i=i, t=c["t"], who=c["who"], kind=k, dur=round(dur, 3)))
    for w in "NI":
        seq = [x for x in timing if x["who"] == w and x["kind"] in ("say", "whisper", "laugh")]
        for a, b in zip(seq, seq[1:]):
            if a["t"] + a["dur"] > b["t"] - .05: print(f"  ! {w} line at {a['t']}s ({a['dur']:.2f}s) runs into {b['t']}s")
    json.dump(timing, open(os.path.join(AUD, "voice_timing.json"), "w"), indent=1)
    credits = ["ElevenLabs"]
    json.dump(dict(backend="elevenlabs", credits=credits), open(os.path.join(MEDIA, "voice.json"), "w"), ensure_ascii=False)

    t = np.arange(N) / SR
    # insects: present in calm scenes, gone in wind/rain, back at the end
    ins_env = np.interp(t, [BQ.W(x) for x in (0, 3, 80, 83, 129, 135, 148, 150)], [0, 1, 1, 0, 0, .8, .8, 0])
    # only the dry stems the thermal controller / export / QA read (binaural intermediates are not kept: −300 MB)
    for name, x in [("N_voice", VO["N"]), ("I_voice", VO["I"]), ("F_warm", warm), ("C_cool", cool)]:
        B.write_wav(os.path.join(STEMS, name + ".wav"), x)
    print("rendering binaural…", flush=True)
    nb, ib = B.render(VO["N"], who="N"), B.render(VO["I"], who="I")
    fb, cb = B.render(warm, who="F"), B.render(cool, who="C")
    ob = B.render(foley, az=0, d=0.7)
    rb = B.render(bed, az=-55, d=3.0) * .7 + B.render(np.roll(bed, 7919), az=55, d=3.0) * .7
    mb = B.render(music[:, 0], az=-30, d=3.5) + B.render(music[:, 1], az=30, d=3.5)
    ins = insects(ins_env) * db(-30)
    room = np.stack([filt(B.sos_lp(300), noise(N)) for _ in range(2)], 1)
    room = room / np.sqrt(np.mean(room ** 2)) * db(-50) * (np.clip(t / 2, 0, 1) * np.clip((BQ.DURATION - t) / 3, 0, 1))[:, None]
    mix = nb + ib + fb * .9 + cb * .85 + ob + rb + mb * .5 + ins + room
    mix = mix / np.max(np.abs(mix)) * db(-1)
    pre = os.path.join(FINAL, "mix_premaster.wav"); B.write_wav(pre, mix)
    out = os.path.join(FINAL, "mix_48k.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pre, "-af",
                    "acompressor=threshold=-30dB:ratio=2.5:attack=5:release=180:makeup=5,alimiter=limit=0.84:attack=3:release=60:level=disabled,loudnorm=I=-19:TP=-1.5:LRA=9",
                    "-ar", str(SR), "-c:a", "pcm_s24le", out], check=True)
    os.remove(pre)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out, "-c:a", "aac", "-b:a", "192k", os.path.join(MEDIA, "mix.m4a")], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", out, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    print("mix loudness:", " ".join(l.strip() for l in r[r.rfind("Summary:"):].splitlines() if l.strip().startswith(("I:", "Peak:"))))


if __name__ == "__main__":
    main()
