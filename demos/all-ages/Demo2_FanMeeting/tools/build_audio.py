"""Demo 2 audio: voice (VOICEVOX ずんだもん), sung melody, warm breaths (HEAT stem), cooling SFX (COOL stem),
music & foley (no thermal), binaural render, 48 kHz master.  Reuses Demo 1's synthesis / HRTF / mastering code.

  python3 tools/build_audio.py
Outputs (output/):  stems/heat_{voice,breath}.wav, heat_dry.wav, cool_{fan,ice,breath,magic}.wav, cool_dry.wav,
                    foley.wav, music.wav, ambience.wav, *_binaural.wav, mix_48k.wav ; media/mix.m4a ; voice_timing.json
"""
import json, os, subprocess, sys, urllib.parse, urllib.request
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fanmeeting as FM
from demo1 import load
B = load("build_audio")          # Demo 1: synthesis helpers, HRTF renderer, write_wav
VV = B.VV                         # the same VOICEVOX client instance Demo 1 uses

B.S = FM                                         # renderer + Kyoko fallback read positions/characters from Demo 2
B.CACHE = os.path.join(ROOT, "output", "cache")
VV.CAST["A"] = FM.VOICE
OUT, MEDIA, STEMS = os.path.join(ROOT, "output"), os.path.join(ROOT, "media"), os.path.join(ROOT, "output", "stems")
SR, N = FM.SR, int(FM.DURATION * FM.SR)
B.N = N                                          # Demo 1 helpers (footsteps …) size their tracks by B.N: use this film's length
rng = np.random.default_rng(11)
db, filt, place, norm_to, adsr = B.db, B.filt, B.place, B.norm_to, B.adsr


# ---------------------------------------------------------------- singing (VOICEVOX, one note per mora)
def load_song(rel):
    """ElevenLabs Music / isolated vocal → mono float at SR."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, rel), "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def sing(phrase):
    """Synthesise one lyric phrase with an original melody by setting each mora's pitch and length."""
    key = f"sing_{abs(hash(json.dumps(phrase, ensure_ascii=False) + json.dumps(FM.VOICE, ensure_ascii=False))) % 10**12}.wav"
    path = os.path.join(B.CACHE, key)
    if not os.path.exists(path):
        sid = VV.style_id(FM.VOICE["speaker"], FM.VOICE["styles"]["sing"])
        q = urllib.parse.urlencode({"text": phrase["kana"], "speaker": sid})
        with urllib.request.urlopen(urllib.request.Request(f"{VV.URL}/audio_query?{q}", method="POST"), timeout=60) as r:
            query = json.load(r)
        moras = [m for ap in query["accent_phrases"] for m in ap["moras"]]
        notes, lens = phrase["notes"], phrase["lens"]
        if len(moras) != len(notes):
            print(f"  ! '{phrase['kana']}': {len(moras)} moras vs {len(notes)} notes — extending/truncating")
        for i, m in enumerate(moras):
            n = notes[min(i, len(notes) - 1)]; L = lens[min(i, len(lens) - 1)] * FM.EIGHTH
            hz = 440 * 2 ** ((n - 69) / 12)
            cons = min(m["consonant_length"] or 0, 0.06) if m.get("consonant") else None
            if cons is not None: m["consonant_length"] = cons
            m["vowel_length"] = max(0.05, L - (cons or 0)); m["pitch"] = float(np.log(hz))
        for ap in query["accent_phrases"]: ap["pause_mora"] = None
        query.update(speedScale=1.0, pitchScale=0.0, intonationScale=1.0, volumeScale=1.0, prePhonemeLength=0.0,
                     postPhonemeLength=0.15, outputSamplingRate=SR, outputStereo=False)
        req = urllib.request.Request(f"{VV.URL}/synthesis?speaker={sid}", data=json.dumps(query).encode(),
                                     headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=120) as r: data = r.read()
        open(path, "wb").write(data)
    sr, x = wavfile.read(path)
    x = x.astype(np.float64) / 32768.0
    # gentle vibrato-like shimmer + soft reverb tail so it sits like singing, not speech
    t = np.arange(len(x)) / SR
    x = x * (1 + .04 * np.sin(2 * np.pi * 5.5 * t))
    wet = signal.fftconvolve(x, B.ROOM_IR[:, 0])[: len(x)] * .18
    return norm_to(x + wet, -18)


# ---------------------------------------------------------------- cooling SFX
def fan(dur, rate=3.3):
    """Folding fan: rhythmic flaps — air whoosh + low push + paper flutter."""
    n = int(dur * SR); out = np.zeros(n); t = 0.05
    while t < dur - .2:
        m = int(.28 * SR); e = np.exp(-np.arange(m) / SR / .07) * (1 - np.exp(-np.arange(m) / SR / .012))
        nz = rng.standard_normal(m)
        flap = filt(B.sos_bp(300, 2600), nz) * e + 1.6 * filt(B.sos_lp(140), nz) * e + .25 * filt(B.sos_bp(3500, 7000), nz) * e ** 2
        place(out, t, flap * rng.uniform(.8, 1.1)); t += 1 / rate * rng.uniform(.92, 1.08)
    return norm_to(out * adsr(n, .05, .3), -19)


def swish(dur=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; nz = rng.standard_normal(n)
    sweep = filt(B.sos_bp(400, 1600), nz) * (1 - tt / dur) + filt(B.sos_bp(1500, 5500), nz) * (tt / dur)
    x = (sweep + 1.4 * filt(B.sos_lp(160), nz)) * np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.5
    return norm_to(x, -16)


def ice(dur):
    """Ice cubes clinking in a glass + soda fizz."""
    n = int(dur * SR); out = np.zeros(n); t = .05
    while t < dur - .3:
        m = int(.35 * SR); tt = np.arange(m) / SR
        tone = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / d) for f, a, d in
                   [(rng.uniform(2100, 2600), 1, .11), (rng.uniform(3300, 3900), .7, .07), (rng.uniform(4800, 5600), .5, .05), (rng.uniform(1150, 1300), .4, .2)])
        click = filt(B.sos_hp(3000), rng.standard_normal(m)) * np.exp(-tt / .004) * .6
        place(out, t, (tone + click) * rng.uniform(.4, 1.0)); t += rng.uniform(.08, .32)
    fizz = np.zeros(n); idx = rng.choice(n, int(dur * 260), replace=False)
    fizz[idx] = rng.uniform(.1, 1, len(idx)); fizz = filt(B.sos_bp(5000, 12000), fizz) * 2 + filt(B.sos_bp(6000, 11000), rng.standard_normal(n)) * .03
    return norm_to((out + fizz) * adsr(n, .02, .4), -19)


# ---------------------------------------------------------------- music (no thermal)
NOTE = {"C": [60, 64, 67], "Am": [57, 60, 64], "F": [53, 57, 60], "G": [55, 59, 62]}
def hz(m): return 440 * 2 ** ((m - 69) / 12)

def musicbox(midi, dur, gain=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR; f = hz(midi)
    return gain * (np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt) + .12 * np.sin(2 * np.pi * 4.2 * f * tt)) * np.exp(-tt / .45)

def jingle(dur):
    out = np.zeros(int(dur * SR) + SR)
    for i, m in enumerate([72, 76, 79, 84, 79, 84, 88]):
        place(out, i * .18, musicbox(m, 1.5, .5))
    return out[: int(dur * SR)] * adsr(int(dur * SR), .01, 1.2)

def bgm(dur):
    """Soft idol-pop backing (pad, bass, music-box arpeggio, light kick/clap), 100 BPM, bars from 110.0 s."""
    n = int(dur * SR); L_ = np.zeros(n); R_ = np.zeros(n); beat = FM.BAR / 4
    start = 110.0 - 108.8   # bgm cue starts at 108.8 s → two-beat pickup
    for b, ch in enumerate(FM.CHORDS):
        t0 = start + b * FM.BAR
        if t0 > dur: break
        m = int(FM.BAR * SR); tt = np.arange(m) / SR
        pad = sum(signal.sawtooth(2 * np.pi * hz(x) * tt * (1 + d)) for x in NOTE[ch] for d in (-.003, .003))
        pad = filt(B.sos_lp(1400), pad) * adsr(m, .2, .4) * .05
        place(L_, t0, pad); place(R_, t0, pad)
        bass = np.sin(2 * np.pi * hz(NOTE[ch][0] - 12) * tt) * np.exp(-((tt % (beat * 2)) / .5)) * .22
        place(L_, t0, bass); place(R_, t0, bass)
        arp = NOTE[ch] + [NOTE[ch][0] + 12]
        for k in range(8):
            mb = musicbox(arp[k % 4] + 12, .9, .16)
            place(L_ if k % 2 else R_, t0 + k * beat / 2, mb); place(R_ if k % 2 else L_, t0 + k * beat / 2, mb * .5)
        for k in range(4):
            kk = int(.25 * SR); kt = np.arange(kk) / SR
            if k % 2 == 0:
                kick = np.sin(2 * np.pi * (55 + 90 * np.exp(-kt / .03)) * kt) * np.exp(-kt / .12) * .5
                place(L_, t0 + k * beat, kick); place(R_, t0 + k * beat, kick)
            else:
                clap = filt(B.sos_bp(900, 5000), rng.standard_normal(kk)) * np.exp(-kt / .05) * .2
                place(L_, t0 + k * beat, clap); place(R_, t0 + k * beat, clap * .9)
    pickup = [(0, 67), (beat, 72)]
    for t0, m in pickup: place(L_, t0, musicbox(m, .8, .25)); place(R_, t0, musicbox(m, .8, .25))
    env = adsr(n, .3, 2.0)
    return np.stack([L_ * env, R_ * env], 1)


# ---------------------------------------------------------------- build
def main():
    os.makedirs(B.CACHE, exist_ok=True); os.makedirs(STEMS, exist_ok=True); os.makedirs(MEDIA, exist_ok=True)
    backend = "eleven"   # 2026-11-08 (user): Ayane = ElevenLabs ayane r1_a (Demo 1's tts()), song = ElevenLabs Music; before: VOICEVOX
    B.BACKEND = backend
    SONGMIX, VOCAL = np.zeros(N), np.zeros(N)     # whole song (heard, moves with Ayane) · isolated vocal (heat only)
    H = {k: np.zeros(N) for k in ("voice", "breath")}
    C = {k: np.zeros(N) for k in ("fan", "ice", "breath", "magic")}
    foley, music = np.zeros(N), np.zeros((N, 2))
    timing = []
    for i, c in enumerate(FM.CUES):
        k = c["kind"]
        if k in ("say", "whisper"):
            x = B.tts(c["tts"], "A", whisper=(k == "whisper"), expr=c["expr"])
            if k == "whisper":
                x = norm_to(x if backend == "eleven" else x + .3 * B.whisperize(x) if backend == "voicevox" else B.whisperize(x), -24)
                place(H["breath"], c["t"] - .5, B.inhale() * .8)
            else:
                x = norm_to(x, -19)
            place(H["voice"], c["t"], x); dur = len(x) / SR
        elif k == "sing":
            p0, p1 = FM.SONG_PHRASES[c["phrase"]]; dur = p1 - p0
            if c["phrase"] == 0:
                t0 = c["t"] - p0; song, voc = load_song(FM.SONG_FILE), load_song(FM.SONG_VOCAL)
                g = db(-19) / np.sqrt(np.mean(voc[voc ** 2 > 1e-5] ** 2))        # sung lines as loud as her speech
                place(SONGMIX, t0, song * g * 1.25); place(VOCAL, t0, voc * g)
        elif k == "warm":
            x = B.breath("warm", c["dur"], c["gain"]); place(H["breath"], c["t"], x); dur = c["dur"]
        elif k == "fan":
            x = fan(c["dur"]) * c["gain"]
            if c.get("fade"): x *= np.linspace(1, .15, len(x))
            place(C["fan"], c["t"], x); dur = c["dur"]
        elif k == "swish":
            x = swish(c["dur"]) * c["gain"]; place(C["fan"], c["t"], x); dur = c["dur"]
        elif k == "ice":
            x = ice(c["dur"]) * c["gain"]; place(C["ice"], c["t"], x); dur = c["dur"]
        elif k == "coolbreath":
            x = B.breath("cold", c["dur"], c["gain"]); place(C["breath"], c["t"], x); dur = c["dur"]
        elif k == "magic":
            x = B.magic("ice", c["dur"], c["gain"]); place(C["magic"], c["t"], x); dur = c["dur"]
        elif k == "steps":
            foley += B.footsteps(c["t"], c["t"] + c["dur"], .2) * 1.4; dur = c["dur"]
        elif k == "jingle":
            x = jingle(c["dur"]); i0 = int(c["t"] * SR); music[i0: i0 + len(x)] += np.stack([x, x * .9], 1)[: N - i0]; dur = c["dur"]
        elif k == "bgm":
            dur = c["dur"]   # the ElevenLabs song carries its own accompaniment (was: synthesized bgm())
        timing.append(dict(i=i, t=c["t"], kind=k, dur=round(dur, 3)))
    seq = sorted([x for x in timing if x["kind"] in ("say", "whisper", "sing")], key=lambda x: x["t"])
    for a, b in zip(seq, seq[1:]):
        if a["t"] + a["dur"] > b["t"] - .05: print(f"  ! line at {a['t']}s ({a['dur']:.2f}s) runs into {b['t']}s")
    json.dump(timing, open(os.path.join(OUT, "voice_timing.json"), "w"), indent=1)
    json.dump(dict(backend=backend, credits=["ElevenLabs"] if backend == "eleven" else [f"VOICEVOX:{FM.VOICE['speaker']}"] if backend == "voicevox" else ["macOS Kyoko (draft)"]),
              open(os.path.join(MEDIA, "voice.json"), "w"), ensure_ascii=False)
    print("voice backend:", backend)

    heat = H["voice"] + H["breath"] + VOCAL; cool = sum(C.values())   # thermal: speech, breaths and the sung vocal (not the band)
    for name, x in [*(("heat_" + k, v) for k, v in H.items()), *(("cool_" + k, v) for k, v in C.items()),
                    ("heat_dry", heat), ("cool_dry", cool), ("foley", foley)]:
        B.write_wav(os.path.join(STEMS, name + ".wav"), x)
    print("rendering binaural…", flush=True)
    hb = B.render(H["voice"] + H["breath"] + SONGMIX, who="A"); cb = B.render(cool, who="C"); fb = B.render(foley, who="A")
    mb = B.render(music[:, 0], az=-32, d=3.0) + B.render(music[:, 1], az=32, d=3.0)
    t = np.arange(N) / SR
    amb = np.stack([filt(B.sos_lp(380), rng.standard_normal(N)) for _ in range(2)], 1)
    amb = amb / np.sqrt(np.mean(amb ** 2)) * db(-46) * (np.clip(t / 2, 0, 1) * np.clip((FM.DURATION - t) / 3, 0, 1))[:, None]
    for name, x in [("heat_binaural", hb), ("cool_binaural", cb), ("foley_binaural", fb), ("music_binaural", mb), ("ambience", amb)]:
        B.write_wav(os.path.join(STEMS, name + ".wav"), x)
    mix = hb + cb * .9 + fb + mb * .55 + amb
    mix = mix / np.max(np.abs(mix)) * db(-1)
    pre = os.path.join(OUT, "mix_premaster.wav"); B.write_wav(pre, mix)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", pre, "-af",
                    "acompressor=threshold=-30dB:ratio=3:attack=5:release=150:makeup=6,alimiter=limit=0.84:attack=3:release=60:level=disabled,loudnorm=I=-18:TP=-1.5:LRA=8",
                    "-ar", str(SR), "-c:a", "pcm_s24le", os.path.join(OUT, "mix_48k.wav")], check=True)
    os.remove(pre)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(OUT, "mix_48k.wav"), "-c:a", "aac", "-b:a", "192k",
                    os.path.join(MEDIA, "mix.m4a")], check=True)
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", os.path.join(OUT, "mix_48k.wav"), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    print("mix loudness:", " ".join(l.strip() for l in r[r.rfind("Summary:"):].splitlines() if l.strip().startswith(("I:", "Peak:"))))


if __name__ == "__main__":
    main()
